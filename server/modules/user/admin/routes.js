'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../../preware');

const User    = require('../user');
const Admin   = require('../../admin-manage');
const Account = require('../../account');
const Session = require('../../session');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/users',
        options: {
            tags: ['api', 'users'],
            description: 'Get a paginated list of all users. [Root Scope]',
            notes: 'Get a paginated list of all users.',
            auth: {
                scope: 'admin'
            },
            validate: {
                query: {
                    sort: Joi.string().default('_id'),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const query = {};
            const limit = request.query.limit;
            const page = request.query.page;
            const options = {
                sort: User.sortAdapter(request.query.sort)
            };

            return await User.pagedFind(query, page, limit, options);
        }
    });

    server.route({
        method: 'POST',
        path: '/users',
        options: {
            tags: ['api', 'users'],
            description: 'Create a new user. [Root Scope]',
            notes: 'Create a new user. This does not map this user to an account.',
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    username: Joi.string().token().lowercase().required(),
                    password: Joi.string().required(),
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root'),
                {
                    assign: 'usernameCheck',
                    method: async function (request, h) {

                        const user = await User.findByUsername(request.payload.username);

                        if (user) {
                            throw Boom.conflict('Username already in use.');
                        }

                        return h.continue;
                    }
                }, {
                    assign: 'emailCheck',
                    method: async function (request, h) {

                        const user = await User.findByEmail(request.payload.email);

                        if (user) {
                            throw Boom.conflict('Email already in use.');
                        }

                        return h.continue;
                    }
                }
            ]
        },
        handler: async function (request, h) {

            const username = request.payload.username;
            const password = request.payload.password;
            const email = request.payload.email;

            return await User.create(username, password, email);
        }
    });

    server.route({
        method: 'GET',
        path: '/users/{id}',
        options: {
            tags: ['api', 'users'],
            description: 'Get a user by ID. [Root Scope]',
            notes: 'Get a user by ID.',
            validate: {
                params: {
                    id : Joi.string().required().description('the id to get the user')
                }
            },
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const user = await User.findById(request.params.id);

            if (!user) {
                throw Boom.notFound('User not found.');
            }

            return user;
        }
    });

    server.route({
        method: 'PUT',
        path: '/users/{id}',
        options: {
            tags: ['api', 'users'],
            description: 'Update a user by ID. [Root Scope]',
            notes: 'Update a user by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('000000000000000000000000')
                },
                payload: {
                    isActive: Joi.boolean().required(),
                    username: Joi.string().token().lowercase().required(),
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root'),
                {
                    assign: 'usernameCheck',
                    method: async function (request, h) {

                        const conditions = {
                            username: request.payload.username,
                            _id: { $ne: User._idClass(request.params.id) }
                        };
                        const user = await User.findOne(conditions);

                        if (user) {
                            throw Boom.conflict('Username already in use.');
                        }

                        return h.continue;
                    }
                }, {
                    assign: 'emailCheck',
                    method: async function (request, h) {

                        const conditions = {
                            email: request.payload.email,
                            _id: { $ne: User._idClass(request.params.id) }
                        };
                        const user = await User.findOne(conditions);

                        if (user) {
                            throw Boom.conflict('Email already in use.');
                        }

                        return h.continue;
                    }
                }
            ]
        },
        handler: async function (request, h) {

            const updateUser = {
                $set: {
                    isActive: request.payload.isActive,
                    username: request.payload.username,
                    email: request.payload.email
                }
            };
            const queryByUserId = {
                'user.id': request.params.id
            };
            const updateRole = {
                $set: {
                    'user.name': request.payload.username
                }
            };
            const user = await User.findByIdAndUpdate(request.params.id, updateUser);

            if (!user) {
                throw Boom.notFound('User not found.');
            }

            await Promise.all([
                Account.findOneAndUpdate(queryByUserId, updateRole),
                Admin.findOneAndUpdate(queryByUserId, updateRole),
                Session.deleteUserSessions(request.params.id)
            ]);

            return user;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/users/{id}',
        options: {
            tags: ['api', 'users'],
            description: 'Delete a user by ID. [Root Scope]',
            notes: 'Delete a user by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('000000000000000000000000')
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const user = await User.findByIdAndDelete(request.params.id);

            if (!user) {
                throw Boom.notFound('User not found.');
            }

            await Session.deleteUserSessions(request.params.id);

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'PUT',
        path: '/users/{id}/password',
        options: {
            tags: ['api', 'users'],
            description: 'Update a user password. [Root Scope]',
            notes: 'Update a user password.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('000000000000000000000000')
                },
                payload: {
                    password: Joi.string().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const password = await User.generatePasswordHash(request.payload.password);
            const update = {
                $set: {
                    password: password.hash
                }
            };
            const user = await User.findByIdAndUpdate(request.params.id, update);

            if (!user) {
                throw Boom.notFound('User not found.');
            }

            return user;
        }
    });
};

module.exports = {
    name: 'api-admin-users',
    dependencies: [
        'auth',
        'hapi-auth-jwt2',
        'hapi-mongo-models'
    ],
    register
};
