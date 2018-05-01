'use strict';
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Config   = require('../../../config');
const Fixtures = require('../../../test/fixtures');

const Account = require('./account');
const User    = require('../user');

const config = Config.get('/hapiMongoModels/mongodb');

describe('Account Model', () => {

    before(async () => {

        await Account.connect(config.connection, config.options);
        await Fixtures.Db.removeAllData();
    });

    after(async () => {

        await Fixtures.Db.removeAllData();

        Account.disconnect();
    });

    it('should parse names into name fields', () => {

        const justFirst = Account.nameAdapter('Steve');

        expect(justFirst).to.be.an.object();
        expect(justFirst.first).to.equal('Steve');
        expect(justFirst.last).to.equal('');

        const firstAndLast = Account.nameAdapter('Ren Höek');

        expect(firstAndLast).to.be.an.object();
        expect(firstAndLast.first).to.equal('Ren');
        expect(firstAndLast.last).to.equal('Höek');
    });

    it('should parse returns a full name', async () => {

        const account = await Account.create('Stan');
        let name = account.fullName();

        expect(name).to.equal('Stan');

        account.name = Account.nameAdapter('Ren Höek');

        name = account.fullName();

        expect(name).to.equal('Ren Höek');
    });

    it('should return an instance when finding by username', async () => {

        const document = new Account({
            name: Account.nameAdapter('Stimpson J Cat'),
            user: {
                id: '95EP150D35',
                name: 'stimpy'
            }
        });

        await Account.insertOne(document);

        const account = await Account.findByUsername('stimpy');

        expect(account).to.be.an.instanceOf(Account);
    });

    it('should return a new instance when create succeeds', async () => {

        const account = await Account.create('Ren Höek');

        expect(account).to.be.an.instanceOf(Account);
    });

    it('should link and unlink users', async () => {

        let account = await Account.create('Guinea Pig');
        const user = await User.create('guineapig', 'wheel', 'wood@chips.gov');

        expect(account.user).to.not.exist();

        account = await account.linkUser(`${user._id}`, user.username);

        expect(account.user).to.be.an.object();

        account = await account.unlinkUser();

        expect(account.user).to.not.exist();
    });
});
