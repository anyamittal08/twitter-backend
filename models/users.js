const mongoose = require("mongoose");

// email validation, uniqueness validation
const UserSchema = mongoose.Schema(
  {
    email: { type: String, unique: true },
    username: { type: String, unique: true },
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
  },
  {
    timestamps: true,
  }
);

UserSchema.virtual("id").get(function () {
  return this._id;
});

UserSchema.methods.toJSON = function () {
  return {
    id: this._id,
    email: this.email,
    username: this.username,
    displayName: this.displayName,
    firstName: this.firstName,
    lastName: this.lastName,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", UserSchema);
