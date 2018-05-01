'use strict';
const Account = require('../../server/modules/account');
const Admin = require('../../server/modules/admin');
const AdminGroup = require('../../server/modules/admin-group');
const Session = require('../../server/modules/session');
const Status = require('../../server/modules/status');
const User = require('../../server/modules/user');

class Db {
    static async removeAllData() {

        return await Promise.all([
            Account.deleteMany({}),
            Admin.deleteMany({}),
            AdminGroup.deleteMany({}),
            Session.deleteMany({}),
            Status.deleteMany({}),
            User.deleteMany({})
        ]);
    }
}

module.exports = Db;
