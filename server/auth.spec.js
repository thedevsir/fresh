'use strict';
const Hapi = require('hapi');
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Manifest = require('../manifest');
const Fixtures = require('../test/fixtures');

const Auth    = require('./auth');
const Session = require('./modules/session');

describe('Advanced Auth Strategy', () => {

    let server;

    before(async () => {

        server = Hapi.Server();

        const plugins = Manifest.get('/register/plugins')
            .filter(entry => Auth.dependencies.includes(entry.plugin))
            .map((entry) => {

                entry.plugin = require(entry.plugin);

                return entry;
            });

        plugins.push(Auth);

        await server.register(plugins);
        await server.start();
        await Fixtures.Db.removeAllData();

        server.route({
            method: 'GET',
            path: '/',
            options: {
                auth: false
            },
            handler: async function (request, h) {

                try {
                    await request.server.auth.test('advanced', request);

                    return { isValid: true };
                } catch (err) {
                    return { isValid: false };
                }
            }
        });
    });

    after(async () => {

        await Fixtures.Db.removeAllData();
        await server.stop();
    });

    it('should return as invalid without authentication provided', async () => {

        const request = {
            method: 'GET',
            url: '/'
        };
        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.isValid).to.equal(false);
    });

    it('should return as invalid when the authentication is fake', async () => {

        const sessionId = '000000000000000000000001';
        const sessionKey = '01010101-0101-0101-0101-010101010101';
        const request = {
            method: 'GET',
            url: '/',
            headers: {
                authorization: Fixtures.Creds.authHeader(sessionId, sessionKey)
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.isValid).to.equal(false);
    });

    it('should return as valid when all is well', async () => {

        const session = await Session.create('000000000000000000000000', '127.0.0.1', 'Lab');

        const request = {
            method: 'GET',
            url: '/',
            headers: {
                authorization: Fixtures.Creds.authHeader(session._id, session.key)
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.isValid).to.equal(true);
    });
});
