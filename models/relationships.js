const mongoose = require("mongoose");

const RelationshipSchema = mongoose.Schema(
  {
    follower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

RelationshipSchema.methods.toJSON = function () {
  return {
    id: this._id,
    follower: this.follower,
    targetUser: this.targetUser,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

RelationshipSchema.virtual("id").get(function () {
  return this._id;
});

RelationshipSchema.index({ follower: 1, targetUser: 1 }, { unique: true });

module.exports = mongoose.model("Relationship", RelationshipSchema);
