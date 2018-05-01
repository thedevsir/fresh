'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../../preware');

const AdminGroup = require('../admin-group');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/admin-groups',
        options: {
            tags: ['api', 'admin-group'],
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
                sort: AdminGroup.sortAdapter(request.query.sort)
            };

            return await AdminGroup.pagedFind(query, limit, page, options);
        }
    });

    server.route({
        method: 'POST',
        path: '/admin-groups',
        options: {
            tags: ['api', 'admin-group'],
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

            return await AdminGroup.create(request.payload.name);
        }
    });

    server.route({
        method: 'GET',
        path: '/admin-groups/{id}',
        options: {
            tags: ['api', 'admin-group'],
            auth: {
                scope: 'admin'
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const adminGroup = await AdminGroup.findById(request.params.id);

            if (!adminGroup) {
                throw Boom.notFound('AdminGroup not found.');
            }

            return adminGroup;
        }
    });

    server.route({
        method: 'PUT',
        path: '/admin-groups/{id}',
        options: {
            tags: ['api', 'admin-group'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                },
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
            const adminGroup = await AdminGroup.findByIdAndUpdate(id, update);

            if (!adminGroup) {
                throw Boom.notFound('AdminGroup not found.');
            }

            return adminGroup;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/admin-groups/{id}',
        options: {
            tags: ['api', 'admin-group'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                }
            },
            pre: [
                Preware.requireAdminGroup('root')
            ]
        },
        handler: async function (request, h) {

            const adminGroup = await AdminGroup.findByIdAndDelete(request.params.id);

            if (!adminGroup) {
                throw Boom.notFound('AdminGroup not found.');
            }

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'PUT',
        path: '/admin-groups/{id}/permissions',
        options: {
            tags: ['api', 'admin-group'],
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('root')
                },
                payload: {
                    permissions: Joi.object().required()
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
                    permissions: request.payload.permissions
                }
            };
            const adminGroup = await AdminGroup.findByIdAndUpdate(id, update);

            if (!adminGroup) {
                throw Boom.notFound('AdminGroup not found.');
            }

            return adminGroup;
        }
    });
};

module.exports = {
    name: 'api-admin-groups',
    dependencies: [
        'auth',
        'hapi-auth-basic',
        'hapi-mongo-models'
    ],
    register
};
