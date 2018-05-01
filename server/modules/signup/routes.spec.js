'use strict';
const Hapi = require('hapi');
const Sinon = require('sinon');
const Bcrypt = require('bcryptjs');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    afterEach,
    it
} = exports.lab = require('lab').script();

const { createModelId } = require('../../../test/utils');

const Manifest = require('../../../manifest');
const Fixtures = require('../../../test/fixtures');

const Mailer = require('../../mailer');

const User = require('../user');

const Signup = require('./routes');

let server;

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

        await User.create('ren', 'baddog', 'ren@stimpy.show');

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
        expect(response.result.user).to.be.an.object();
        expect(response.result.session).to.be.an.object();
        expect(response.result.authHeader).to.be.a.string();
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
        expect(response.result.user).to.be.an.object();
        expect(response.result.session).to.be.an.object();
        expect(response.result.authHeader).to.be.a.string();
    });
});

describe('POST /signup/verify', () => {

    let findOne;
    let compare;
    let findByIdAndUpdate;

    const email = 'tester@test.io';
    const key = 'xxxx';
    const request = {
        method: 'POST',
        url: `/signup/verify`,
        payload: { email, key }
    };

    const _id = createModelId(User);
    const token = 'zzzz';

    before(() => {

        findOne = Sinon.stub(User, 'findOne')
            .onFirstCall().resolves(undefined)
            .resolves({ _id, verify: { token } });
        compare = Sinon.stub(Bcrypt, 'compare')
            .onFirstCall().resolves(false)
            .resolves(true);
        findByIdAndUpdate = Sinon.stub(User, 'findByIdAndUpdate');
    });

    after(() => {

        findOne.restore();
        compare.restore();
        findByIdAndUpdate.restore();
    });

    it('should return HTTP 400 when `User.findOne` misses', async () => {

        const now = Sinon.stub(Date, 'now').returns(123456789);
        const expectedFilterQuery = {
            email,
            'verify.expires': { $gt: Date.now() }
        };

        const { statusCode, result } = await server.inject(request);

        now.restore();

        Sinon.assert.calledOnce(findOne);
        Sinon.assert.calledWithExactly(findOne.firstCall, expectedFilterQuery);

        expect(statusCode).to.equal(400);
        expect(result.message).to.match(/invalid email or key/i);
    });

    it('should return HTTP 400 when key match misses', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledTwice(findOne);
        Sinon.assert.calledOnce(compare);
        Sinon.assert.calledWithExactly(compare, key, token);

        expect(statusCode).to.equal(400);
        expect(result.message).to.match(/invalid email or key/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const expectedUpdateQuery = {
            $unset: { verify: undefined }
        };

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledThrice(findOne);
        Sinon.assert.calledTwice(compare);
        Sinon.assert.calledOnce(findByIdAndUpdate);
        Sinon.assert.calledWithExactly(findByIdAndUpdate.firstCall, _id, expectedUpdateQuery);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});

describe('POST /signup/resend-email', () => {

    let findOne;
    let findByIdAndUpdate;
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
        findByIdAndUpdate = Sinon.stub(User, 'findByIdAndUpdate').resolves({});
        sendEmail = Sinon.stub(Mailer, 'sendEmail');
    });

    after(() => {

        findOne.restore();
        findByIdAndUpdate.restore();
        sendEmail.restore();
    });

    it('should return HTTP 200 when `User.findOne` misses', async () => {

        const now = Sinon.stub(Date, 'now').returns(123456789);
        const expectedFilterQuery = {
            email,
            'verify.expires': { $lt: Date.now() }
        };

        const { statusCode, result } = await server.inject(request);

        now.restore();

        Sinon.assert.calledOnce(findOne);
        Sinon.assert.calledWithExactly(findOne.firstCall, expectedFilterQuery);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledTwice(findOne);
        Sinon.assert.calledOnce(findByIdAndUpdate);
        Sinon.assert.calledWith(findByIdAndUpdate.firstCall, _id);
        Sinon.assert.calledOnce(sendEmail);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});
