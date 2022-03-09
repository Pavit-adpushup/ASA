const SitemapXMLParser = require("sitemap-xml-parser");
// const pupeteer = require("puppeteer");
const md5 = require("md5");
const fs = require("fs");
const fsPromises = require("fs").promises;
const axios = require("axios");
const moment = require("moment");
const { requestPool } = require("./lib/pool.js");
const { XMLParser } = require("fast-xml-parser");
const Parser = require("rss-parser");
const parser = new Parser();
const sql = require('mssql');

const { sqlDbConfig } = require("./config");
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
      .readFile(`./LocalTesting/SelectedUrlsForSites/${urlsFile}`, "utf-8")
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

const checkForSavedUrlData = (url, siteConfig, forceFetch) => {
  const md5Url = md5(url);
  const msg = forceFetch
    ? " ◎ Only using saved HTML data"
    : ` ◎ Using saved HTML and Keywords data for: ${url}`;
  const md5fileName = `./LocalTesting/SavedScrapperData/${siteConfig.siteName}/${md5Url}.json`;
  let result = false;
  let savedData = null;
  if (fs.existsSync(md5fileName)) {
    console.log(`${msg}`);
    savedData = require(md5fileName);
    result = true;
  }
  return {
    result,
    savedData,
  };
};

const getPageData = async (url, usePuppeteer, index) => {
  const idx = index === "" ? "" : `${++index})`;
  if (usePuppeteer) {
    console.log("using puppeteer");
    const { data } = await getPageDataViaPuppeteer(url);
    console.log(`◎ ${idx} Scrapped url is: ${url}`);
    return data;
  } else {
    if (Math.floor(Math.random() * 100) < 50) {
      const data = await getPageDataWithAxios(url);
      console.log(`◎ ${idx} Scrapped url is: ${url}`);
      return data;
    } else {
      const data = await getPageDataThroughProxy(url);
      console.log(`◎ ${idx} Scrapped url is: ${url}`);
      return data;
    }
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
      fs.writeFile("./LocalTesting/errorLog.txt", error.message, (err) => {
        if (err) console.log(`the err in writing to the log file is ${err}`);
      });
      console.log(`the err while fetching html for ${url} is =>`, error);
    });
  return html;
};

const getPageDataThroughProxy = async (url) => {
  return await axios
    .post("http://52.179.186.74:3000/proxy", { url })
    .then((res) => res.data);
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

const isUrlInMatchList = (url, matchList) => {
  let matchFound = false;
  let contentSelector = null;
  let regexMatched = null;
  for (const regex in matchList) {
    if (matchFound === true) break;
    const regexp = new RegExp(regex, "g");
    const result = url.match(regexp);
    if (result !== null) {
      matchFound = true;
      regexMatched = regex;
      contentSelector = matchList[regex];
    }
  }
  return {
    isUrlValid: matchFound,
    contentSelector,
    regexMatched,
  };
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

const crawlSiteMapXML = async (siteDomain, siteMapPaths, crawlingOptions) => {
  console.log("crawling siteMap....");
  const allValidUrls = [];

  var siteMapPromiseArr = siteMapPaths.map(async (sitemapPath) => {
    return new Promise(async (resolve) => {
      const sitemapXMLParser = new SitemapXMLParser(
        siteDomain + sitemapPath,
        crawlingOptions
      );
      var results = await sitemapXMLParser.fetch();
      results = results.map((result) => result.loc[0]);
      resolve(results);
    });
  });
  var resultArray = await Promise.all(siteMapPromiseArr).catch((err) =>
    console.log(err)
  );
  resultArray.forEach((item) => {
    allValidUrls.push(...item);
  });
  return allValidUrls;
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

const crawlSiteMapPage = async (
  xmlUrl,
  retryCount = 0,
  siteMapCrawlingBatchSize,
  siteMapCrawlerDelay
) => {
  try {
    let resultData = {};
    const remainingData = [];
    const crawledData = await crawlPage(xmlUrl);
    const { data = "" } = crawledData || {};
    var jsonObject = parser.xml2json(data);
    let { sitemapindex: { sitemap = [] } = {}, urlset: { url = [] } = {} } =
      jsonObject;
    if (sitemap.length === 0) {
      sitemap = url;
    }
    for (let i = 0; i < sitemap.length; i++) {
      const { loc = "", lastmod = "" } = sitemap[i];
      const urlSuffix = loc.slice(loc.length - 4);
      if (!urlSuffix) {
        continue;
      }
      if (urlSuffix === ".xml") {
        remainingData.push(loc);
      } else {
        resultData[loc] = lastmod;
      }
    }

    const { res: remainingXmlData } = await requestPool({
      queue: remainingData,
      batchSize: siteMapCrawlingBatchSize,
      delay: siteMapCrawlerDelay,
      fn: crawlSiteMapPage,
    });
    remainingXmlData.forEach((data) => {
      resultData = { ...resultData, ...data };
    });
    return resultData;
  } catch (error) {
    console.error("Crawl Site Map Error", error);
    if (retryCount <= 5) {
      await crawlSiteMapPage(xmlUrl, retryCount + 1);
      console.log("retrying crawlSiteMapPage");
    } else {
      console.log("error in crawling page", error);
    }
  }
};

const saveSiteData = (url, siteName, dataToSave) => {
  const md5FileNameHash = md5(url);
  const dirNameToSaveData = `./LocalTesting/SavedScrapperData/${siteName}/`;
  const fileName = `${dirNameToSaveData}${md5FileNameHash}.json`;
  const mappingFilePath = `${dirNameToSaveData}/urlToHashedNameMapping.txt`;
  const dataToAppend = `${url} => ${md5FileNameHash}\n`;
  exportToJsonFile(dataToSave, fileName);
};

const exportToJsonFile = (jsonObj, filePath) => {
  const jsonString = JSON.stringify(jsonObj, null, 1);
  fs.writeFile(`${filePath}`, jsonString, (err) => {
    if (err) console.log(`the err in export function is ${err}`);
  });
};

const getInternalLinksFileName = (siteName, alogrithmForKeywordExtraction) => {
  const formatedDate = moment().format().replace(/T/, " ").replace(/\+.+/, "");
  return `${siteName}-${formatedDate}-${alogrithmForKeywordExtraction}`;
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

const getDataFromRssFeed = async (url) => {
  let feed = await parser.parseURL(url);
  const lastBuildDate = feed.lastBuildDate;
  const urls = feed.items.map((item) => item.link);
  fs.writeFile("rssData.json", JSON.stringify(feed, null, 1), (err) => {
    if (err) console.log(err);
  });
  return urls;
};

const filterNewUrls = async (urls) => {
  const newUrls = [];
  const savedDataPath = "./LocalTesting/SavedScrapperData/gadgets360/";
  for(let i=0; i<urls.length; i++) {
    let url = urls[i];
    const filePath = `${savedDataPath}${md5(url)}.json`;
    const result = await exists(filePath);
    if(!result) newUrls.push(url);
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
    return result1.recordset;
  } catch (err) {
    console.log("error in sql service: ", err);
  }
};

const getSegmentMappings = async () => {
  let data = await getAudienceSegmentData();
  const segmentEntityMapping = {};
  const segmentCatergoryMapping = {};
  data.forEach((obj) => {
    if (obj.name.includes("FPA_Gadgets_Entity_")) {
      const entityName = obj.name.replace("FPA_Gadgets_Entity_", "");
      segmentEntityMapping[entityName] = obj.id;
    } else {
      const categoryName = obj.name.replace("FPA_Gadgets_Category_", "");
      segmentCatergoryMapping[categoryName] = obj.id;
    }
  });
  return { segmentEntityMapping, segmentCatergoryMapping };
};

const uploadDataToCouchbase = () => {};

module.exports = {
  saveSiteData,
  crawlSiteMapXmlv2,
  crawlSiteMapXML,
  crawlSiteMapPage,
  isObjectEmpty,
  exportToJsonFile,
  getPageDataWithAxios,
  getInternalLinksFileName,
  getPageData,
  preBatchForRequestPool,
  getUrlsFromSource,
  checkForSavedUrlData,
  isUrlInMatchList,
  getPageDataThroughProxy,
  getDataFromRssFeed,
  filterNewUrls,
  getSegmentMappings
};