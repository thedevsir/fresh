'use strict';
const Hapi = require('hapi');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    afterEach,
    it
} = exports.lab = require('lab').script();

const Manifest = require('../../../manifest');
const Fixtures = require('../../../test/fixtures');

const Mailer = require('../../mailer');

const User = require('../user');
const AuthAttempt = require('./auth-attempt');

const Login = require('./routes');

let server;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Login.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Login);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    await User.create('ren', 'baddog', 'ren@stimpy.show');
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('POST /login', () => {

    const AuthAttempt_abuseDetected = AuthAttempt.abuseDetected;
    const User_findByCredentials = User.findByCredentials;
    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/login',
            payload: {
                username: 'ren',
                password: 'baddog'
            }
        };
    });

    afterEach(() => {

        AuthAttempt.abuseDetected = AuthAttempt_abuseDetected;
        User.findByCredentials = User_findByCredentials;
    });

    it('should return HTTP 400 when login abuse is detected', async () => {

        AuthAttempt.abuseDetected = () => true;

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(400);
        expect(response.result.message)
            .to.match(/maximum number of auth attempts reached/i);
    });

    it('should return HTTP 400 when a user is not found', async () => {

        User.findByCredentials = () => undefined;

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(400);
        expect(response.result.message)
            .to.match(/credentials are invalid or account is inactive/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.authorization).to.be.a.string();
    });
});

describe('POST /login/forgot', () => {

    const Mailer_sendEmail = Mailer.sendEmail;
    const User_findOne = User.findOne;
    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/login/forgot',
            payload: {
                email: 'ren@stimpy.show'
            }
        };
    });

    afterEach(() => {

        Mailer.sendEmail = Mailer_sendEmail;
        User.findOne = User_findOne;
    });

    it('should return HTTP 200 when the user query misses', async () => {

        User.findOne = () => undefined;

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        Mailer.sendEmail = () => undefined;

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });
});

describe('POST /login/reset', () => {

    const Mailer_sendEmail = Mailer.sendEmail;
    let request;
    let key;

    before(async () => {

        Mailer.sendEmail = (_, __, context) => {

            key = context.key;
        };

        await server.inject({
            method: 'POST',
            url: '/login/forgot',
            payload: {
                email: 'ren@stimpy.show'
            }
        });
    });

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/login/reset',
            payload: {
                email: 'ren@stimpy.show',
                key,
                password: 'badcat'
            }
        };
    });

    afterEach(() => {

        Mailer.sendEmail = Mailer_sendEmail;
    });

    it('should return HTTP 400 when the key match misses', async () => {

        request.payload.key += 'poison';

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.match(/invalid key/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });
});
