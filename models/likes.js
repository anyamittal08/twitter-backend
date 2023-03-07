const mongoose = require("mongoose");

const LikeSchema = mongoose.Schema(
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

LikeSchema.methods.toJSON = function () {
  return {
    id: this._id,
    tweet: this.tweet,
    user: this.user,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

LikeSchema.virtual("id").get(function () {
  return this._id;
});

LikeSchema.index({ tweet: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Like", LikeSchema);
