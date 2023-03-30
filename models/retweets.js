const mongoose = require("mongoose");

const RetweetSchema = mongoose.Schema(
  {
    tweet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tweet",
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

RetweetSchema.methods.toJSON = function () {
  return {
    id: this._id,
    tweet: this.tweet,
    user: this.user,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

RetweetSchema.virtual("id").get(function () {
  return this._id;
});

RetweetSchema.index({ tweet: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Retweet", RetweetSchema);
