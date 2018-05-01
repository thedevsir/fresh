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

const User    = require('../user');
const Session = require('../session');

const Logout = require('./routes');

let server;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Logout.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Logout);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('DELETE /logout', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/logout'
        };
    });

    it('should return HTTP 200 when credentials are missing', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });

    it('should return HTTP 200 when credentials are present', async () => {

        const user = await User.create('ren', 'baddog', 'ren@stimpy.show');
        const session = await Session.create('ren', 'baddog', 'ren@stimpy.show');

        request.credentials = {
            roles: [],
            session,
            user
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });
});
