const express = require("express");
const { default: mongoose } = require("mongoose");
const router = express.Router();
const passport = require("passport");
const Tweet = require("../models/tweets");
const Like = require("../models/likes");

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const tweet = new Tweet();
    const user = req.user;

    if (req.body.content === "") return res.status(400).send("Bad Request");
    tweet.author = user;
    tweet.content = req.body.content;

    await tweet.save();
    return res.json(tweet.toJSON());
  }
);

router.post(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const tweetId = req.params.id;
      console.log(userId);
      console.log(tweetId);

      if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        return res.status(404).json({ msg: "Invalid tweet id" });
      }

      const doesTweetExist = await Tweet.exists({ _id: tweetId });

      if (!doesTweetExist)
        return res.status(404).json({ msg: "Tweet not found" });

      let likeObj = await Like.findOne({
        tweet: tweetId,
        user: userId,
      });
      if (likeObj) {
        return res.json(likeObj);
      } else {
        const newLike = new Like();
        newLike.tweet = tweetId;
        newLike.user = userId;

        await newLike.save();
        return res.json(newLike);
      }
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

router.delete(
  "/:id/unlike",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id.toHexString();
      const tweetId = req.params.id;

      console.log(userId);
      console.log(tweetId);

      if (!mongoose.Types.ObjectId.isValid(tweetId))
        return res.status(404).json({ msg: "Invalid tweet id" });

      Like.findOneAndDelete({
        tweet: tweetId,
        user: userId,
      }).then((likeObj) => {
        console.log(likeObj);
        if (!likeObj) {
          return res.status(404).json({ msg: "Like Object not found" });
        }
        res.send(likeObj);
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

module.exports = router;
