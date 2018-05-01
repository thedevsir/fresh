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

const Admin = require('../admin-manage');
const User  = require('../../user');

const Admins = require('./routes');

let server;
let rootCredentials;

before(async () => {

    server = Hapi.Server();

    const plugins = Manifest.get('/register/plugins')
        .filter(entry => Admins.dependencies.includes(entry.plugin))
        .map((entry) => {

            entry.plugin = require(entry.plugin);

            return entry;
        });

    plugins.push(Auth);
    plugins.push(Admins);

    await server.register(plugins);
    await server.start();
    await Fixtures.Db.removeAllData();

    [rootCredentials] = await Promise.all([
        Fixtures.Creds.createRootAdminUser(),
        Fixtures.Creds.createAdminUser('Ren Hoek', 'ren', 'baddog', 'ren@stimpy.show')
    ]);
});

after(async () => {

    await Fixtures.Db.removeAllData();
    await server.stop();
});

describe('GET /admins', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/admins',
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

describe('POST /admins', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/admins',
            credentials: rootCredentials
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

describe('GET /admins/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/admins/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const admin = await Admin.create('Steve');

        request.url = request.url.replace(/{id}/, admin._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Steve');
    });
});

describe('PUT /admins/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admins/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findByIdAndUpdate` misses', async () => {

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

        const admin = await Admin.create('Steve');

        request.url = request.url.replace(/{id}/, admin._id);
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

describe('DELETE /admins/{id}', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/admins/{id}',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findByIdAndDelete` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const admin = await Admin.create('Steve');

        request.url = request.url.replace(/{id}/, admin._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.message).to.match(/success/i);
    });
});

describe('PUT /admins/{id}/groups', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admins/{id}/groups',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findByIdAndUpdate` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload =  {
            groups: {
                sales: 'Sales',
                support: 'Support'
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const admin = await Admin.create('Group Membership');

        request.url = request.url.replace(/{id}/, admin._id);
        request.payload =  {
            groups: {
                sales: 'Sales',
                support: 'Support'
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Group');
        expect(response.result.name.last).to.equal('Membership');
        expect(response.result.groups).to.be.an.object();
        expect(response.result.groups.sales).to.equal('Sales');
        expect(response.result.groups.support).to.equal('Support');
    });
});

describe('PUT /admins/{id}/permissions', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admins/{id}/permissions',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findByIdAndUpdate` misses', async () => {

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

        const admin = await Admin.create('Granular Permisssions');

        request.url = request.url.replace(/{id}/, admin._id);
        request.payload =  {
            permissions: {
                CAN_CREATE_ACCOUNTS: true,
                CAN_DELETE_ACCOUNTS: false
            }
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Granular');
        expect(response.result.name.last).to.equal('Permisssions');
        expect(response.result.permissions).to.be.an.object();
        expect(response.result.permissions.CAN_CREATE_ACCOUNTS).to.be.true();
        expect(response.result.permissions.CAN_DELETE_ACCOUNTS).to.be.false();
    });
});

describe('PUT /admins/{id}/user', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'PUT',
            url: '/admins/{id}/user',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');
        request.payload = {
            username: 'colbert'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 404 when `User.findByUsername` misses', async () => {

        const admin = await Admin.create('Stephen Colbert');

        request.url = request.url.replace(/{id}/, admin._id);
        request.payload = {
            username: 'colbert'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 409 when the user is linked to another admin', async () => {

        const { roles: { admin: adminA } } = await Fixtures.Creds.createAdminUser(
            'Trevor Noah', 'trevor', 'haha', 'trevor@daily.show'
        );

        const { user: userB } = await Fixtures.Creds.createAdminUser(
            'Jon Stewart', 'jon', 'stew', 'jon@daily.show'
        );

        request.url = request.url.replace(/{id}/, adminA._id);
        request.payload = {
            username: userB.username
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/linked to an admin/i);
    });

    it('should return HTTP 409 when the admin is currently linked to user', async () => {

        const user = await User.create('hay', 'st4ck', 'hay@stimpy.show');
        const { roles: { admin: admin } } = await Fixtures.Creds.createAdminUser(
            'Mr Horse', 'mrh', 'negh', 'mrh@stimpy.show'
        );

        request.url = request.url.replace(/{id}/, admin._id);
        request.payload = {
            username: user.username
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(409);
        expect(response.result.message).to.match(/linked to a user/i);
    });

    it('should return HTTP 200 when all is well', async () => {

        const admin = await Admin.create('Rand Rando');
        const user = await User.create('random', 'passw0rd', 'random@user.gov');

        request.url = request.url.replace(/{id}/, admin._id);
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

describe('DELETE /admins/{id}/user', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'DELETE',
            url: '/admins/{id}/user',
            credentials: rootCredentials
        };
    });

    it('should return HTTP 404 when `Admin.findById` misses', async () => {

        request.url = request.url.replace(/{id}/, '555555555555555555555555');

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when `admin.user` is not present', async () => {

        const admin = await Admin.create('Randomoni Randomie');

        request.url = request.url.replace(/{id}/, admin._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result).to.be.an.object();
        expect(response.result.name).to.be.an.object();
        expect(response.result.name.first).to.equal('Randomoni');
        expect(response.result.name.last).to.equal('Randomie');
    });

    it('should return HTTP 404 when `User.findById` misses', async () => {

        const { roles: { admin: admin }, user } = await Fixtures.Creds.createAdminUser(
            'Lil Horse', 'lilh', 'negh', 'lilh@stimpy.show'
        );

        await User.findByIdAndDelete(user._id);

        request.url = request.url.replace(/{id}/, admin._id);

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(404);
        expect(response.result.message).to.match(/not found/i);
    });

    it('should return HTTP 200 when all is good', async () => {

        const { roles: { admin: admin }, user } = await Fixtures.Creds.createAdminUser(
            'Jr Horse', 'jrh', 'negh', 'jrh@stimpy.show'
        );

        request.url = request.url.replace(/{id}/, admin._id);

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
        expect(user_.roles.admin).to.not.exist();
    });
});
