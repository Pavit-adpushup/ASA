const cron = require("node-cron");
const { rssFeedNlpAnalysis } = require("./Nlp_Analysis");
const { scrapperConfig } = require("./config");

cron.schedule(scrapperConfig.cronStr, function () {
  console.log("Starting the scrapper");
  rssFeedNlpAnalysis();
});
