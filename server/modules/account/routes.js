'use strict';
const { join } = require('path');
const Joi = require('joi');
const Boom = require('boom');
const Del = require('del');

const Account = require('./account');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/accounts/my',
        options: {
            tags: ['api', 'accounts'],
            description: 'Get the logged-in user\'s account details. [User Account Scope]',
            notes: 'Get the logged-in user\'s account details.',
            auth: {
                scope: 'account'
            }
        },
        handler: async function (request, h) {

            const id = request.auth.credentials.roles.account._id;
            const fields = Account.fieldsAdapter('user name timeCreated');

            return await Account.findById(id, fields);
        }
    });

    server.route({
        method: 'PUT',
        path: '/accounts/my',
        options: {
            tags: ['api', 'accounts'],
            description: 'Update the logged-in user\'s account details. [User Account Scope]',
            notes: 'Update your account details.',
            auth: {
                scope: 'account'
            },
            validate: {
                payload: {
                    name: Joi.object({
                        first: Joi.string().required(),
                        last: Joi.string().required()
                    }).required()
                }
            }
        },
        handler: async function (request, h) {

            const id = request.auth.credentials.roles.account._id;
            const update = {
                $set: {
                    name: request.payload.name
                }
            };
            const options = {
                fields: Account.fieldsAdapter('user name timeCreated')
            };

            return await Account.findByIdAndUpdate(id, update, options);
        }
    });

    server.route({
        method: 'PUT',
        path: '/accounts/my/avatar',
        options: {
            description: 'Upload account avatar image. [User Account Scope]',
            notes: 'Update your account details.',
            tags: ['api', 'accounts'],
            auth: {
                scope: 'account'
            },
            plugins: {
                'hapi-swagger': { payloadType: 'form' }
            },
            payload: {
                allow: 'multipart/form-data',
                output: 'stream'
            },
            validate: {
                payload: {
                    avatar: Joi.any().required().meta({ swaggerType: 'file' })
                }
            }
        },
        handler: async ({ payload, route, auth }, h) => {

            const { uploader } = server.plugins['hapi-darwin'];

            try {
                await uploader(payload.avatar, {
                    dest: join(route.settings.files.relativeTo, 'avatars'),
                    names: auth.credentials.roles.account._id,
                    safeName: false,
                    versions: [{ width: 150, height: 150 }]
                });
            } catch (err) {
                throw Boom.badRequest('Invalid file.');
            }

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'DELETE',
        path: '/accounts/my/avatar',
        options: {
            description: 'Delete account avatar image. [User Account Scope]',
            notes: 'Delete account avatar image.',
            tags: ['api', 'accounts'],
            auth: {
                scope: 'account'
            }
        },
        handler: ({ route, auth }, h) => {

            const pattern = join(route.settings.files.relativeTo, 'avatars', `${auth.credentials.roles.account._id}*`);
            Del.sync(pattern, { force: true });

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-accounts',
    dependencies: [
        'auth',
        'hapi-auth-jwt2',
        'hapi-mongo-models',
        'hapi-darwin'
    ],
    register
};
