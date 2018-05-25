'use strict';
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Config   = require('../../../config');
const Fixtures = require('../../../test/fixtures');

const Admin      = require('./admin-manage');
const User       = require('../user');
const AdminGroup = require('../admin-group');

const config = Config.get('/hapiMongoModels/mongodb');

describe('Admin Model', () => {

    before(async () => {

        await Admin.connect(config.connection, config.options);
        await Fixtures.Db.removeAllData();
    });

    after(async () => {

        await Fixtures.Db.removeAllData();

        Admin.disconnect();
    });

    it('should parse names into name fields', () => {

        const justFirst = Admin.nameAdapter('Steve');

        expect(justFirst).to.be.an.object();
        expect(justFirst.first).to.equal('Steve');
        expect(justFirst.last).to.equal('');

        const firstAndLast = Admin.nameAdapter('Ren Höek');

        expect(firstAndLast).to.be.an.object();
        expect(firstAndLast.first).to.equal('Ren');
        expect(firstAndLast.last).to.equal('Höek');
    });

    it('should parse returns a full name', async () => {

        const admin = await Admin.create('Stan');
        let name = admin.fullName();

        expect(name).to.equal('Stan');

        admin.name = Admin.nameAdapter('Ren Höek');

        name = admin.fullName();

        expect(name).to.equal('Ren Höek');
    });

    it('should return a new instance when create succeeds', async () => {

        const admin = await Admin.create('Ren Höek');

        expect(admin).to.be.an.instanceOf(Admin);
    });

    it('should return an instance when finding by username', async () => {

        const document = new Admin({
            name: Admin.nameAdapter('Stimpson J Cat'),
            user: {
                id: '95EP150D35',
                name: 'stimpy'
            }
        });

        await Admin.insertOne(document);

        const account = await Admin.findByUsername('stimpy');

        expect(account).to.be.an.instanceOf(Admin);
    });

    it('should return false when checking for membership when groups are missing', async () => {

        const admin = await Admin.create('Ren Höek');

        expect(admin.isMemberOf('sales')).to.equal(false);
    });

    it('should return false when permissions are missing', async () => {

        const admin = await Admin.create('Ren Höek');
        const hasPermission = await admin.hasPermissionTo('SPACE_MADNESS');

        expect(hasPermission).to.equal(false);
    });

    it('should return boolean values when the permission exists on the admin', async () => {

        const admin = new Admin({
            name: Admin.nameAdapter('Ren Höek'),
            permissions: {
                SPACE_MADNESS: true,
                UNTAMED_WORLD: false
            }
        });
        const hasPermission = await admin.hasPermissionTo('SPACE_MADNESS');

        expect(hasPermission).to.equal(true);
    });

    it('should return boolean values when permission exits on the admin group', async () => {

        // create groups

        const salesGroup = new AdminGroup({
            _id: 'sales',
            name: 'Sales',
            permissions: {
                UNTAMED_WORLD: false,
                WORLD_UNTAMED: true
            }
        });
        const supportGroup = new AdminGroup({
            _id: 'support',
            name: 'Support',
            permissions: {
                SPACE_MADNESS: true,
                MADNESS_SPACE: false
            }
        });

        await AdminGroup.insertMany([salesGroup, supportGroup]);

        // admin without group membership

        const documentA = new Admin({
            name: Admin.nameAdapter('Ren Höek')
        });
        const testA1 = await documentA.hasPermissionTo('SPACE_MADNESS');

        expect(testA1).to.equal(false);

        const testA2 = await documentA.hasPermissionTo('UNTAMED_WORLD');

        expect(testA2).to.equal(false);

        // admin with group membership

        const documentB = new Admin({
            name: Admin.nameAdapter('Ren B Höek'),
            groups: {
                sales: 'Sales',
                support: 'Support'
            }
        });

        const testB1 = await documentB.hasPermissionTo('SPACE_MADNESS');

        expect(testB1).to.equal(true);

        const testB2 = await documentB.hasPermissionTo('UNTAMED_WORLD');

        expect(testB2).to.equal(false);
    });

    it('should link and unlink users', async () => {

        let admin = await Admin.create('Guinea Pig');
        const user = await User.create('guineapig', 'wheel', 'wood@chips.gov');

        expect(admin.user).to.not.exist();

        admin = await admin.linkUser(`${user._id}`, user.username);

        expect(admin.user).to.be.an.object();

        admin = await admin.unlinkUser();

        expect(admin.user).to.not.exist();
    });
});
