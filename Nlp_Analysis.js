const args = require("minimist")(process.argv.slice(2));
const { requestPool } = require("./lib/pool.js");
const fs = require("fs");
const md5 = require("md5");
const sql = require("mssql");

// Imports the Google Cloud client library
const language = require("@google-cloud/language");
// Instantiates a client
const client = new language.LanguageServiceClient();

const skippedUrls = [];
const urlNlpAnalysis = {};
const { siteConfig, sqlDbConfig } = require("./config");

const {
  getUrlsFromSource,
  getDataFromRssFeed,
  preBatchForRequestPool,
  getPageDataWithAxios,
  saveSiteData,
  exportToJsonFile,
  filterNewUrls,
  getSegmentMappings,
} = require("./utils");

const scrapeUrlsInBatches = async (urls) => {
  console.log("scraping urls in batches");
  try {
    const batchedUrls = preBatchForRequestPool(urls, 100);
    for (let i = 0; i < batchedUrls.length; i++) {
      console.log(`${i + 1} Batch processing....`);
      const batch = batchedUrls[i];
      await requestPool({
        queue: batch,
        batchSize: 20,
        delay: 4000,
        fn: (url) => EntityAnalysis(url),
      });
    }
  } catch (err) {
    console.log("Err while batching: ", err);
  }
};

const fetchParaDataFromHTML = (html) => {
  const $ = cheerio.load(html);
  let textContent = "";
  const contentSelector1 = ".content_text";
  const contentSelector2 = "#allplist";
  // const contentSelector = "#ins_storybody";
  const paragraphs = $(
    `${contentSelector1} p, ${contentSelector2} p, .brant_content, h1`
  );
  paragraphs.each((_, el) => {
    let text = $(el).text().trim();
    const ignoreElement = $(el).hasClass("downloadtxt");
    // const ignoreElement = $(el).hasClass("highlghts_Wdgt");
    if (text.length !== 0 && !ignoreElement) textContent += `${text} `;
  });
  const regExp = new RegExp("\\\n", "g");
  return textContent.replace(regExp, "");
};

const checkForSavedUrlData = (url, siteConfig) => {
  const md5Url = md5(url);
  const msg = "Saved data found !!!!";
  console.log("Checking for saved data");
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

const filterEntities = (entitiesArr) => {
  return entitiesArr.filter((item) => {
    if (item.salience > 0) {
      return true;
    }
    return false;
  });
};

const classifyText = async (document) => {
  try {
    const [classification] = await client.classifyText({ document });
    return classification;
  } catch (err) {
    return { categories: [{ name: "No classification", confidence: 0 }] };
  }
};

async function EntityAnalysis(url) {
  try {
    console.log("the urls is", url);
    const { result, savedData } = checkForSavedUrlData(url, siteConfig);
    if (result) {
      urlNlpAnalysis[url] = {
        urlCategories: savedData.urlCategories,
        NlpEntityAnalysis: filterEntities(savedData.NlpEntityAnalysis),
      };
    } else {
      const html = await getPageDataWithAxios(url);
      const text = fetchParaDataFromHTML(html);
      if (text === "" || text === undefined) {
        skippedUrls.push(url);
        console.log("the text is empty for url:", url);
        return;
      }
      const document = {
        content: `${text}`,
        type: "PLAIN_TEXT",
      };
      const [result] = await client.analyzeEntities({ document });
      const classification = await classifyText(document);
      const entities = filterEntities(result.entities);
      const NlpEntityAnalysis = [];

      console.log("Analyzing Entities:");
      entities.forEach((entity) => {
        const data = {};
        data.name = entity.name;
        data.type = entity.type;
        data.salience = entity.salience;
        if (entity.metadata && entity.metadata.wikipedia_url) {
          data.metadata = entity.metadata.wikipedia_url;
        }
        NlpEntityAnalysis.push(data);
      });
      urlNlpAnalysis[url] = {
        urlCategories: classification.categories,
        NlpEntityAnalysis,
      };
      const dataToSave = {
        url,
        urlCategories: classification.categories,
        extractedText: text,
        html,
        NlpEntityAnalysis,
      };
      saveSiteData(url, siteConfig.siteName, dataToSave);
    }
  } catch (err) {
    console.log(`${err.name}: ${err.message} on ${url}`);
    console.log(err);
  }
}

const generateCsvFromNlpData = (data) => {
  const csvStream = csv.format({
    headers: ["URL", "Categories", "Entites"],
  });
  const writeStream = fs.createWriteStream(
    `./GeneratedData/ndtvNLpAnalysis.csv`
  );
  csvStream.pipe(writeStream).on("end", () => process.exit());
  for (let url in data) {
    const nlpData = data[url];
    let categoryStr = "No classification";
    nlpData.urlCategories.forEach((item, index) => {
      if (index === 0) categoryStr = `${item.name} `;
    });
    let entityStr = "";
    nlpData.NlpEntityAnalysis.forEach((item) => {
      entityStr += `${item.name} |`;
    });
    csvStream.write([url, categoryStr, entityStr]);
  }
};

const urlToEntitiesMapping = (data) => {
  const urlToEntitesObj = {};
  for (let url in data) {
    const nlpData = data[url];
    const entityArr = nlpData.NlpEntityAnalysis;
    urlToEntitesObj[url] = [];
    entityArr.forEach((entityObj) => {
      if (!urlToEntitesObj[url].includes(entityObj.name))
        urlToEntitesObj[url].push(entityObj.name);
    });
  }
  exportToJsonFile(
    urlToEntitesObj,
    "./GeneratedData/urlToEntitiesMapping.json"
  );
};

const generateCsvFromNlpMetrics = (data) => {
  const csvStream = csv.format({
    headers: [
      "Entity",
      "Entity_count",
      "Type:count",
      "Total_types_for_entitys",
    ],
  });
  const writeStream = fs.createWriteStream(
    `./GeneratedData/ndtvNLpAnalysisMetrics.csv`
  );
  csvStream.pipe(writeStream).on("end", () => process.exit());

  for (let entity in data) {
    const entityObj = data[entity];
    const totalTypes = Object.keys(entityObj.types).length;
    let typesAndCounts = "";
    for (let type in entityObj.types) {
      typesAndCounts += `${type}:${entityObj.types[type]}; `;
    }
    csvStream.write([entity, entityObj.count, typesAndCounts, totalTypes]);
  }
};

const createMetricsFromData = (data) => {
  const metrics = {};
  for (let url in data) {
    const urlObj = data[url];
    const entityArr = urlObj.NlpEntityAnalysis;
    entityArr.forEach((item) => {
      const name = item.name;
      const regex = new RegExp("^[A-Z]|^[i][A-Z]");
      if (name.match(regex) === null) return;
      const type = item.type;
      if (metrics.hasOwnProperty(name)) {
        metrics[name].count++;
        if (metrics[name].types.hasOwnProperty(type))
          metrics[name].types[type]++;
        else {
          metrics[name].types[type] = 1;
        }
      } else {
        metrics[name] = {
          count: 1,
          types: {},
        };
        metrics[name].types[type] = 1;
      }
    });
  }
  generateCsvFromNlpMetrics(metrics);
  exportToJsonFile(metrics, "./GeneratedData/ndtvNlpAnalysisMetrics.json");
};

const logSkippedUrls = () => {
  const skippedUrlsStr = JSON.stringify(skippedUrls, null, 1);
  fs.writeFile(
    "./GeneratedData/NDTVskippedURLS.json",
    skippedUrlsStr,
    (err) => {
      console.log("The error is", err);
    }
  );
};

const start = async () => {
  const urlsFile = args.urlsFile;
  if (urlsFile !== "") throw new Error("No urls file provided !!!");
  const { urls } = await getUrlsFromSource(urlsFile, false, siteConfig);

  console.time("The scrapper time");
  await scrapeUrlsInBatches(urls);
  urlToEntitiesMapping(urlNlpAnalysis);
  generateCsvFromNlpData(urlNlpAnalysis);
  createMetricsFromData(urlNlpAnalysis);
  logSkippedUrls();
  console.log("the scrapping is complete !!!!");
  console.timeEnd("The scrapper time");
};

const filterNlpData = (data) => {
  const filteredNlpData = [];
  for (let url in data) {
    const nlpData = data[url];
    //extracting category from url
    const regex = new RegExp(".com//?(\\w+)");
    const compareRegex = new RegExp(".com//?(\\w+(-\\w+)?)");
    const categoryRegex = url.includes(".com/compare") ? compareRegex : regex;
    const categoryFromUrl = url.match(categoryRegex)[1];

    //filter out entities
    const entitiesStr = nlpData.NlpEntityAnalysis.map((obj) => obj.name).join(
      " | "
    );
    const filteredEntities = [];
    siteConfig.entitiesToKeep.forEach((entity) => {
      const wordBoundaryRegex = new RegExp(`\\b${entity}\\b`, "i");
      const includeRegex = new RegExp(`${entity}`, "i");
      const entityRegex = entity.length <= 3 ? wordBoundaryRegex : includeRegex;
      entitiesStr.match(entityRegex) && filteredEntities.push(entity);
    });

    filteredNlpData.push({
      url,
      category: categoryFromUrl,
      filteredEntities,
    });
  }
  return filteredNlpData;
};

const rssFeedNlpAnalysis = async (url) => {
  // const urls = await getDataFromRssFeed(url);
  // const newUrls = await filterNewUrls(urls);
  const newUrls = [
    "https://gadgets360.com/wearables/news/xiaomi-mi-band-4-price-cny-169-launch-specifications-features-2051393",
    "https://gadgets360.com/wearables/news/watchos-8-4-1-release-update-download-apple-watch-series-4-5-6-se-7-bug-fix-2744607",
    "https://gadgets360.com/wearables/news/samsung-galaxy-watch-4-classic-price-usd-249-99-299-99-launch-sale-date-august-27-specifications-2508256",
  ];
  const { segmentEntityMap, segmentCategoryMap } = await getSegmentMappings();
  await scrapeUrlsInBatches(newUrls);
  const nlpData = filterNlpData(urlNlpAnalysis);
  createSegmentDataAndUpload(nlpData, segmentEntityMap, segmentCategoryMap);
  console.log(nlpData);
};

const createSegmentDataAndUpload = (data, entityMap, categorymap) => {
  data.forEach((obj) => {
    const uploadJson = {
      dateCreated: +new Date(),
    };
    uploadJson.segmentMap = obj.filteredEntities.map((name) => entityMap[name]);
    uploadJson.segmentMap.push(categorymap[obj.category]);
    console.log(uploadJson);
  });
};

(async () => {
  try {
    await rssFeedNlpAnalysis(siteConfig.rssFeedUrl);
  } catch (err) {
    console.log("Error is: ", err);
  }
})();

module.exports = {
  start,
  rssFeedNlpAnalysis,
};
