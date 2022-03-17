const args = require("minimist")(process.argv.slice(2));
const { requestPool } = require("./lib/pool.js");
const cheerio = require("cheerio");
const language = require("@google-cloud/language");
const client = new language.LanguageServiceClient();

const skippedUrls = [];
// why this is global
const urlNlpAnalysis = {};
const { siteConfig, scrapperConfig } = require("./config");

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
  checkForSavedUrlData,
  getSegmentMappings,
  createSegmentDataAndUpload,
} = require("./utils");

const scrapeUrlsInBatches = async (urls) => {
  console.log("scraping urls in batches");
  try {
    const rpConfig = scrapperConfig.requestPool;
    const batchedUrls = preBatchForRequestPool(urls, rpConfig.preBatchSize);
    for (let i = 0; i < batchedUrls.length; i++) {
      console.log(`${i + 1} Batch processing....`);
      const batch = batchedUrls[i];
      await requestPool({
        queue: batch,
        batchSize: rpConfig.requestPoolBatchSize,
        delay: rpConfig.requestPoolDelay,
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
  const paragraphs = $(
    `${contentSelector1} p, ${contentSelector2} p, .brant_content, h1`
  );
  paragraphs.each((_, el) => {
    let text = $(el).text().trim();
    const ignoreElement = $(el).hasClass("downloadtxt");
    if (text.length !== 0 && !ignoreElement) textContent += `${text} `;
  });

  // short cut - return textContent.replace(/\n/g, "");
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
    // getSavedUrlData
    const savedData = checkForSavedUrlData(url, siteConfig);
    if (savedData) {
      urlNlpAnalysis[url] = {
        urlCategories: savedData.urlCategories,
        NlpEntityAnalysis: filterEntities(savedData.NlpEntityAnalysis),
      };
    } else {
      const html = await getPageDataWithAxios(url);
      const text = fetchParaDataFromHTML(html);
      // if (!text) is enough
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
      // this can be handled in pool clalback
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
    // filtered URLs - new URLs that are not processed yet
    let urls = await getDataFromRssFeed(siteConfig.siteName, url);
    // if no new URL found return
    if (!urls || !urls.length) {
      console.log("Feed not updated!!");
      return;
    }

    // 
    const result = await getSegmentMappings();
    if (!result) return;
    const entityMap = result.segmentEntityMapping;
    const categoryMap = result.segmentCategoryMapping;
    await scrapeUrlsInBatches(urls);
    const nlpData = filterNlpData(urlNlpAnalysis, siteConfig.entitiesToKeep);
    createSegmentDataAndUpload(nlpData, entityMap, categoryMap);
  } catch (err) {
    console.log("Error: ", err);
  }
};

(() => {
  rssFeedNlpAnalysis(siteConfig.rssFeedUrl);
})();
module.exports = {
  rssFeedNlpAnalysis,
};
