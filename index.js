const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const userRoutes = require('./routes/users');
const tweetRoutes = require('./routes/tweets');
const passport = require('passport');
const {Strategy, ExtractJwt} = require('passport-jwt');
const env = require('./config');
const User = require('./models/users');

(async () => {
    const app = express();

    // Connect with Mongo
    mongoose.set('strictQuery', true)
    await mongoose.connect('mongodb://localhost:27017/twitter')

    // Setup Middlewares
    app.use(morgan('tiny'));
    app.use(bodyParser.json());

    // Passport 
    passport.use(new Strategy({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: env.signingSecret }, (payload, done) => {
        User.findOne({id: payload.id}, function(err, user) {
            if (err) return done(err, false);
            if (user) return done(null, user);
            return done(null, false);
        });
    }))

    // Setup Routes
    app.use('/users', userRoutes)
    app.use('/tweets', tweetRoutes)


    // Setup 404 Handler
    app.use((req, res, next) => res.status(404).json({ message: 'not found' }))


    // Start Listening
    app.listen('3000', () => console.log('listening...'));

    // Return
    return app
})()
    .catch(console.log)
