'use strict';
const Hapi = require('hapi');
const Sinon = require('sinon');
const Jwt = require('jsonwebtoken');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    afterEach,
    it
} = exports.lab = require('lab').script();

const Config = require('../../../config');

const { createModelId } = require('../../../test/utils');

const Manifest = require('../../../manifest');
const Fixtures = require('../../../test/fixtures');

const Mailer = require('../../mailer');

const User = require('../user');

const Signup = require('./routes');

const { secret, algorithm } = Config.get('/jwt');

let server;
let user;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Signup.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Signup);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    user = await User.create('ren', 'baddog', 'ren@stimpy.show');
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('POST /signup', () => {

    const Mailer_sendEmail = Mailer.sendEmail;
    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/signup'
        };
    });

    afterEach(() => {

        Mailer.sendEmail = Mailer_sendEmail;
    });

    it('should return HTTP 409 when the username is already in use', async () => {

        request.payload = {
            name: 'Unoriginal Bill',
            email: 'bill@hotmail.gov',
            username: 'ren',
            password: 'pass123'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/username already in use/i);
    });

    it('should return HTTP 409 when the email is already in use', async () => {

        request.payload = {
            name: 'Unoriginal Bill',
            email: 'ren@stimpy.show',
            username: 'bill',
            password: 'pass123'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/email already in use/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        Mailer.sendEmail = () => undefined;

        request.payload = {
            name: 'Captain Original',
            email: 'captain@stimpy.show',
            username: 'captain',
            password: 'allaboard'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.authorization).to.be.an.string();
    });

    it('should return HTTP 200 when all is well and logs any mailer errors', async () => {

        Mailer.sendEmail = function () {

            throw new Error('Failed to send mail.');
        };

        const mailerLogEvent = server.events.once({
            name: 'request',
            filter: ['error', 'mailer']
        });

        request.payload = {
            name: 'Assistant Manager',
            email: 'manager@stimpy.show',
            username: 'assistant',
            password: 'totheregionalmanager'
        };

        const response = await server.inject(request);
        const [, event] = await mailerLogEvent;

        expect(event.error.message).to.match(/failed to send mail/i);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.authorization).to.be.an.string();
    });
});

describe('POST /signup/verify', () => {

    const Mailer_sendEmail = Mailer.sendEmail;
    let findOneAndUpdate;
    let request;
    let key;

    before(async () => {

        findOneAndUpdate = Sinon.stub(User, 'findOneAndUpdate');

        Mailer.sendEmail = (_, __, context) => {

            key = context.key;
        };

        await server.inject({
            method: 'POST',
            url: '/signup/resend-email',
            payload: {
                email: 'ren@stimpy.show'
            }
        });
    });

    after(() => {

        findOneAndUpdate.restore();
    });

    beforeEach(() => {

        request = {
            method: 'POST',
            url: `/signup/verify`,
            payload: {
                key,
                email: 'ren@stimpy.show'
            }
        };
    });

    afterEach(() => {

        Mailer.sendEmail = Mailer_sendEmail;
    });

    it('should return HTTP 400 when key match misses', async () => {

        request.payload.key += 'poison';

        const { statusCode, result } = await server.inject(request);

        expect(statusCode).to.equal(400);
        expect(result.message).to.match(/invalid key/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { user: { _id } } = Jwt.verify(key, secret, { algorithms: [algorithm] });

        const expectedFilterQuery = {
            _id,
            email: 'ren@stimpy.show'
        };

        const expectedUpdateQuery = {
            $unset: { verify: undefined }
        };

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(findOneAndUpdate);
        // Sinon.assert.calledWithExactly(findOneAndUpdate.firstCall, expectedFilterQuery, expectedUpdateQuery);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});

describe('POST /signup/resend-email', () => {

    let findOne;
    let sendEmail;

    const email = 'tester@test.io';
    const request = {
        method: 'POST',
        url: '/signup/resend-email',
        payload: { email }
    };

    const _id = createModelId(User);

    before(() => {

        findOne = Sinon.stub(User, 'findOne')
            .onFirstCall().resolves(undefined)
            .resolves({ _id });
        sendEmail = Sinon.stub(Mailer, 'sendEmail');
    });

    after(() => {

        findOne.restore();
        sendEmail.restore();
    });

    it('should return HTTP 200 when `User.findOne` misses', async () => {

        const expectedFilterQuery = {
            email,
            verify: false
        };

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(findOne);
        Sinon.assert.calledWithExactly(findOne.firstCall, expectedFilterQuery);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledTwice(findOne);
        Sinon.assert.calledOnce(sendEmail);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});
