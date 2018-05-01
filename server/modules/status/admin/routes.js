'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../../preware');

const Status = require('../status');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/statuses',
        options: {
            tags: ['api', 'admin-status'],
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
                sort: Status.sortAdapter(request.query.sort)
            };

            return await Status.pagedFind(query, limit, page, options);
        }
    });

    server.route({
        method: 'POST',
        path: '/statuses',
        options: {
            tags: ['api', 'admin-status'],
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    name: Joi.string().required(),
                    pivot: Joi.string().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            return await Status.create(request.payload.pivot, request.payload.name);
        }
    });

    server.route({
        method: 'GET',
        path: '/statuses/{id}',
        options: {
            tags: ['api', 'admin-status'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const status = await Status.findById(request.params.id);

            if (!status) {
                throw Boom.notFound('Status not found.');
            }

            return status;
        }
    });

    server.route({
        method: 'PUT',
        path: '/statuses/{id}',
        options: {
            tags: ['api', 'admin-status'],
            auth: {
                scope: 'admin'
            },
            validate: {
                payload: {
                    name: Joi.string().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const id = request.params.id;
            const update = {
                $set: {
                    name: request.payload.name
                }
            };
            const status = await Status.findByIdAndUpdate(id, update);

            if (!status) {
                throw Boom.notFound('Status not found.');
            }

            return status;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/statuses/{id}',
        options: {
            tags: ['api', 'admin-status'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const status = await Status.findByIdAndDelete(request.params.id);

            if (!status) {
                throw Boom.notFound('Status not found.');
            }

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-admin-statuses',
    dependencies: [
        'auth',
        'hapi-auth-basic',
        'hapi-mongo-models'
    ],
    register
};
