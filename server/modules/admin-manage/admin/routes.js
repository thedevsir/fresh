'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Preware = require('../../../preware');

const Admin = require('../admin-manage');
const User  = require('../../user');
const Session  = require('../../session');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/admins',
        options: {
            tags: ['api', 'admins'],
            description: 'Get a paginated list of all admin accounts. [Root Scope]',
            notes: 'Get a paginated list of all admin accounts.',
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
                sort: Admin.sortAdapter(request.query.sort)
            };

            return await Admin.pagedFind(query, page, limit, options);
        }
    });

    server.route({
        method: 'POST',
        path: '/admins',
        options: {
            tags: ['api', 'admins'],
            description: 'Create a new admin account. [Root Scope]',
            notes: 'Create a new admin account.',
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

            return await Admin.create(request.payload.name);
        }
    });

    server.route({
        method: 'GET',
        path: '/admins/{id}',
        options: {
            tags: ['api', 'admins'],
            description: 'Get an admin account by ID. [Root Scope]',
            notes: 'Get an admin account by ID.',
            validate: {
                params: {
                    id : Joi.string().required().description('the id to get an admin')
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

            const admin = await Admin.findById(request.params.id);

            if (!admin) {
                throw Boom.notFound('Admin not found.');
            }

            return admin;
        }
    });

    server.route({
        method: 'PUT',
        path: '/admins/{id}',
        options: {
            tags: ['api', 'admins'],
            description: 'Update an admin account by ID. [Root Scope]',
            notes: 'Update an admin account by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('111111111111111111111111')
                },
                payload: {
                    name: Joi.object({
                        first: Joi.string().required(),
                        last: Joi.string().required()
                    }).required()
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
            const admin = await Admin.findByIdAndUpdate(id, update);

            if (!admin) {
                throw Boom.notFound('Admin not found.');
            }

            return admin;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/admins/{id}',
        options: {
            tags: ['api', 'admins'],
            description: 'Delete an admin account by ID. [Root Scope]',
            notes: 'Delete an admin account by ID.',
            validate: {
                params: {
                    id : Joi.string().required().description('the id to delete an admin')
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

            const admin = await Admin.findByIdAndDelete(request.params.id);

            if (!admin) {
                throw Boom.notFound('Admin not found.');
            }

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'PUT',
        path: '/admins/{id}/groups',
        options: {
            tags: ['api', 'admins'],
            description: 'Update an admin account\'s groups by ID. [Root Scope]',
            notes: 'Update an admin account\'s groups by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('111111111111111111111111')
                },
                payload: {
                    groups: Joi.object().required()
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
                    groups: request.payload.groups
                }
            };
            const admin = await Admin.findByIdAndUpdate(id, update);

            if (!admin) {
                throw Boom.notFound('Admin not found.');
            }

            if (admin.user) {
                await Session.deleteUserSessions(admin.user.id);
            }

            return admin;
        }
    });

    server.route({
        method: 'PUT',
        path: '/admins/{id}/permissions',
        options: {
            tags: ['api', 'admins'],
            description: 'Update an admin account\'s custom permissions by ID. [Root Scope]',
            notes: 'Update an admin account\'s custom permissions by ID.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('111111111111111111111111')
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
            const admin = await Admin.findByIdAndUpdate(id, update);

            if (!admin) {
                throw Boom.notFound('Admin not found.');
            }

            if (admin.user) {
                await Session.deleteUserSessions(admin.user.id);
            }

            return admin;
        }
    });

    server.route({
        method: 'PUT',
        path: '/admins/{id}/user',
        options: {
            tags: ['api', 'admins'],
            description: 'Link an admin account to a user account. [Root Scope]',
            notes: 'Link an admin account to a user account.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('111111111111111111111111')
                },
                payload: {
                    username: Joi.string().lowercase().required()
                }
            },
            pre: [
                Preware.requireAdminGroup('root'),
                {
                    assign: 'admin',
                    method: async function (request, h) {

                        const admin = await Admin.findById(request.params.id);

                        if (!admin) {
                            throw Boom.notFound('Admin not found.');
                        }

                        return admin;
                    }
                }, {
                    assign: 'user',
                    method: async function (request, h) {

                        const user = await User.findByUsername(request.payload.username);

                        if (!user) {
                            throw Boom.notFound('User not found.');
                        }

                        if (user.roles.admin &&
                            user.roles.admin.id !== request.params.id) {

                            throw Boom.conflict('User is linked to an admin. Unlink first.');
                        }

                        if (request.pre.admin.user &&
                            request.pre.admin.user.id !== `${user._id}`) {

                            throw Boom.conflict('Admin is linked to a user. Unlink first.');
                        }

                        return user;
                    }
                }
            ]
        },
        handler: async function (request, h) {

            const user = request.pre.user;
            let admin = request.pre.admin;

            [admin] = await Promise.all([
                admin.linkUser(`${user._id}`, user.username),
                user.linkAdmin(`${admin._id}`, admin.fullName()),
                Session.deleteUserSessions(`${user._id}`)
            ]);

            return admin;
        }
    });

    server.route({
        method: 'DELETE',
        path: '/admins/{id}/user',
        options: {
            tags: ['api', 'admins'],
            description: 'Unlink an admin account from a user account. [Root Scope]',
            notes: 'Unlink an admin account from a user account.',
            auth: {
                scope: 'admin'
            },
            validate: {
                params: {
                    id: Joi.string().invalid('111111111111111111111111')
                }
            },
            pre: [
                Preware.requireAdminGroup('root'),
                {
                    assign: 'admin',
                    method: async function (request, h) {

                        let admin = await Admin.findById(request.params.id);

                        if (!admin) {
                            throw Boom.notFound('Admin not found.');
                        }

                        if (!admin.user || !admin.user.id) {
                            admin = await admin.unlinkUser();

                            return h.response(admin).takeover();
                        }

                        return admin;
                    }
                }, {
                    assign: 'user',
                    method: async function (request, h) {

                        const user = await User.findById(request.pre.admin.user.id);

                        if (!user) {
                            throw Boom.notFound('User not found.');
                        }

                        return user;
                    }
                }
            ]
        },
        handler: async function (request, h) {

            const [admin] = await Promise.all([
                request.pre.admin.unlinkUser(),
                request.pre.user.unlinkAdmin(),
                Session.deleteUserSessions(`${request.pre.user._id}`)
            ]);

            return admin;
        }
    });
};

module.exports = {
    name: 'api-admin-manage',
    dependencies: [
        'auth',
        'hapi-auth-jwt2',
        'hapi-mongo-models'
    ],
    register
};
