'use strict';
const Boom = require('boom');

const Session = require('./session');

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/sessions/my',
        options: {
            tags: ['api', 'session'],
            description: 'Get the logged-in user\'s session. [User Account Scope]',
            notes: 'Get the logged-in user\'s session.',
            auth: {
                scope: ['admin', 'account']
            }
        },
        handler: async function (request, h) {

            const query = {
                userId: `${request.auth.credentials.user._id}`
            };

            return await Session.find(query);
        }
    });

    server.route({
        method: 'DELETE',
        path: '/sessions/my/{id}',
        options: {
            tags: ['api', 'session'],
            description: 'Delete the logged-in user\'s session by ID. [User Account Scope]',
            notes: 'Delete the logged-in user\'s session by ID.'
        },
        handler: async function (request, h) {

            const currentSession = `${request.auth.credentials.session._id}`;

            if (currentSession === request.params.id) {
                throw Boom.badRequest(
                    'Cannot destroy your current session. Also see `/logout`.'
                );
            }

            const query = {
                _id: Session.ObjectID(request.params.id),
                userId: `${request.auth.credentials.user._id}`
            };

            await Session.findOneAndDelete(query);

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-sessions',
    dependencies: [
        'auth',
        'hapi-auth-jwt2',
        'hapi-mongo-models'
    ],
    register
};
