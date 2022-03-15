const fs = require("fs");
const { exportToJsonFile } = require("../utils");
const csv = require("fast-csv");

const filterNlpData = (data, entitiesToKeep) => {
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
    entitiesToKeep.forEach((entity) => {
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

const generateCsvFromNlpData = (data) => {
  const csvStream = csv.format({
    headers: ["URL", "Categories", "Entites"],
  });
  const writeStream = fs.createWriteStream(
    `../GeneratedData/ndtvNLpAnalysis.csv`
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
    "../GeneratedData/urlToEntitiesMapping.json"
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
    `../GeneratedData/ndtvNLpAnalysisMetrics.csv`
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
  exportToJsonFile(metrics, "../GeneratedData/ndtvNlpAnalysisMetrics.json");
};

const logSkippedUrls = (urls) => {
  const skippedUrlsStr = JSON.stringify(urls, null, 3);
  fs.writeFile(
    "../GeneratedData/NDTVskippedURLS.json",
    skippedUrlsStr,
    (err) => {
      console.log("The error is", err);
    }
  );
};

module.exports = {
  generateCsvFromNlpData,
  urlToEntitiesMapping,
  generateCsvFromNlpMetrics,
  createMetricsFromData,
  logSkippedUrls,
  filterNlpData
};
