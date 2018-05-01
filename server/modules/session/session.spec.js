'use strict';
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Config   = require('../../../config');
const Fixtures = require('../../../test/fixtures');

const Session = require('./session');

const config = Config.get('/hapiMongoModels/mongodb');

describe('Session Model', () => {

    before(async () => {

        await Session.connect(config.connection, config.options);
        await Fixtures.Db.removeAllData();
    });

    after(async () => {

        await Fixtures.Db.removeAllData();

        Session.disconnect();
    });

    it('should return a new instance when create succeeds', async () => {

        const session = await Session.create('ren', 'ip', 'userAgent');

        expect(session).to.be.an.instanceOf(Session);
    });

    it('should return undefined when finding by credentials session misses', async () => {

        const id = '555555555555555555555555';
        const keyHash = await Session.generateKeyHash();
        const session = await Session.findByCredentials(id, keyHash.key);

        expect(session).to.be.undefined();
    });

    it('should return undefined when finding by credentials session hits and key match misses', async () => {

        const userId = '000000000000000000000000';
        const ip = '127.0.0.1';
        const userAgent = [
            'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us)',
            ' AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'
        ].join('');
        const session = await Session.create(userId, ip, userAgent);

        expect(session).to.be.an.instanceOf(Session);

        const key = `${session.key}poison`;
        const result = await Session.findByCredentials(session._id, key);

        expect(result).to.be.undefined();
    });

    it('should return a session instance when finding by credentials hits and key match hits', async () => {

        const userId = '000000000000000000000000';
        const ip = '127.0.0.1';
        const userAgent = [
            'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us)',
            ' AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'
        ].join('');
        const session = await Session.create(userId, ip, userAgent);

        expect(session).to.be.an.instanceOf(Session);

        const key = session.key;
        const result = await Session.findByCredentials(session._id, key);

        expect(result).to.be.an.instanceOf(Session);
        expect(session._id).to.equal(result._id);
    });

    it('should create a key hash combination', async () => {

        const result = await Session.generateKeyHash();

        expect(result).to.be.an.object();
        expect(result.key).to.be.a.string();
        expect(result.hash).to.be.a.string();
    });

    it('should update the last active time of an instance', async () => {

        const userId = '000000000000000000000000';
        const ip = '127.0.0.1';
        const userAgent = [
            'Mozilla/5.0 (iPad; U; CPU OS 3_2_1 like Mac OS X; en-us)',
            ' AppleWebKit/531.21.10 (KHTML, like Gecko) Mobile/7B405'
        ].join('');
        const session = await Session.create(userId, ip, userAgent);

        await session.updateLastActive();

        expect(session.lastActive).to.be.a.date();
    });
});
