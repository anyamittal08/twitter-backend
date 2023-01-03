const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router()
const User = require('../models/users');
const env = require('../config');

// Create new user / Sign up
router.post('/', async ({body}, res) => {
    const user = new User();
    user.email = body.email;
    user.username = body.username;
    user.displayName = body.displayName;
    user.firstName = body.firstName;
    user.lastName = body.lastname;
    user.password = await bcrypt.hash(body.password, await bcrypt.genSalt(10));

    await user.save()
    return res.json(user.toJSON());
})

// Login
router.post('/login', async ({body}, res) => {
    const {email, password} = body;

    const user = await User.findOne({ email });

    // User not found
    if (!user)
        return res.status(401).json({ message: 'unauthorized' })

    // Validate credentials
    if (!await bcrypt.compare(password, user.password))
        return res.status(401).json({ message: 'unauthorized' })
    
    // Successful auth
    return res.json({
        user: user,
        token: jwt.sign({ id: user.id }, env.signingSecret, { expiresIn: '1y'})
    });
})


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

router.put('/', passport.authenticate('jwt', { session: false }), async (req, res) => {
    const user = req.user;

    user.email = req.body.email;
    user.username = req.body.username;
    user.displayName = req.body.displayName;
    user.firstName = req.body.firstName;
    user.lastName = req.body.lastName;

    await user.save();
    
    return res.json(user);
})

module.exports = router
