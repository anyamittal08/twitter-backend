require('dotenv').config();

module.exports = {
    signingSecret: process.env['SIGNING_SECRET'],
}
