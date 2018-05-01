'use strict';
const Hapi = require('hapi');
const Sinon = require('sinon');
const FormData = require('form-data');
// TODO: stream-to-promise package use any-promise package that cause memory leak
const StreamToPromise = require('stream-to-promise');
const Del = require('del');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    it
} = exports.lab = require('lab').script();

const { createModelId } = require('../../../test/utils');

const Manifest = require('../../../manifest');
const Fixtures = require('../../../test/fixtures');

const Auth = require('../../auth');

const Account = require('./account');

const Accounts = require('./routes');

let server;
let accountCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Accounts.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Accounts);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    accountCredentials = await Fixtures.Creds.createAccountUser('Stimpson Cat', 'stimpy', 'goodcat', 'stimpy@ren.show');
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /accounts/my', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/accounts/my',
            credentials: accountCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name.first).to.equal('Stimpson');
    });
});

describe('PUT /accounts/my', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/accounts/my',
            credentials: accountCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            name: {
                first: 'Stimpson',
                last: 'Cat'
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name.first).to.equal('Stimpson');
        expect(response.result.name.last).to.equal('Cat');
    });
});

// TODO: change path to /accounts/mine/avatar
describe('PUT /accounts/my/avatar', () => {

    let uploader;

    const _id = createModelId(Account);
    const avatar = '0000';

    const request = {
        method: 'PUT',
        url: `/accounts/my/avatar`,
        credentials: {
            roles: {
                account: { _id }
            }
        }
    };

    before(() => {

        uploader = Sinon.stub(server.plugins['@esforever/hapi-darwin'], 'uploader')
            .onFirstCall().rejects()
            .resolves({});
    });

    beforeEach(async () => {

        const form = new FormData();
        form.append('avatar', avatar);

        request.headers = form.getHeaders();
        request.payload = await StreamToPromise(form);
    });

    after(() => uploader.restore());

    it('should return HTTP 400 when `uploader` misses', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(uploader);
        Sinon.assert.calledWith(uploader.firstCall, avatar);

        expect(statusCode).to.equal(400);
        expect(result.message).to.match(/invalid file/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});

// TODO: change path to /accounts/mine/avatar
describe('DELETE /accounts/my/avatar', () => {

    let del;

    const _id = createModelId(Account);
    const request = {
        method: 'DELETE',
        url: `/accounts/my/avatar`,
        credentials: {
            roles: {
                account: { _id }
            }
        }
    };

    before(() => {

        del = Sinon.stub(Del, 'sync');
    });

    after(() => del.restore());

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(del);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});
