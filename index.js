const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const userRoutes = require("./routes/users");
const tweetRoutes = require("./routes/tweets");
const passport = require("passport");
const { Strategy, ExtractJwt } = require("passport-jwt");
const env = require("./config");
const User = require("./models/users");
const fs = require("fs");

const https = require("https");
const http = require("http");

(async () => {
  const app = express();

  // Connect with Mongo
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.mongoUri);

  // Setup Middlewares
  app.use(morgan("tiny"));
  app.use(cors());
  app.use(bodyParser.json());

  // Passport
  passport.use(
    new Strategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: env.signingSecret,
      },
      (payload, done) => {
        User.findOne({ _id: payload.id }, function (err, user) {
          if (err) return done(err, false);
          if (user) return done(null, user);
          return done(null, false);
        });
      }
    )
  );

  // Setup Routes
  app.use("/users", userRoutes);
  app.use("/tweets", tweetRoutes);
  // Setup 404 Handler
  app.use((req, res, next) => res.status(404).json({ message: "not found" }));

  if (env.isProduction) {
    const credentials = {
      key: fs.readFileSync("ssl/server.key", "utf8"),
      cert: fs.readFileSync("ssl/server.crt", "utf8"),
    };

    const server = https.createServer(credentials, app);
    server.listen(443, null, null, () => console.log("listening..."));
  } else {
    const server = http.createServer(app);
    server.listen(3000, null, null, () => console.log("listening..."));
  }

  // Return
  return app;
})().catch(console.log);
