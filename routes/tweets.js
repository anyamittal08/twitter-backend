const _ = require("lodash");
const express = require("express");
const { default: mongoose } = require("mongoose");
const router = express.Router();
const passport = require("passport");
const Tweet = require("../models/tweets");
const Like = require("../models/likes");
const Retweet = require("../models/retweets");

// post a tweet
router.post(
  "/post",
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

// delete a tweet
router.delete(
  "/:tweetId/delete",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const tweetToDeleteId = req.params.tweetId;
      const userId = req.user._id;

      if (!mongoose.Types.ObjectId.isValid(tweetToDeleteId))
        return res.status(404).json({ msg: "Invalid tweet id" });

      const tweetToDelete = await Tweet.findById(tweetToDeleteId);

      if (!tweetToDelete)
        return res.status(404).json({ msg: "Tweet does not exist" });

      if (!tweetToDelete.author.equals(userId))
        return res.status(401).json({ msg: "Unauthorized" });

      if (tweetToDelete.isDeleted) {
        return res.status(404).json({ msg: "Tweet is already deleted" });
      }

      if (tweetToDelete.isReply || tweetToDelete.isThread) {
        const parentTweet = await Tweet.findById(tweetToDelete.parentTweetId);

        parentTweet.replyCount--;

        await parentTweet.save();
      }
      tweetToDelete.isDeleted = true;
      await tweetToDelete.save();
      return res.json({ msg: "Success" });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server error" });
    }
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

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

      let likeObj = await Like.findOne({
        tweet: tweetId,
        user: userId,
      });

      if (likeObj) {
        return res.json({ msg: "This user has already liked this tweet" });
      }
      const newLike = new Like();
      newLike.tweet = tweetId;
      newLike.user = userId;

      //increment likeCount
      tweet.likeCount++;

      await newLike.save();
      await tweet.save();

      return res.json({ liked: true });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

//undo a like
router.delete(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const userId = req.user._id.toHexString();
      const tweetId = req.params.id;

      if (!mongoose.Types.ObjectId.isValid(tweetId))
        return res.status(404).json({ msg: "Invalid tweet id" });

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

      Like.findOneAndDelete({
        tweet: tweetId,
        user: userId,
      }).then(async (likeObj) => {
        if (!likeObj) {
          return res.status(404).json({ msg: "Like object not found" });
        }
        tweet.likeCount--;
        await tweet.save();
        return res.json({ liked: false });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

//get liking users for a tweet
router.get("/:id/likedBy", async (req, res) => {
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

//retweet a tweet
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

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

      let retweetObj = await Retweet.findOne({
        tweet: tweetId,
        user: userId,
      });
      if (retweetObj) {
        return res.json({ msg: "User has already retweeted this tweet" });
      }
      const newRetweet = new Retweet();
      newRetweet.tweet = tweetId;
      newRetweet.user = userId;

      //increment retweet count
      tweet.retweetCount++;

      await newRetweet.save();
      await tweet.save();
      return res.json({ retweeted: true });
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

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

      Retweet.findOneAndDelete({
        tweet: tweetId,
        user: userId,
      }).then(async (retweetObj) => {
        if (!retweetObj) {
          return res.status(404).json({ msg: "Retweet object not found" });
        }
        tweet.retweetCount--;
        await tweet.save();

        res.json({ retweeted: false });
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

//get retweeting users
router.get("/:id/retweetedBy", async (req, res) => {
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

    res.json(searchResults);
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

    if (!mongoose.Types.ObjectId.isValid(parentTweetId))
      return res.status(404).json({ msg: "Invalid tweet id" });

    const parentTweet = await Tweet.findById(parentTweetId).populate("author");

    if (!parentTweet)
      return res.status(404).json({ msg: "Tweet does not exist" });

    const reply = new Tweet();
    const user = req.user._id;

    if (req.body.content === "") return res.status(400).send("Bad Request");
    reply.author = user;
    reply.content = req.body.content;
    reply.parentTweetId = parentTweetId;
    reply.parentTweetUserId = parentTweet.author._id;

    if (
      toString(parentTweet.author._id) !== toString(user) ||
      parentTweet.nextTweetInThreadId
    ) {
      reply.isReply = true;
    } else {
      reply.isThread = true;
      if (!parentTweet.threadId) {
        parentTweet.threadId = parentTweet._id;
      }
      reply.threadId = parentTweet.threadId;
    }

    await reply.save();

    if (
      toString(parentTweet.author._id) === toString(user) &&
      !parentTweet.nextTweetInThreadId
    ) {
      parentTweet.nextTweetInThreadId = reply._id;
    }
    parentTweet.replyCount++;

    await parentTweet.save();
    return res.json(reply.toJSON());
  }
);

// retreive layer 1 of replies
router.get(
  "/replies/:tweetId",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const authenticatedUserId = req.user._id;
      const tweetId = req.params.tweetId;
      let thread = [];

      if (!mongoose.Types.ObjectId.isValid(tweetId)) {
        return res.status(404).json({ msg: "Invalid tweet id" });
      }

      const tweet = await Tweet.findById(tweetId);

      if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

      if (tweet.threadId) {
        thread = await Tweet.find({ threadId: tweet.threadId }).sort("desc");
      }

      const replies = await Tweet.aggregate([
        {
          $match: {
            $and: [
              { parentTweetId: mongoose.Types.ObjectId(tweetId) },
              { isReply: true },
            ],
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
            from: "retweets",
            localField: "_id",
            foreignField: "tweet",
            as: "retweets",
          },
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "tweet",
            as: "likes",
          },
        },
        {
          $addFields: {
            liked: {
              $in: [authenticatedUserId, "$likes.user"],
            },
            retweeted: {
              $in: [authenticatedUserId, "$retweets.user"],
            },
          },
        },
      ]);

      return res.json({ thread: thread, replies: replies });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ msg: "Server Error" });
    }
  }
);

// get all tweets in a thread
router.get("/thread/:tweetId", async (req, res) => {
  try {
    const tweetId = req.params.tweetId;

    if (!mongoose.Types.ObjectId.isValid(tweetId)) {
      return res.status(404).json({ msg: "Invalid tweet id" });
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) return res.status(404).json({ msg: "Tweet not found" });

    if (!tweet.threadId) {
      return res.status(404).json({ msg: "this tweet is not a thread" });
    }

    const thread = await Tweet.find({ threadId: tweet.threadId }).sort("desc");

    return res.json(thread);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
