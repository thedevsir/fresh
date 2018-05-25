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
                const groupFound = admin && admin.groups &&
                Object.keys(admin.groups).some(group => groups.includes(group));

                if (!groupFound) {
                    throw Boom.forbidden('Missing required group membership.');
                }

                return h.continue;
            }
        };
    };

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
