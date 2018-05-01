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

const Manifest = require('../../../../manifest');
const Fixtures = require('../../../../test/fixtures');

const Auth = require('../../../auth');

const Status = require('../status');

const Statuses = require('./routes');

let server;
let rootCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Statuses.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Statuses);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    rootCredentials = await Fixtures.Creds.createRootAdminUser();
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /statuses', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/statuses',
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

describe('POST /statuses', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/statuses',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            name: 'Happy',
            pivot: 'Account'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.and.object();
        expect(response.result.name).to.be.equal('Happy');
        expect(response.result.pivot).to.be.equal('Account');
    });
});

describe('GET /statuses/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/statuses/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Status.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, 'missing-status');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const status = await Status.create('Account', 'Sad');

        request.url = request.url.replace(/{id}/, status._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.equal('Sad');
        expect(response.result.pivot).to.equal('Account');
    });
});

describe('PUT /statuses/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/statuses/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Status.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, 'account-emojiface');
        request.payload =  {
            name: 'Wrecking Crew'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const status = await Status.create('Admin', 'Cold');

        request.url = request.url.replace(/{id}/, status._id);
        request.payload =  {
            name: 'Hot'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.equal('Hot');
        expect(response.result.pivot).to.equal('Admin');
    });
});

describe('DELETE /statuses/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/statuses/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Status.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const status = await Status.create('Account', 'Above');

        request.url = request.url.replace(/{id}/, status._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});
