'use strict';
const { join } = require('path');

const Confidence = require('confidence');
const Dotenv = require('dotenv');

Dotenv.config({ silent: true });

const criteria = {
    env: process.env.NODE_ENV
};

const config = {
    $meta: 'This file configures the plot device.',
    projectName: 'Fresh',
    port: {
        web: {
            $filter: 'env',
            test: 9090,
            production: process.env.PORT,
            $default: 9000
        }
    },
    publicPath: {
        $filter: 'env',
        production: process.env.PUBLIC_PATH,
        $default: join(process.cwd(), 'public')
    },
    authAttempts: {
        forIp: 50,
        forIpAndUser: 7
    },
    hapiMongoModels: {
        mongodb: {
            connection: {
                uri: {
                    $filter: 'env',
                    production: process.env.MONGODB_URI,
                    $default: 'mongodb://localhost:27017/'
                },
                db: {
                    $filter: 'env',
                    production: process.env.MONGODB_DB_NAME,
                    test: 'fresh-test',
                    $default: 'fresh'
                }
            }
        },
        autoIndex: true
    },
    nodemailer: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: 'no-one@your-service',
            pass: process.env.SMTP_PASSWORD
        }
    },
    // TODO: configure names and addresses
    system: {
        fromAddress: {
            name: 'Fresh',
            address: 'no-one@your-service'
        },
        toAddress: {
            name: 'Fresh',
            address: 'no-one@your-service'
        }
    }
};

const store = new Confidence.Store(config);

exports.get = function (key) {

    return store.get(key, criteria);
};

exports.meta = function (key) {

    return store.meta(key, criteria);
};
