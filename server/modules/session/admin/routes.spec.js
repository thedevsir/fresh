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

const Session = require('../session');
const User    = require('../../user');

const Sessions = require('./routes');

let server;
let rootCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Sessions.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Sessions);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    rootCredentials = await Fixtures.Creds.createRootAdminUser();
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /sessions', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/sessions',
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

describe('GET /sessions/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/sessions/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Session.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('darcie', 'uplate', 'darcie@late.night');
        const session = await Session.create(`${user._id}`, '127.0.0.1', 'Lab');

        request.url = request.url.replace(/{id}/, session._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.userId).to.equal(`${user._id}`);
    });
});

describe('DELETE /sessions/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/sessions/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Session.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const user = await User.create('aldon', 'thirsty', 'aldon@late.night');
        const session = await Session.create(`${user._id}`, '127.0.0.1', 'Lab');

        request.url = request.url.replace(/{id}/, session._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});
