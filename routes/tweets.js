const _ = require("lodash");
const express = require("express");
const { default: mongoose } = require("mongoose");
const router = express.Router();
const passport = require("passport");
const Tweet = require("../models/tweets");
const Like = require("../models/likes");
const Retweet = require("../models/retweets");

// post a
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

//like a tweet
router.post(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const tweetId = req.params.id;

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

//undo like
router.delete(
  "/:id/unlike",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id.toHexString();
      const tweetId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(tweetId))
        return res.status(404).json({ msg: "Invalid tweet id" });

      Like.findOneAndDelete({
        tweet: tweetId,
        user: userId,
      }).then((likeObj) => {
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

//get liking users
router.get("/:id/liking", async (req, res) => {
  try {
    const tweetId = req.params.id;

    const likingUsers = await Like.find({ tweet: tweetId })
      .populate("user")
      .sort("desc");

    return res.json(likingUsers);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
});

//retweet
router.post(
  "/:id/retweet",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const tweetId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        return res.status(404).json({ msg: "Invalid tweet id" });
      }

      const doesTweetExist = await Tweet.exists({ _id: tweetId });

      if (!doesTweetExist)
        return res.status(404).json({ msg: "Tweet not found" });

      let retweetObj = await Retweet.findOne({
        tweet: tweetId,
        user: userId,
      });
      if (retweetObj) {
        return res.json(retweetObj);
      } else {
        const newRetweet = new Retweet();
        newRetweet.tweet = tweetId;
        newRetweet.user = userId;

        await newRetweet.save();
        return res.json(newRetweet);
      }
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

//undo retweet
router.delete(
  "/:id/retweet",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id.toHexString();
      const tweetId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(tweetId))
        return res.status(404).json({ msg: "Invalid tweet id" });

      Retweet.findOneAndDelete({
        tweet: tweetId,
        user: userId,
      }).then((retweetObj) => {
        if (!retweetObj) {
          return res.status(404).json({ msg: "Retweet Object not found" });
        }
        res.send(retweetObj);
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

//get retweeting users
router.get("/:id/retweeting", async (req, res) => {
  try {
    const tweetId = req.params.id;

    const retweetingUsers = await Retweet.find({ tweet: tweetId })
      .populate("user")
      .sort("desc");

    return res.json(retweetingUsers);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Server Error");
  }
});

//search tweets by content
router.get("/search/:query", async (req, res) => {
  try {
    const searchQuery = req.params.query;

    const searchResults = await Tweet.find({
      content: { $regex: searchQuery, $options: "i" },
    });

    // figure out a better way to get retweet and like count
    const searchResultsRaw = searchResults.map((s) => s.toJSON());

    await Promise.all(
      searchResultsRaw.map(async (r) => {
        r.likeCount = await r.likeCount;
        r.retweetCount = await r.retweetCount;
      })
    );

    res.json(searchResultsRaw);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// post a reply
router.post(
  "/reply/:parentTweetId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const parentTweetId = req.params.parentTweetId;

    //add error checks here
    const reply = new Tweet();
    const user = req.user;

    if (req.body.content === "") return res.status(400).send("Bad Request");
    reply.author = user;
    reply.content = req.body.content;
    reply.parentTweetId = parentTweetId;
    reply.isReply = true;

    await reply.save();
    return res.json(reply.toJSON());
  }
);

// retreive layer 1 of replies
router.get("/replies/:tweetId", async (req, res) => {
  try {
    const parentTweetId = req.params.tweetId;

    const replies = await Tweet.aggregate([
      {
        $match: {
          parentTweetId: mongoose.Types.ObjectId(parentTweetId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author",
        },
      },
      {
        $unwind: "$author",
      },
      {
        $lookup: {
          from: "Like",
          localField: "_id",
          foreignField: "tweet",
          as: "likes",
        },
      },
      {
        $lookup: {
          from: "Retweet",
          localField: "_id",
          foreignField: "tweet",
          as: "retweets",
        },
      },
      {
        $addFields: {
          likeCount: {
            $size: "$likes",
          },
          retweetCount: {
            $size: "$retweets",
          },
        },
      },
    ]);

    return res.json(replies);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
