const { createLogger, transports, format } = require("winston");

const customFormat = format.combine(
  format.timestamp(),
  format.printf((info) => {
    return `${info.timestamp} - ${info.message}`;
  })
);
const logger = createLogger({
  format: customFormat,
  transports: [
    new transports.Console(),
    new transports.File({ filename: "logs/logs.log" }),
  ],
});

module.exports = logger;