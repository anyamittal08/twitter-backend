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
const Retweet = require("../models/retweets");
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

//update user info
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

//get a user's home feed
router.get(
  "/home",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    const userId = req.user._id;
    const followedUserRelationshipOjbs = await Relationship.find({
      follower: userId,
    }).populate("targetUser");

    const followedUserIds = followedUserRelationshipOjbs.map(
      (relationship) => relationship.targetUser.id
    );

    const tweets = await Tweet.aggregate([
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
        $match: {
          $or: [
            {
              "author._id": {
                $in: followedUserIds.map((userId) =>
                  mongoose.Types.ObjectId(userId)
                ),
              },
            },
            {
              "retweets.user": {
                $in: followedUserIds.map((userId) =>
                  mongoose.Types.ObjectId(userId)
                ),
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "retweets.user",
          foreignField: "_id",
          as: "retweeters",
        },
      },
      {
        $addFields: {
          followedRetweeters: {
            $filter: {
              input: "$retweeters",
              as: "retweeter",
              cond: {
                $in: [
                  "$$retweeter._id",
                  followedUserIds.map((id) => mongoose.Types.ObjectId(id)),
                ],
              },
            },
          },
          liked: {
            $in: [userId, "$likes.user"],
          },
          retweeted: {
            $in: [userId, "$retweets.user"],
          },
        },
      },
    ]);
    return res.json(tweets);
  }
);

// Get a user's tweets
router.get(
  "/:id/tweets",
  passport.authenticate("jwt", { session: false, optional: true }),
  async (req, res) => {
    const userId = req.params.id;
    const authenticatedUserId = req.user ? req.user._id : null;

    const user = await User.findById(userId);
    console.log(user);

    const tweets = await Tweet.aggregate([
      {
        $lookup: {
          from: "retweets",
          localField: "_id",
          foreignField: "tweet",
          as: "retweets",
        },
      },
      {
        $match: {
          $or: [
            { author: mongoose.Types.ObjectId(userId) },
            { "retweets.user": mongoose.Types.ObjectId(userId) },
          ],
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
          retweetedByUser: {
            $in: [mongoose.Types.ObjectId(userId), "$retweets.user"],
          },
          liked: {
            $in: [authenticatedUserId, "$likes.user"],
          },
          retweeted: {
            $in: [authenticatedUserId, "$retweets.user"],
          },
          userObject: {
            $cond: {
              if: { $eq: ["$retweetedByUser", true] },
              then: mongoose.Types.ObjectId(userId),
              else: null,
            },
          },
        },
      },
    ]);
    return res.json(tweets);
  }
);

// Get userID from username
router.get("/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }
    res.json(user);
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

//get a user's liked tweets
router.get("/:id/likedTweets", async (req, res) => {
  try {
    const userId = req.params.id;

    const likes = await Like.find({ user: userId })
      .populate("tweet")
      .populate({
        path: "tweet",
        populate: {
          path: "author",
        },
      });

    return res.json(likes);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

//get retweets
router.get("/:id/retweets", async (req, res) => {
  try {
    const userId = req.params.id;

    const retweets = await Retweet.find({ user: userId }).populate({
      path: "tweet",
      options: { sort: { createdAt: "desc" } },
    });

    return res.json(retweets);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

//search users
router.get("/search/:query", async (req, res) => {
  try {
    const searchQuery = req.params.query;

    const searchResults = await User.find({
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { displayName: { $regex: searchQuery, $options: "i" } },
      ],
    });

    res.json(searchResults);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

module.exports = router;
