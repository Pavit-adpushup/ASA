const cron = require("node-cron");
const { rssFeedNlpAnalysis } = require("./Nlp_Analysis");

cron.schedule("*/30 * * * *", function () {
  console.log("Starting the scrapper");
  rssFeedNlpAnalysis();
});
