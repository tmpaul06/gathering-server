import AppConfig from "../AppConfig";
import colors from "colors/safe";
import winston from "winston";

let colorMap = {
  error: "red",
  warn: "yellow",
  info: "green",
  verbose: "magenta",
  debug: "blue",
  silly: "gray"
};

export default new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      timestamp() {
        return new Date().toISOString();
      },
      level: AppConfig.logLevel,
      colorize: true,
      formatter(options) {
        let meta = options.meta ? JSON.stringify(options.meta) : "";
        return colors[colorMap[options.level]](options.level.toUpperCase()) +
         ": [" + this.timestamp() + " ] " +
          options.message + " " + (meta === "{}" ? "" : meta);
      }
    })
  ]
});