const mongoose = require("mongoose");

// email validation, uniqueness validation
const UserSchema = mongoose.Schema(
  {
    email: String,
    username: String,
    password: String,
    displayName: {
      type: String,
      default: "",
    },
    firstName: {
      type: String,
      default: "",
    },
    lastName: {
      type: String,
      default: "",
    },
    followerCount: {
      type: Number,
      default: 0,
    },
    followingCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

UserSchema.methods.toJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    firstName: this.firstName,
    lastName: this.lastName,
    createdAt: this.createdAt,
    followerCount: this.followerCount,
    followingCount: this.followingCount,
  };
};

UserSchema.virtual("id").get(function () {
  return this._id;
});

module.exports = mongoose.model("User", UserSchema);
