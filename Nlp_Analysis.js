const args = require("minimist")(process.argv.slice(2));
const { requestPool } = require("./lib/pool.js");
const fs = require("fs");
const md5 = require("md5");

// Imports the Google Cloud client library
const language = require("@google-cloud/language");
// Instantiates a client
const client = new language.LanguageServiceClient();

const skippedUrls = [];
const urlNlpAnalysis = {};
const { siteConfig } = require("./config");

const {
  generateCsvFromNlpData,
  urlToEntitiesMapping,
  createMetricsFromData,
  logSkippedUrls,
  filterNlpData,
} = require("./helpers/dataGeneration");

const {
  getUrlsFromSource,
  getDataFromRssFeed,
  preBatchForRequestPool,
  getPageDataWithAxios,
  saveSiteData,
  filterNewUrls,
  checkForSavedUrlData,
  getSegmentMappings,
  createSegmentDataAndUpload,
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

const filterEntities = (entitiesArr) =>
  entitiesArr.filter((item) => item.salience > 0);

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

const start = async () => {
  const urlsFile = args.urlsFile;
  if (urlsFile !== "") throw new Error("No urls file provided !!!");
  const { urls } = await getUrlsFromSource(urlsFile, false, siteConfig);

  console.time("The scrapper time");
  await scrapeUrlsInBatches(urls);
  urlToEntitiesMapping(urlNlpAnalysis);
  generateCsvFromNlpData(urlNlpAnalysis);
  createMetricsFromData(urlNlpAnalysis);
  logSkippedUrls(skippedUrls);
  console.log("the scrapping is complete !!!!");
  console.timeEnd("The scrapper time");
};

const rssFeedNlpAnalysis = async (url) => {
  try {
    // const urls = await getDataFromRssFeed(url);
    // const newUrls = await filterNewUrls(urls);
    const newUrls = [
      "https://gadgets360.com/wearables/news/huawei-watch-gt-2e-price-eur-199-launch-features-specifications-battery-life-2201455",
      "https://gadgets360.com/wearables/news/htc-vive-pro-2-focus-3-price-usd-799-1300-launch-specifications-features-5k-resolution-120hz-refresh-rate-2440028",
      "https://gadgets360.com/wearables/news/garmin-venu-2-plus-smartwatch-price-in-india-rs-46990-launch-specifications-features-sale-2716953",
      "https://gadgets360.com/wearables/news/fitbit-year-in-review-feature-highlights-step-counting-sleep-tracking-total-active-zone-minutes-google-2740378",
      "https://gadgets360.com/wearables/news/fitbit-versa-2-google-assistant-support-work-in-progress-report-2245368",
    ];
    const {
      segmentEntityMapping: entityMap,
      segmentCatergoryMapping: categoryMap,
    } = await getSegmentMappings();
    await scrapeUrlsInBatches(newUrls);
    const nlpData = filterNlpData(urlNlpAnalysis, siteConfig.entitiesToKeep);
    createSegmentDataAndUpload(nlpData, entityMap, categoryMap);
  } catch (err) {
    console.log("Error: ", err);
  }
};

(async () => {
  rssFeedNlpAnalysis(siteConfig.rssFeedUrl);
})();

module.exports = {
  start,
  rssFeedNlpAnalysis,
};
