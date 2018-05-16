'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../../preware');

const Session = require('../session');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/sessions',
        options: {
            tags: ['api', 'admin-session'],
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
                sort: Session.sortAdapter(request.query.sort)
            };

            return await Session.pagedFind(query, limit, page, options);
        }
    });

    server.route({
        method: 'GET',
        path: '/sessions/{id}',
        options: {
            tags: ['api', 'admin-session'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const session = await Session.findById(request.params.id);

            if (!session) {
                throw Boom.notFound('Session not found.');
            }

            return session;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/sessions/{id}',
        options: {
            tags: ['api', 'admin-session'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const session = await Session.findByIdAndDelete(request.params.id);

            if (!session) {
                throw Boom.notFound('Session not found.');
            }

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-admin-sessions',
    dependencies: [
        'auth',
        'hapi-auth-jwt2',
        'hapi-mongo-models'
    ],
    register
};
