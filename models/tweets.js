const mongoose = require("mongoose");

const TweetSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: String,
    retweetCount: {
      type: Number,
      default: 0,
    },
    //likes
    likeCount: {
      type: Number,
      default: 0,
    },
    //retweets
    retweetCount: {
      type: Number,
      default: 0,
    },
    replyCount: {
      type: Number,
      default: 0,
    },
    //replies
    isReply: {
      type: Boolean,
      default: false,
    },
    parentTweetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    parentTweetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    //threads
    isThread: {
      type: Boolean,
      default: false,
    },
    nextTweetInThreadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Tweet = mongoose.model("Tweet", TweetSchema);

module.exports = Tweet;
