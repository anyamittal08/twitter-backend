const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const router = express.Router();
const User = require("../models/users");
const Relationship = require("../models/relationships");
const Tweet = require("../models/tweets");
const Like = require("../models/likes");
const env = require("../config");

// Create new user / Sign up
router.post("/", async ({ body }, res) => {
  const user = new User();
  user.email = body.email;
  user.username = body.username;
  user.displayName = body.displayName;
  user.firstName = body.firstName;
  user.lastName = body.lastname;
  user.password = await bcrypt.hash(body.password, await bcrypt.genSalt(10));

  await user.save();
  return res.json(user.toJSON());
});

// Login
router.post("/login", async ({ body }, res) => {
  const { email, password } = body;

  const user = await User.findOne({ email });

  // User not found
  if (!user) return res.status(401).json({ message: "unauthorized" });

  // Validate credentials
  if (!(await bcrypt.compare(password, user.password)))
    return res.status(401).json({ message: "unauthorized" });

  // Successful auth
  return res.json({
    user: user,
    token: jwt.sign({ id: user.id }, env.signingSecret, { expiresIn: "1y" }),
  });
});

/*
Task: As a user, I should be able to update my profile information

Design:
PUT /users (requires authentication)
Body { email: "manan@argv.io", username: "manan", displayName: "manan" }

Effect: should update the email, username and displayName of the authenticated user in db, and return refreshed object

Implementation:
- define a new API route for PUT /users
    - eg., router.put("/", (req, res) => {.....})
- add authentication guard to the route
    - you can do this by adding the middleware `passport.authenticate('jwt', { session: false })` to the route
    - look here for more details http://www.passportjs.org/concepts/authentication/middleware/
- in the route handler, retrieve the authenticated user and perform the update
    - retreive the authenticated user using `req.user` as passport sets the property on successful authentication
    - update the user object with new properties from req.body
    - save the updates by performing `.save()` on the mongoose model
- return the updated user model to the client
    - return the save response to the client using res.json({...})
*/

router.put(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const user = req.user;

    user.email = req.body.email;
    user.username = req.body.username;
    user.displayName = req.body.displayName;
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;

    await user.save();

    return res.json(user);
  }
);

router.get(
  "/home",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = req.user._id;
    const following = await Relationship.find({ follower: userId }).populate(
      "targetUser"
    );

    const followingIds = following.map(
      (relationship) => relationship.targetUser.id
    );

    console.log(followingIds);

    const tweets = await Tweet.aggregate([
      {
        $match: {
          author: {
            $in: followingIds.map((userId) => mongoose.Types.ObjectId(userId)),
          },
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
        $sort: {
          createdAt: -1,
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
        $addFields: {
          liked: {
            $in: [userId, "$likes.user"],
          },
        },
      },
    ]);
    console.log(tweets);

    return res.json(tweets);
  }
);

// Get a user's tweets
router.get("/:id/tweets", async (req, res) => {
  const tweets = await Tweet.find({ author: req.params.id })
    .populate("author")
    .sort({
      createdAt: "desc",
    });
  return res.json(tweets);
});

// Get userID from username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }
    res.json({ userId: user._id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// follow users
router.post(
  "/:id/follow",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const followerId = req.user._id.toHexString();
      const targetUserId = req.params.id;

      if (followerId === targetUserId) {
        res.status(400).json({ msg: "Bad Request" });
      }

      let relationship = await Relationship.findOne({
        follower: followerId,
        targetUser: targetUserId,
      });
      if (relationship) {
        return res.json(relationship);
      } else {
        const newRelationship = new Relationship();
        newRelationship.follower = followerId;
        newRelationship.targetUser = targetUserId;

        await newRelationship.save();
        return res.json(newRelationship);
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server Error");
    }
  }
);

//unfollow users
router.delete(
  "/:id/unfollow",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    try {
      const followerId = req.user._id;
      const targetUserId = req.params.id;

      Relationship.findOneAndDelete({
        follower: followerId,
        targetUser: targetUserId,
      }).then((relationship) => {
        if (!relationship) {
          return res.status(404).json({ msg: "Relationship not found" });
        }
        res.send(relationship);
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

//get follows
router.get("/:id/following", async (req, res) => {
  try {
    const followerId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(followerId)) {
      return res.status(404).json({ msg: "Invalid user ID" });
    }
    const doesUserExist = await User.exists({
      _id: followerId,
    });
    if (!doesUserExist) {
      return res.status(404).json({ msg: "User not found" });
    }
    const following = await Relationship.find({
      follower: followerId,
    }).populate("targetUser");
    return res.json(following);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

//get followers
router.get("/:id/followers", async (req, res) => {
  try {
    const userId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(404).json({ msg: "Invalid user ID" });
    }
    const doesUserExist = await User.exists({
      _id: userId,
    });
    if (!doesUserExist) {
      return res.status(404).json({ msg: "User not found" });
    }
    const followers = await Relationship.find({ targetUser: userId }).populate(
      "follower"
    );
    return res.json(followers);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
