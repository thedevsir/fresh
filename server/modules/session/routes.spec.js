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

const Session = require('./session');

const Sessions = require('./routes');

let server;
let rootCredentials;
let rootSession;

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

    rootSession = rootCredentials.session;
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /sessions/my', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/sessions/my',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.array();
        expect(response.result.length).to.equal(1);
    });
});

describe('DELETE /sessions/my/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/sessions/my/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 400 when tryint to destroy current session', async () => {

        request.url = request.url.replace(/{id}/, rootSession._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(400);
        expect(response.result.message).to.match(/current session/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const session = await Session.create(rootSession.userId, '127.0.0.2', 'Lab');

        request.url = request.url.replace(/{id}/, session._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});
