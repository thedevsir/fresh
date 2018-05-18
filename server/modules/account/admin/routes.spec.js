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

const { createModelId } = require('../../../../test/utils');

const Manifest = require('../../../../manifest');
const Fixtures = require('../../../../test/fixtures');

const Auth = require('../../../auth');

const Account = require('../../account');
const User    = require('../../user');
const Status  = require('../../status');

const Accounts = require('./routes');

let server;
let rootCredentials;
let adminCredentials;

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

    [rootCredentials, adminCredentials] = await Promise.all([
        Fixtures.Creds.createRootAdminUser(),
        Fixtures.Creds.createAdminUser('Ren Hoek', 'ren', 'baddog', 'ren@stimpy.show'),
        Fixtures.Creds.createAccountUser('Stimpson Cat', 'stimpy', 'goodcat', 'stimpy@ren.show')
    ]);
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /accounts', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/accounts',
            credentials: adminCredentials
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

describe('GET /accounts/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/accounts/{id}',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Account.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const account = await Account.create('Steve');

        request.url = request.url.replace(/{id}/, account._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Steve');
    });
});

describe('POST /accounts', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/accounts',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            name: 'Steve'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.and.object();
        expect(response.result.name).to.be.and.object();
        expect(response.result.name.first).to.equal('Steve');
    });
});

describe('POST /accounts/{id}/notes', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/accounts/{id}/notes',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Account.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            data: 'Super duper note!'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const account = await Account.create('Here Gone');

        request.url = request.url.replace(/{id}/, account._id);
        request.payload = {
            data: 'Super duper note!'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name.first).to.equal('Here');
        expect(response.result.name.last).to.equal('Gone');
        expect(response.result.notes.length).to.be.greaterThan(0);
    });
});

describe('POST /accounts/{id}/status', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/accounts/{id}/status',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Status.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            status: 'poison-pill'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 404 when `Account.findByIdAndUpdate` misses', async () => {

        const status = await Status.create('Account', 'Sad');

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            status: status._id
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const status = await Status.create('Account', 'Happy');
        const account = await Account.create('Here Now');

        request.url = request.url.replace(/{id}/, account._id);
        request.payload = {
            status: status._id
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name.first).to.equal('Here');
        expect(response.result.name.last).to.equal('Now');
        expect(response.result.status).to.be.an.object();
        expect(response.result.status.current).to.be.an.object();
        expect(response.result.status.current.id).to.equal(`${status._id}`);
        expect(response.result.status.current.name).to.equal('Happy');
        expect(response.result.status.log).to.be.an.array();
        expect(response.result.status.log.length).to.be.greaterThan(0);
    });
});

describe('PUT /accounts/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/accounts/{id}',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Account.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload =  {
            name: {
                first: 'Stephen',
                last: 'Colbert'
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const account = await Account.create('Steve');

        request.url = request.url.replace(/{id}/, account._id);
        request.payload =  {
            name: {
                first: 'Stephen',
                last: 'Colbert'
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Stephen');
        expect(response.result.name.last).to.equal('Colbert');
    });
});

describe('PUT /accounts/{id}/user', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/accounts/{id}/user',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Account.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            username: 'colbert'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 404 when `User.findByUsername` misses', async () => {

        const account = await Account.create('Stephen Colbert');

        request.url = request.url.replace(/{id}/, account._id);
        request.payload = {
            username: 'colbert'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 409 when the user is linked to another account', async () => {

        const { roles: { account: accountA } } = await Fixtures.Creds.createAccountUser(
            'Trevor Noah', 'trevor', 'haha', 'trevor@daily.show'
        );

        const { user: userB } = await Fixtures.Creds.createAccountUser(
            'Jon Stewart', 'jon', 'stew', 'jon@daily.show'
        );

        request.url = request.url.replace(/{id}/, accountA._id);
        request.payload = {
            username: userB.username
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/linked to an account/i);
    });

    it('should return HTTP 409 when the account is currently linked to user', async () => {

        const { roles: { account: account } } = await Fixtures.Creds.createAccountUser(
            'Mr Horse', 'mrh', 'negh', 'mrh@stimpy.show'
        );

        request.url = request.url.replace(/{id}/, account._id);
        request.payload = {
            username: 'ren'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/linked to a user/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const account = await Account.create('Rand Rando');
        const user = await User.create('random', 'passw0rd', 'random@user.gov');

        request.url = request.url.replace(/{id}/, account._id);
        request.payload = {
            username: user.username
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Rand');
        expect(response.result.name.last).to.equal('Rando');
        expect(response.result.user).to.be.an.object();
        expect(response.result.user.name).to.equal('random');
    });
});

describe('PUT /accounts/{id}/avatar', () => {

    let findById;
    let uploader;

    const _id = createModelId(Account);
    const avatar = '0000';

    const request = {
        method: 'PUT',
        url: `/accounts/${_id}/avatar`,
        credentials: { scope: 'admin' }
    };

    before(() => {

        findById = Sinon.stub(Account, 'findById')
            .onFirstCall().resolves(undefined)
            .resolves({});
        uploader = Sinon.stub(server.plugins['hapi-darwin'], 'uploader')
            .onFirstCall().rejects()
            .resolves({});
    });

    beforeEach(async () => {

        const form = new FormData();
        form.append('avatar', avatar);

        request.headers = form.getHeaders();
        request.payload = await StreamToPromise(form);
    });

    after(() => {

        findById.restore();
        uploader.restore();
    });

    it('should return HTTP 404 when `Account.findById` misses', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(findById);
        Sinon.assert.calledWithExactly(findById.firstCall, `${_id}`);

        expect(statusCode).to.equal(404);
        expect(result.message).to.match(/not found/i);
    });

    it('should return HTTP 400 when `uploader` misses', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(uploader);
        Sinon.assert.calledWith(uploader, avatar);

        expect(statusCode).to.equal(400);
        expect(result.message).to.match(/invalid file/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});

describe('DELETE /accounts/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/accounts/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Account.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const account = await Account.create('Steve');

        request.url = request.url.replace(/{id}/, account._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});

describe('DELETE /accounts/{id}/user', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/accounts/{id}/user',
            credentials: adminCredentials
        };
    });

    it('should return HTTP 404 when `Account.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when `account.user` is not present', async () => {

        const account = await Account.create('Randomoni Randomie');

        request.url = request.url.replace(/{id}/, account._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Randomoni');
        expect(response.result.name.last).to.equal('Randomie');
    });

    it('should return HTTP 404 when `User.findById` misses', async () => {

        const { roles: { account: account }, user } = await Fixtures.Creds.createAccountUser(
            'Lil Horse', 'lilh', 'negh', 'lilh@stimpy.show'
        );

        await User.findByIdAndDelete(user._id);

        request.url = request.url.replace(/{id}/, account._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is good', async () => {

        const { roles: { account: account }, user } = await Fixtures.Creds.createAccountUser(
            'Jr Horse', 'jrh', 'negh', 'jrh@stimpy.show'
        );

        request.url = request.url.replace(/{id}/, account._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Jr');
        expect(response.result.name.last).to.equal('Horse');
        expect(response.result.user).to.not.exist();

        const user_ = await User.findByIdAndDelete(user._id);

        expect(user_).to.be.an.object();
        expect(user_.roles).to.be.an.object();
        expect(user_.roles.account).to.not.exist();
    });
});

describe('DELETE /accounts/{id}/avatar', () => {

    let findById;
    let del;

    const _id = createModelId(Account);
    const request = {
        method: 'DELETE',
        url: `/accounts/${_id}/avatar`,
        credentials: { scope: 'admin' }
    };

    before(() => {

        findById = Sinon.stub(Account, 'findById')
            .onFirstCall().resolves(undefined)
            .resolves({});
        del = Sinon.stub(Del, 'sync');
    });

    after(() => {

        findById.restore();
        del.restore();
    });

    it('should return HTTP 404 when `Account.findById` misses', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(findById);
        Sinon.assert.calledWithExactly(findById.firstCall, `${_id}`);

        expect(statusCode).to.equal(404);
        expect(result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const { statusCode, result } = await server.inject(request);

        Sinon.assert.calledOnce(del);

        expect(statusCode).to.equal(200);
        expect(result.message).to.match(/success/i);
    });
});
