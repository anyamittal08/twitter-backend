/*
Task: Define the schema for tweets

Data model:
  - author_id
  - content

Implementation:
  - define the schema for a tweet with all the attributes of a tweet
    - const TweetSchema = mongoose.Schema({ .... })
      - the schema must contain two important attributes
        - author_id which references to a user id
          - since author_id points to a user, it uses a special type mongoose.Schema.Types.ObjectId instead of strings
          - look at how to define such an attribute here: https://mongoosejs.com/docs/populate.html
        - content which holds the content of the tweet itself
    - reference the documentation here https://mongoosejs.com/docs/guide.html
  - create a model for a tweet using the schema
    - schemas are used in combination with models to create collections in mongodb. you can re-use the same schema to create several different collections
    - eg model., const Blog = mongoose.model('Blog', blogSchema);
      - the first attribute is the name you want to give to the mongo collection
      - the secoond attribute is the schema you want to use for that collection
  - export the model from this file so we can use it in routes to query, create, update, delete tweets
    - eg., module.exports = Model
*/

const mongoose = require("mongoose");

const Like = require("../models/likes");
const Retweet = require("../models/retweets");

const TweetSchema = mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    content: String,
    parentTweetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
      default: null,
    },
    isReply: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

TweetSchema.virtual("id").get(function () {
  return this._id;
});

// virtual properties cant handle async code (this is returning a promise) figure out a better way to get retweet and like count
TweetSchema.virtual("likeCount").get(async function () {
  const likeCount = await Like.countDocuments({ tweet: this._id });
  return likeCount;
});

TweetSchema.virtual("retweetCount").get(async function () {
  const retweetCount = await Retweet.countDocuments({ tweet: this._id });
  return retweetCount;
});

const Tweet = mongoose.model("Tweet", TweetSchema);

module.exports = Tweet;
