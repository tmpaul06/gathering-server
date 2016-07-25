const AppConfig = {
  logLevel: process.env["LOG_LEVEL"] || "info",

  publishHost: process.env["host"] || "0.0.0.0",
  publishPort: process.env["port"] || "3002",

  esHost: process.env["elasticsearch.host"] || "localhost",
  esPort: process.env["elasticsearch.http.port"] || 9200,
  esTimeout: 30000,
  esUsername: process.env["shieldUsername"] || "anonymous",
  esPassword: process.env["shieldPassword"] || "",

  noAuth: process.env["noauth"] || false,

  apiPrefix: "/api/v1",

  // DEFAULT_MIN_MONTH: "2013-12-01",
  DEFAULT_MIN_MONTH: "2016-01-01",
  DEFAULT_MAX_MONTH: "2016-02-29",
  MIN_ACTUALS_DATE: "2014-01-01",
  MAX_ACTUALS_DATE: "2016-03-01",
  DEFAULT_PIVOT_DATE: "2016-04-01",
  MIN_FORECASTS_DATE: "2014-01-01",
  MAX_FORECASTS_DATE: "2017-01-01"
};

  // INDEX: "bi_exploration_test",
  // DOC_TYPES: [ "model_feature_importance" ],

export default AppConfig;
