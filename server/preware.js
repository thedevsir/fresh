'use strict';
const Boom = require('boom');

class Preware {

    static requireAdminGroup(groups) {

        return {
            assign: 'ensureAdminGroup',
            method: function (request, h) {

                if (Object.prototype.toString.call(groups) !== '[object Array]') {
                    groups = [groups];
                }

                const admin = request.auth.credentials.roles.admin;
                const groupFound = groups.some(group => admin.isMemberOf(group));

                if (!groupFound) {
                    throw Boom.forbidden('Missing required group membership.');
                }

                return h.continue;
            }
        };
    };

    static requireAdminHavePermission(permissions) {

        return {
            assign: 'ensureAdminHavePermission',
            method: function (request, h) {

                if (Object.prototype.toString.call(permissions) !== '[object Array]') {
                    permissions = [permissions];
                }

                const admin = request.auth.credentials.roles.admin;
                const permissionFound = permissions.some(permission => admin.hasPermissionTo(permission));

                if (!permissionFound) {
                    throw Boom.forbidden('Missing permissions.');
                }

                return h.continue;
            }
        };
    }

    static requireRootOrHavePermission(permissions) {

        return {
            assign: 'ensureRootOrHavePermission',
            method: function (request, h) {

                const admin = request.auth.credentials.roles.admin;
                const root = admin.isMemberOf('root');

                if (root) {
                    return h.continue;
                }

                if (Object.prototype.toString.call(permissions) !== '[object Array]') {
                    permissions = [permissions];
                }

                const permissionFound = permissions.some(permission => admin.hasPermissionTo(permission));

                if (!permissionFound) {
                    throw Boom.forbidden('Missing permissions.');
                }

                return h.continue;
            }
        };
    }

    static requireVerifiedUser() {

        return {
            assign: 'ensureVerifiedUser',
            method: ({ auth }, h) => {

                if (auth.credentials.verify) {
                    throw Boom.forbidden('Email is not verified.');
                }

                return h.continue;
            }
        };
    }
}

Preware.requireNotRootUser = {
    assign: 'requireNotRootUser',
    method: function (request, h) {

        if (request.auth.credentials.user.username === 'root') {
            throw Boom.forbidden('Not permitted for the root user.');
        }

        return h.continue;
    }
};

module.exports = Preware;
