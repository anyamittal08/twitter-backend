require("dotenv").config();

module.exports = {
  signingSecret: process.env["SIGNING_SECRET"],
  mongoUri: process.env["MONGO_URI"],
  isProduction: process.env["NODE_ENV"] === "prod",
};
