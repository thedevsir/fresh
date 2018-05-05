'use strict';
const Hapi = require('hapi');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    it
} = exports.lab = require('lab').script();

const Manifest = require('../../../manifest');
const Fixtures = require('../../../test/fixtures');

const Auth = require('../../auth');

const Users = require('./routes');

let server;
let accountCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Users.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Users);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    [, accountCredentials] = await Promise.all([
        Fixtures.Creds.createRootAdminUser(),
        Fixtures.Creds.createAccountUser('Stimpson Cat', 'stimpy', 'goodcat', 'stimpy@ren.show'),
        Fixtures.Creds.createAdminUser('Ren Hoek', 'ren', 'baddog', 'ren@stimpy.show')
    ]);
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /users/my', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/users/my',
            credentials: accountCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('stimpy');
    });
});

describe('PUT /users/my', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/users/my',
            credentials: accountCredentials
        };
    });

    it('should return HTTP 409 when the username is already in use', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            email: 'ren@stimpy.show',
            username: 'ren'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/username already in use/i);
    });

    it('should return HTTP 409 when the email is already in use', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            email: 'ren@stimpy.show',
            username: 'pleasesteve'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/email already in use/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            email: 'stimpy@gmail.gov',
            username: 'stimpson'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('stimpson');
        expect(response.result.email).to.equal('stimpy@gmail.gov');
    });
});

describe('PUT /users/my/password', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/users/my/password',
            credentials: accountCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            password: '53cur3p455'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('stimpson');
    });
});
