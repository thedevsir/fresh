'use strict';
const Assert = require('assert');
const Joi = require('joi');
const MongoModels = require('mongo-models');
const NewDate = require('joistick/new-date');

const Config = require('../../../config');

const schema = Joi.object({
    _id: Joi.object(),
    ip: Joi.string().required(),
    timeCreated: Joi.date().default(NewDate(), 'time of creation'),
    username: Joi.string().required()
});

class AuthAttempt extends MongoModels {

    static async abuseDetected(ip, username) {

        Assert.ok(ip, 'Missing ip argument.');
        Assert.ok(username, 'Missing username argument.');

        const config = Config.get('/authAttempts');
        const duration = new Date(Date.now() - config.durationOfBlocking * 60 * 60 * 1000);

        const [countByIp, countByIpAndUser] = await Promise.all([
            this.count({ ip, timeCreated: { $gt: duration } }),
            this.count({ ip, username, timeCreated: { $gt: duration } })
        ]);

        const ipLimitReached = countByIp >= config.forIp;
        const ipUserLimitReached = countByIpAndUser >= config.forIpAndUser;

        return ipLimitReached || ipUserLimitReached;
    }

    static async create(ip, username) {

        Assert.ok(ip, 'Missing ip argument.');
        Assert.ok(username, 'Missing username argument.');

        const document = new this({
            ip,
            username
        });
        const authAttempts = await this.insertOne(document);

        return authAttempts[0];
    }
}

AuthAttempt.collectionName = 'authAttempts';
AuthAttempt.schema = schema;
AuthAttempt.indexes = [
    { key: { ip: 1, username: 1 } },
    { key: { username: 1 } }
];

module.exports = AuthAttempt;
