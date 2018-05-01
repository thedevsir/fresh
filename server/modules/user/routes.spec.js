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

const User = require('./user');

const Users = require('./routes');

let server;
let rootCredentials;
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

    [rootCredentials, accountCredentials] = await Promise.all([
        Fixtures.Creds.createRootAdminUser(),
        Fixtures.Creds.createAccountUser('Stimpson Cat', 'stimpy', 'goodcat', 'stimpy@ren.show'),
        Fixtures.Creds.createAdminUser('Ren Hoek', 'ren', 'baddog', 'ren@stimpy.show')
    ]);
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /users', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/users',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.data).to.be.an.array();
        expect(response.result.pages).to.be.an.object();
        expect(response.result.items).to.be.an.object();
    });
});

describe('POST /users', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/users',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 409 when the username is already in use', async () => {

        request.payload = {
            email: 'steve@stimpy.show',
            password: 'lovely',
            username: 'ren'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/username already in use/i);
    });

    it('should return HTTP 409 when the email is already in use', async () => {

        request.payload = {
            email: 'ren@stimpy.show',
            password: 'lovely',
            username: 'steveplease'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/email already in use/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            email: 'steve@stimpy.show',
            password: 'lovely',
            username: 'steveplease'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.and.object();
        expect(response.result.username).to.equal('steveplease');
    });
});

describe('GET /users/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/users/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `User.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('mrcolbert', 'colbert123', 'mr@colbert.baz');

        request.url = request.url.replace(/{id}/, user._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('mrcolbert');
    });
});

describe('PUT /users/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/users/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 409 when the username is already in use', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            isActive: true,
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
            isActive: true,
            email: 'ren@stimpy.show',
            username: 'pleasesteve'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/email already in use/i);
    });

    it('should return HTTP 404 when `User.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            isActive: true,
            email: 'pleasesteve@stimpy.show',
            username: 'pleasesteve'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('finally', 'gue55', 'finally@made.it');

        request.url = request.url.replace(/{id}/, user._id);
        request.payload = {
            isActive: true,
            email: 'finally@made.io',
            username: 'yllanif'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('yllanif');
        expect(response.result.email).to.equal('finally@made.io');
    });
});

describe('DELETE /users/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/users/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `User.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('deleteme', '0000', 'delete@me.please');

        request.url = request.url.replace(/{id}/, user._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});

describe('PUT /users/{id}/password', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/users/{id}/password',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `User.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            password: '53cur3p455'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('finally', 'gue55', 'finally@made.it');

        request.url = request.url.replace(/{id}/, user._id);
        request.payload = {
            password: '53cur3p455'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.username).to.equal('finally');
    });
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
