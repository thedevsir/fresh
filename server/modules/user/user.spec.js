'use strict';
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Config   = require('../../../config');
const Fixtures = require('../../../test/fixtures');

const User = require('./user');
const Account = require('../account');
const Admin = require('../admin-manage');

const config = Config.get('/hapiMongoModels/mongodb');

describe('User Model', () => {

    before(async () => {

        await User.connect(config.connection, config.options);
        await Fixtures.Db.removeAllData();
    });

    after(async () => {

        await Fixtures.Db.removeAllData();

        User.disconnect();
    });

    it('should return a new instance when create succeeds', async () => {

        const user = await User.create('ren', 'bighouseblues', 'ren@stimpy.show');

        expect(user).to.be.an.instanceOf(User);
    });

    it('should return undefined when finding by credentials user misses', async () => {

        const user = await User.findByCredentials('steve', '123456');

        expect(user).to.be.undefined();
    });

    it('should return undefined when finding by credentials user hits and password match misses', async () => {

        const user = await User.findByCredentials('ren', '123456');

        expect(user).to.be.undefined();
    });

    it('should return an instance when finding by credentials user hits and password match hits', async () => {

        const withUsername = await User.findByCredentials('ren', 'bighouseblues');

        expect(withUsername).to.be.an.instanceOf(User);

        const withEmail = await User.findByCredentials('ren@stimpy.show', 'bighouseblues');

        expect(withEmail).to.be.an.instanceOf(User);
    });

    it('should return an instance when finding by email', async () => {

        const user = await User.findByEmail('ren@stimpy.show');

        expect(user).to.be.an.instanceOf(User);
    });

    it('should return an instance when finding by username', async () => {

        const user = await User.findByUsername('ren');

        expect(user).to.be.an.instanceOf(User);
    });

    it('should create a password hash combination', async () => {

        const password = '3l1t3f00&&b4r';
        const result = await User.generatePasswordHash(password);

        expect(result).to.be.an.object();
        expect(result.password).to.equal(password);
        expect(result.hash).to.be.a.string();
    });

    it('should return boolean values when checking if a user can play roles', async () => {

        let user;

        user = await User.findByUsername('ren');
        user = await User.findByIdAndUpdate(user._id, {
            $set: {
                roles: {
                    account: {
                        id: '555555555555555555555555',
                        name: 'Ren Hoek'
                    }
                }
            }
        });

        expect(user.canPlayRole('admin')).to.equal(false);
        expect(user.canPlayRole('account')).to.equal(true);
    });

    it('should hydrate roles when both admin and account are missing', async () => {

        let user;

        user = await User.findByUsername('ren');
        user = await User.findByIdAndUpdate(user._id, {
            $set: {
                roles: {}
            }
        });

        await user.hydrateRoles();

        expect(user._roles).to.be.an.object();
        expect(Object.keys(user._roles)).to.have.length(0);
    });

    it('should hydrate roles when an account role is present', async () => {

        const account = await Account.create('Run Hoek');

        let user;

        user = await User.findByUsername('ren');
        user = await User.findByIdAndUpdate(user._id, {
            $set: {
                roles: {
                    account: {
                        id: `${account._id}`,
                        name: account.fullName()
                    }
                }
            }
        });

        await user.hydrateRoles();

        expect(user._roles).to.be.an.object();
        expect(Object.keys(user._roles)).to.have.length(1);
        expect(user._roles.account).to.be.an.instanceOf(Account);
    });

    it('should hydrate roles when an admin role is present', async () => {

        const admin = await Admin.create('Run Hoek');

        let user;

        user = await User.findByUsername('ren');
        user = await User.findByIdAndUpdate(user._id, {
            $set: {
                roles: {
                    admin: {
                        id: `${admin._id}`,
                        name: admin.fullName()
                    }
                }
            }
        });

        await user.hydrateRoles();

        expect(user._roles).to.be.an.object();
        expect(Object.keys(user._roles)).to.have.length(1);
        expect(user._roles.admin).to.be.an.instanceOf(Admin);
    });

    it('should link and unlink roles', async () => {

        let user = await User.create('guineapig', 'wheel', 'wood@chips.gov');
        const [admin, account] = await Promise.all([
            Admin.create('Guinea Pig'),
            Account.create('Guinea Pig')
        ]);

        expect(user.roles.admin).to.not.exist();
        expect(user.roles.account).to.not.exist();

        user = await user.linkAdmin(`${admin._id}`, admin.fullName());
        user = await user.linkAccount(`${account._id}`, account.fullName());

        expect(user.roles.admin).to.be.an.object();
        expect(user.roles.account).to.be.an.object();

        user = await user.unlinkAdmin();
        user = await user.unlinkAccount();

        expect(user.roles.admin).to.not.exist();
        expect(user.roles.account).to.not.exist();
    });

    it('should hydrate roles and cache the results for subsequent access', async () => {

        const user = await User.findByUsername('ren');

        await user.hydrateRoles();

        expect(user._roles).to.be.an.object();
        expect(Object.keys(user._roles)).to.have.length(1);
        expect(user._roles.admin).to.be.an.instanceOf(Admin);

        const roles = await user.hydrateRoles();

        expect(user._roles).to.equal(roles);
    });
});
