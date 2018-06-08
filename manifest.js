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
            securityDefinitions: {
                'jwt': {
                    'type': 'apiKey',
                    'name': 'Authorization',
                    'in': 'header'
                }
            },
            security: [{ 'jwt': [] }],
            info: {
                title: `${Config.get('/projectName')} API Documentation`,
                version: Pack.version,
                description: `Check out the **[Github Wiki](https://github.com/escommunity/fresh/wiki)** for common questions and how-tos.

A few key things to be aware of:
                The core User model found in the /endpoint/v1/users/ endpoints have these basic fields: _id, email, username, password, isActive, roles, timeCreated.
                
This framework decorates the core User models with additional role specific fields via mapping it to 1 or more roles. Fresh comes with 2 default roles, customers and admins.

/endpoint/v1/accounts/ is the "customer account" role.
                When users sign up via /endpoint/v1/signup the framework automatically creates a new User and a new Account (aka customer role) and links the two. Users can have multiple roles but each new instance of a role model can only be mapped to one user.
                The customer Account role adds these additional fields for users who are customers: "name" (first, last), "notes", and "status". "Notes" allows admins to add notes to accounts.

/endpoint/v1/admins/ is the "admin" role.
                This role contains a "name" (first, last), "permissions", and "groups" property allowing you to assign multiple admin-groups. The first admin-group is "root" which is allowed to perform the "Root Scope" actions.

More details on [Users, Roles & Groups](https://github.com/escommunity/fresh/wiki/Users,-Roles-&-Groups)
                More details on [Admin & Admin Group Permissions](https://github.com/escommunity/fresh/wiki/Admin-&-Admin-Group-Permissions)`
            },
            grouping: 'tags',
            sortTags: 'name',
            tags: [
                {
                    name: 'accounts',
                    description: 'endpoints to interact with customer role.'
                }, {
                    name: 'admin-groups',
                    description: 'endpoints to interact with admin groups.'
                }, {
                    name: 'admins',
                    description: 'endpoints to interact with admin roles.'
                }, {
                    name: 'contact'
                }, {
                    name: 'login',
                    description: 'endpoints for login flow.'
                }, {
                    name: 'logout'
                }, {
                    name: 'main'
                }, {
                    name: 'session',
                    description: 'endpoints to interact with user sessions.'
                }, {
                    name: 'signup'
                }, {
                    name: 'statuses',
                    description: 'endpoints to interact with customer role (account) statuses.'
                }, {
                    name: 'users',
                    description: 'endpoints to interact with users (outside of roles)'
                }
            ]
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
            validate: {
                failAction: (request, h, err) => {

                    if (err && err.isBoom && err.output.statusCode === 400) {
                        return err;
                    }
                }
            },
            files: { relativeTo: Config.get('/publicPath') },
            cors: {
                origin: ['*'],
                maxAge: 86400,
                headers: ['Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
                credentials: true
            },
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
