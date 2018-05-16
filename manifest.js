'use strict';
const Confidence = require('confidence');
const Config = require('./config');
const Pack = require('./package');
const Path = require('path');

const criteria = {
    env: process.env.NODE_ENV
};

const devPlugins = [
    {
        plugin: 'good',
        options: {
            reporters: {
                myConsoleReporter: [
                    {
                        module: 'good-squeeze',
                        name: 'Squeeze',
                        args: [{
                            error: '*',
                            log: '*',
                            request: '*',
                            response: '*'
                        }]
                    },
                    {
                        module: 'good-console',
                        args: [{
                            color: {
                                $filter: 'env',
                                production: false,
                                $default: true
                            }
                        }]
                    },
                    'stdout'
                ]
            }
        }
    },
    {
        plugin: 'inert'
    },
    {
        plugin: 'vision'
    },
    {
        plugin: 'hapi-swagger',
        options: {
            info: {
                title: `${Config.get('/projectName')} API Documentation`,
                version: Pack.version
            },
            grouping: 'tags'
        }
    },
    {
        plugin: 'lout'
    }
];

const prodPlugins = [];

const commonPlugins = [
    {
        plugin: 'hapi-darwin'
    },
    {
        plugin: 'hapi-auth-jwt2'
    },
    {
        plugin: 'hapi-remote-address'
    },
    {
        plugin: 'hapi-mongo-models',
        options: {
            mongodb: Config.get('/hapiMongoModels/mongodb'),
            models: [
                Path.resolve(__dirname, './server/modules/account'),
                Path.resolve(__dirname, './server/modules/admin-group'),
                Path.resolve(__dirname, './server/modules/admin-manage'),
                Path.resolve(__dirname, './server/modules/login/auth-attempt'),
                Path.resolve(__dirname, './server/modules/session'),
                Path.resolve(__dirname, './server/modules/status'),
                Path.resolve(__dirname, './server/modules/user')
            ],
            autoIndex: Config.get('/hapiMongoModels/autoIndex')
        }
    },
    {
        plugin: './server/auth'
    },
    {
        plugin: './server/modules/account/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/admin-group/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/admin-manage/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/session/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/status/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/user/admin/routes',
        routes: {
            prefix: '/endpoint/v1/admin'
        }
    },
    {
        plugin: './server/modules/account/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/contact/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/main/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/login/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/logout/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/session/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/signup/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    },
    {
        plugin: './server/modules/user/routes',
        routes: {
            prefix: '/endpoint/v1'
        }
    }
];

const manifest = {
    $meta: 'This file defines the plot device.',
    server: {
        debug: {
            request: ['error']
        },
        routes: {
            files: { relativeTo: Config.get('/publicPath') },
            security: true
        },
        port: Config.get('/port/web')
    },
    register: {
        plugins: {
            $filter: 'env',
            $base: commonPlugins,
            production: prodPlugins,
            development: devPlugins,
            $default: []
        }
    }
};

const store = new Confidence.Store(manifest);

exports.get = function (key) {

    return store.get(key, criteria);
};

exports.meta = function (key) {

    return store.meta(key, criteria);
};
