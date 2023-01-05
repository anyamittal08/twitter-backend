const express = require('express');
const router = express.Router();
const passport = require('passport');
const Tweet = require('../models/tweets')

router.post('/', passport.authenticate('jwt', { session: false }), async ({body}, res) => {
    const tweet = new Tweet();
    const user = req.user();

    tweet.author = user;
    tweet.content = body.content;

    await tweet.save();
    return res.json(tweet.toJSON());
})

module.exports = router;