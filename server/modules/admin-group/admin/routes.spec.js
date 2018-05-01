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

const AdminGroup = require('../admin-group');

const AdminGroups = require('./routes');

let server;
let rootCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => AdminGroups.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(AdminGroups);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    rootCredentials = await Fixtures.Creds.createRootAdminUser();
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /admin-groups', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/admin-groups',
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

describe('POST /admin-groups', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/admin-groups',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 200 when all is well', async () => {

        request.payload = {
            name: 'Sales'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.and.object();
        expect(response.result.name).to.be.equal('Sales');
    });
});

describe('GET /admin-groups/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/admin-groups/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `AdminGroup.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const adminGroup = await AdminGroup.create('Support');

        request.url = request.url.replace(/{id}/, adminGroup._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.equal('Support');
    });
});

describe('PUT /admin-groups/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admin-groups/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `AdminGroup.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload =  {
            name: 'Wrecking Crew'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const adminGroup = await AdminGroup.create('Shipping');

        request.url = request.url.replace(/{id}/, adminGroup._id);
        request.payload =  {
            name: 'Fulfillment'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.equal('Fulfillment');
    });
});

describe('DELETE /admin-groups/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/admin-groups/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `AdminGroup.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const adminGroup = await AdminGroup.create('Steve');

        request.url = request.url.replace(/{id}/, adminGroup._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});

describe('PUT /admin-groups/{id}/permissions', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admin-groups/{id}/permissions',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `AdminGroup.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload =  {
            permissions: {
                CAN_CREATE_ACCOUNTS: true,
                CAN_DELETE_ACCOUNTS: false
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const adminGroup = await AdminGroup.create('Executive');

        request.url = request.url.replace(/{id}/, adminGroup._id);
        request.payload =  {
            permissions: {
                CAN_CREATE_ACCOUNTS: true,
                CAN_DELETE_ACCOUNTS: false
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.equal('Executive');
        expect(response.result.permissions).to.be.an.object();
        expect(response.result.permissions.CAN_CREATE_ACCOUNTS).to.be.true();
        expect(response.result.permissions.CAN_DELETE_ACCOUNTS).to.be.false();
    });
});
