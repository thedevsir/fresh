'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../preware');

const User = require('./user');
const Admin = require('../admin-manage');
const Account = require('../account');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/users/my',
        options: {
            tags: ['api', 'user'],
            auth: {
                scope: ['admin', 'account']
            }
        },
        handler: async function (request, h) {

            const id = request.auth.credentials.user._id;
            const fields = User.fieldsAdapter('username email roles');

            return await User.findById(id, fields);
        }
    });

    server.route({
        method: 'PUT',
        path: '/users/my',
        options: {
            tags: ['api', 'user'],
            auth: {
                scope: ['admin', 'account']
            },
            validate: {
                payload: {
                    username: Joi.string().token().lowercase().required(),
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [
                Preware.requireNotRootUser,
                {
                    assign: 'usernameCheck',
                    method: async function (request, h) {

                        const conditions = {
                            username: request.payload.username,
                            _id: { $ne: request.auth.credentials.user._id }
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
                            _id: { $ne: request.auth.credentials.user._id }
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

            const userId = `${request.auth.credentials.user._id}`;
            const updateUser = {
                $set: {
                    username: request.payload.username,
                    email: request.payload.email
                }
            };
            const findOptions = {
                fields: User.fieldsAdapter('username email roles')
            };
            const queryByUserId = {
                'user.id': userId
            };
            const updateRole = {
                $set: {
                    'user.name': request.payload.username
                }
            };
            const [user] = await Promise.all([
                User.findByIdAndUpdate(userId, updateUser, findOptions),
                Account.findOneAndUpdate(queryByUserId, updateRole),
                Admin.findOneAndUpdate(queryByUserId, updateRole)
            ]);

            return user;
        }
    });

    server.route({
        method: 'PUT',
        path: '/users/my/password',
        options: {
            tags: ['api', 'user'],
            auth: {
                scope: ['admin', 'account']
            },
            validate: {
                payload: {
                    password: Joi.string().required()
                }
            },
            pre: [
                Preware.requireNotRootUser
            ]
        },
        handler: async function (request, h) {

            const userId = `${request.auth.credentials.user._id}`;
            const password = await User.generatePasswordHash(request.payload.password);
            const update = {
                $set: {
                    password: password.hash
                }
            };
            const findOptions = {
                fields: User.fieldsAdapter('username email')
            };

            return await User.findByIdAndUpdate(userId, update, findOptions);
        }
    });
};

module.exports = {
    name: 'api-users',
    dependencies: [
        'auth',
        'hapi-auth-basic',
        'hapi-mongo-models'
    ],
    register
};
