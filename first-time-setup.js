'use strict';
const MongoModels = require('mongo-models');
const Promptly = require('promptly');

const Account = require('./server/modules/account');
const Admin = require('./server/modules/admin-manage');
const AdminGroup = require('./server/modules/admin-group');
const AuthAttempt = require('./server/modules/login/auth-attempt');
const Session = require('./server/modules/session');
const Status = require('./server/modules/status');
const User = require('./server/modules/user');

const main = async function () {

    let options = {};

    // get mongodb connection info

    options = {
        default: 'mongodb://localhost:27017/'
    };
    const mongodbUri = await Promptly.prompt(`MongoDB URI: (${options.default})`, options);

    options = {
        default: 'fresh'
    };
    const mongodbName = await Promptly.prompt(`MongoDB name: (${options.default})`, options);

    // connect to db

    const db = await MongoModels.connect({ uri: mongodbUri, db: mongodbName });

    if (!db) {
        throw Error('Could not connect to MongoDB.');
    }

    // get root user creds

    const rootEmail = await Promptly.prompt('Root user email:');
    const rootPassword = await Promptly.password('Root user password:');

    // clear tables

    await Promise.all([
        Account.deleteMany({}),
        AdminGroup.deleteMany({}),
        Admin.deleteMany({}),
        AuthAttempt.deleteMany({}),
        Session.deleteMany({}),
        Status.deleteMany({}),
        User.deleteMany({})
    ]);

    // setup root group

    await AdminGroup.create('Root');

    // setup root admin and user

    await Admin.insertOne(new Admin({
        _id: Admin.ObjectId('111111111111111111111111'),
        groups: {
            root: 'Root'
        },
        name: {
            first: 'Root',
            last: 'Admin'
        },
        user: {
            id: '000000000000000000000000',
            name: 'root'
        }
    }));

    const passwordHash = await User.generatePasswordHash(rootPassword);

    await User.insertOne(new User({
        _id: User.ObjectId('000000000000000000000000'),
        email: rootEmail.toLowerCase(),
        password: passwordHash.hash,
        roles: {
            admin: {
                id: '111111111111111111111111',
                name: 'Root Admin'
            }
        },
        username: 'root'
    }));

    // all done

    MongoModels.disconnect();

    console.log('First time setup complete.');

    process.exit(0);
};

main().catch((err) => {

    console.log('First time setup failed.');
    console.error(err);

    MongoModels.disconnect();

    process.exit(1);
});
