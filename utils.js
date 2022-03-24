const md5 = require("md5");
const fs = require("fs");
const fsPromises = require("fs").promises;
const axios = require("axios");
const moment = require("moment");
const { XMLParser } = require("fast-xml-parser");
const Parser = require("rss-parser");
const parser = new Parser();
const sql = require("mssql");
const crypto = require("crypto");
const { siteConfig, sqlDbConfig, scrapperConfig } = require("./config");
const couchbase = require("./helpers/couchbase");
let { lastUpdated } = require("./SavedData/savedRssData.json");

const getUrlsFromSource = async (
  urlsFile,
  isSiteMapCrawlingActive,
  siteConfig
) => {
  let urls = null;
  let urlDataSource = "";
  if (urlsFile && urlsFile.length !== 0) {
    console.log(`______ Reading urls from file: ${urlsFile}________`);
    urlDataSource = `urls taken from file ${urlsFile}`;
    urls = await fsPromises
      .readFile(`./SavedData/SelectedUrlsForSites/${urlsFile}`, "utf-8")
      .then((data) =>
        data
          .split(",")
          .filter((str) => str.length !== 0)
          .map((url) => url.trim())
      );
  } else if (isSiteMapCrawlingActive) {
    urlDataSource = siteConfig.siteMapPathArr;
    console.log(` Crawling SiteMap for ${siteConfig.siteName}....... \n`);
    const { uniqueUrls, duplicatesFound } = await crawlSiteMapXmlv2(
      siteConfig.siteDomain,
      siteConfig.siteMapPathArr
    );
    urls = uniqueUrls;
    console.log("______ SiteMap Crawling Complete ______\n");
    console.log(`The number of duplcate URL's removed are ${duplicatesFound}`);
  }
  return { urls, urlDataSource };
};

const getSavedUrlData = (url, siteConfig) => {
  console.log("Checking for saved data");
  let savedData = null;
  const md5Url = md5(url);
  const md5filePath = `${scrapperConfig.savedDataPath}/${siteConfig.siteName}/${md5Url}.json`;
  if (fs.existsSync(md5filePath)) {
    console.log(`"Saved data found !!!!"`);
    const rawData = fs.readFileSync(md5filePath);
    savedData = JSON.parse(rawData);
  }
  return savedData;
};

const getPageData = async (url, usePuppeteer, index) => {
  const idx = index === "" ? "" : `${++index})`;
  if (usePuppeteer) {
    console.log("using puppeteer");
    const { data } = await getPageDataViaPuppeteer(url);
    console.log(`◎ ${idx} Scrapped url is: ${url}`);
    return data;
  } else {
    const data = await getPageDataWithAxios(url);
    console.log(`◎ ${idx} Scrapped url is: ${url}`);
    return data;
  }
};

const getPageDataWithAxios = async (url) => {
  const html = await axios
    .get(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      },
    })
    .then((res) => {
      if (res.status !== 200) console.log("the status is", res.status);
      return res.data;
    })
    .catch((error) => {
      console.log(`the err while fetching html for ${url} is =>`, error);
    });
  return html;
};

const preBatchForRequestPool = (urls, batchSize) => {
  let batches = [];
  let currentBatch = [];
  let batchesMade = 0;
  urls.forEach((url) => {
    currentBatch.push(url);
    if (currentBatch.length === batchSize) {
      batchesMade++;
      batches.push(currentBatch);
      currentBatch = [];
    }
  });
  if (batchesMade === 0) return [urls];
  if (batchesMade * batchSize < urls.length) {
    const remaingUrlsCount = urls.length - batchesMade * batchSize;
    const remaingUrls = urls.slice(-remaingUrlsCount);
    batches.push(remaingUrls);
  }
  console.log("Total batches created for request pool", batches.length);
  return batches;
};

const getPageDataViaPuppeteer = async (url, waitTimeout = 0) => {
  // const browser = await pupeteer.launch({
  //   acceptInsecureCerts: true,
  //   ignoreHTTPSErrors: true,
  //   args: ["--no-sandbox"],
  // });
  // let page = null;
  // try {
  //   if (!url) {
  //     return {
  //       url: "",
  //       data: "",
  //       redirectUrl: "",
  //     };
  //   }
  //   console.log("Req:", url);
  //   page = await browser.newPage();
  //   await page.setUserAgent(
  //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.54 Safari/537.36"
  //   );
  //   const response = await page.goto(url, {
  //     waitUntil: "domcontentloaded",
  //   });
  //   let statusCode = response.status();
  //   await page.waitForTimeout(waitTimeout);
  //   let pageHTML = await page.content();
  //   console.log({ url, statusCode });
  //   await page.close();
  //   if (statusCode == 200) {
  //     return {
  //       url,
  //       data: pageHTML,
  //       redirectUrl: "",
  //       statusCode,
  //     };
  //   } else {
  //     return {
  //       url,
  //       data: "",
  //       redirectUrl: "",
  //       statusCode,
  //     };
  //   }
  // } catch (error) {
  //   if (page) {
  //     await page.close();
  //   }
  //   if (error.response) {
  //     // Request made and server responded
  //     console.log("Error data", error.response.data);
  //     console.log("Error status", error.response.status);
  //     console.log("Error header", error.response.headers);
  //   } else if (error.request) {
  //     // The request was made but no response was received
  //     console.log("Error req - ", url);
  //   } else {
  //     // Something happened in setting up the request that triggered an Error
  //     console.log("Error:", error.message);
  //   }
  // }
};

const promiseWithCatch = (data) => {
  return new Promise((resolve, reject) => {
    resolve(data);
  }).catch((err) => {
    console.log("the error was caught here!!");
    return ["urls not fetched"];
  });
};

const crawlSiteMapXmlv2 = async (siteDomain, siteMapPaths) => {
  const uniqueUrls = {};
  const urlsWithUndefinedData = [];
  let duplicatesFound = 0;

  const promiseArr = siteMapPaths.map(async (path) => {
    const XMLdata = await axios(`${siteDomain}${path}`, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      },
      method: "GET",
    })
      .then((res) => {
        if (res.status !== 200) console.log(res.status);
        const data = res.data.replace("<![CDATA[", "").replace("]]>", "");
        return data;
      })
      .catch((err) => {
        console.log(err.name + err.message);
        return null;
      });
    //check one: if xmldata is returned as null then handle the error
    if (XMLdata === null) {
      console.log("urls could not be fetched !!");
      urlsWithUndefinedData.push(`${siteDomain + path}`);
      return promiseWithCatch([
        `couldn't fetch urls from: ${siteDomain + path}`,
      ]);
    }
    const parser = new XMLParser({
      cdataPropName: "__cdata",
    });
    // const parser = new XMLParser();
    let {
      urlset: { url: urlsObjArr = [] },
    } = parser.parse(XMLdata);

    //check two: if urlsObjArr is a single object and not an array or it is undefined
    if (!urlsObjArr.length) {
      // console.log('problem with urls obj arr is', XMLdata, siteDomain+path);
      urlsWithUndefinedData.push(`${siteDomain + path}`);
      let obj = parser.parse(XMLdata);
      console.log(obj);
      return promiseWithCatch(null);
    }
    const urlsList = urlsObjArr.map((urlObj) => {
      if (!urlObj.loc["__cdata"]) return urlObj.loc;
      return urlObj.loc["__cdata"];
    });
    return promiseWithCatch(urlsList);
  });

  const resultArray = await Promise.all(promiseArr).catch((err) =>
    console.log("the err is", err)
  );
  let undefinedUrlsets = 0;
  resultArray.forEach((urlList) => {
    if (!urlList) {
      console.log("the urllist is", urlList);
      undefinedUrlsets++;
      return;
    }
    urlList.forEach((url) => {
      if (uniqueUrls.hasOwnProperty(url)) duplicatesFound++;
      else uniqueUrls[url] = "";
    });
  });
  console.log("The number of undefined sets are", undefinedUrlsets);
  console.log("The url with undefined responses are", urlsWithUndefinedData);
  const uniqueUrlArr = Object.keys(uniqueUrls);
  exportToJsonFile(
    { uniqueUrls: uniqueUrlArr },
    "./LocalTesting/SelectedUrlsForSites/AllCollegeDuniaUrls.json"
  );
  return { uniqueUrls: uniqueUrlArr, duplicatesFound };
};

const saveSiteData = (url, siteName, dataToSave) => {
  const md5FileNameHash = md5(url);
  const dirNameToSaveData = `${scrapperConfig.savedDataPath}/${siteName}/`;
  const filePath = `${dirNameToSaveData}${md5FileNameHash}.json`;
  exportToJsonFile(dataToSave, filePath);
};

const exportToJsonFile = (jsonObj, filePath) => {
  const jsonString = JSON.stringify(jsonObj, null, 3);
  fs.writeFile(`${filePath}`, jsonString, (err) => {
    if (err) console.log(`the err in export function is ${err}`);
  });
};

const isObjectEmpty = (object) =>
  Object.entries(object).length === 0 && object.constructor === Object;

async function exists(path) {
  try {
    await fsPromises.access(path);
    return true;
  } catch {
    return false;
  }
}

const getDataFromRssFeed = async (siteName, url) => {
  try {
    let feed = await parser.parseURL(url);
    console.log("Fetched data from rss feed!!");
    let pubDate = moment(feed.items[0].isoDate);
    if (lastUpdated !== "") {
      lastUpdated = moment(lastUpdated);
      if (pubDate.isSameOrBefore(lastUpdated)) return null;
    }

    const urls = feed.items.map((item) => item.link.replace('#rss-gadgets-all', ''));
    const data = { lastUpdated: pubDate.format() };
    fs.writeFile(
      "./SavedData/savedRssData.json",
      JSON.stringify(data, null, 1),
      (err) => {
        if (err) console.log(err);
      }
    );
    return await filterNewUrls(siteName, urls);
  } catch (err) {
    throw new Error(err);
  }
};

const filterNewUrls = async (siteName, urls) => {
  const newUrls = [];
  const savedDataPath = `${scrapperConfig.savedDataPath}/${siteName}/`;
  for (let i = 0; i < urls.length; i++) {
    let url = urls[i];
    const filePath = `${savedDataPath}${md5(url)}.json`;
    const result = await exists(filePath);
    if (!result) newUrls.push(url);
  }
  return newUrls;
};

const getAudienceSegmentData = async () => {
  try {
    let pool = await sql.connect(sqlDbConfig);
    let result1 = await pool
      .request()
      .query("select id, name from SiteAudienceSegmentData");
    pool.close();
    console.log("Fetched segment data!!");
    return result1.recordset;
  } catch (err) {
    console.log("error in sql service: ", err);
    return null;
  }
};

const getSegmentMappings = async () => {
  try {
    let data = await getAudienceSegmentData();
    if (!data) throw new Error("unable to fetch Audience segmentation data!!");
    const segmentEntityMapping = {};
    const segmentCategoryMapping = {};
    data.forEach((obj) => {
      if (obj.name.includes("FPA_Gadgets_Entity_")) {
        const entityName = obj.name.replace("FPA_Gadgets_Entity_", "");
        segmentEntityMapping[entityName] = obj.id;
      } else {
        const categoryName = obj.name.replace("FPA_Gadgets_Category_", "");
        segmentCategoryMapping[categoryName] = obj.id;
      }
    });
    return { segmentEntityMapping, segmentCategoryMapping };
  } catch (err) {
    console.log(err);
    return null;
  }
};

const generateSHA256Hash = (str) =>
  crypto.createHash("sha256").update(str, "utf-8").digest("hex").toUpperCase();

const createSegmentDataAndUpload = async (data, entityMap, categorymap) => {
  try {
    const bucketConn = couchbase.getConnection();
    data.forEach((obj) => {
      const urlPath = obj.url.replace(siteConfig.siteDomain, "");
      const SHA1UrlPath = generateSHA256Hash(urlPath);
      const docId = `urlmap::${SHA1UrlPath}`;
      const uploadJson = {
        dateCreated: +new Date(),
      };
      uploadJson.segmentMap = obj.filteredEntities.map(
        (name) => entityMap[name]
      );
      uploadJson.segmentMap.push(categorymap[obj.category]);
      console.log(`Uploading segments for ${obj.url} to couchbase`);
      bucketConn.createDoc(docId, uploadJson, {});
    });
  } catch (err) {
    console.log(`Couchbase Error: ${err}`);
  }
};

module.exports = {
  saveSiteData,
  crawlSiteMapXmlv2,
  isObjectEmpty,
  exportToJsonFile,
  getPageDataWithAxios,
  getPageData,
  preBatchForRequestPool,
  getUrlsFromSource,
  getSavedUrlData,
  getDataFromRssFeed,
  getSegmentMappings,
  createSegmentDataAndUpload,
};
