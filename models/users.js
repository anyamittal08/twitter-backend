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
  };
};

UserSchema.virtual("id").get(function () {
  return this._id;
});

module.exports = mongoose.model("User", UserSchema);
