'use strict';
const Session = require('./modules/session');

const Config = require('../config');

const register = function (server, options) {

    const { secret, algorithm } = Config.get('/jwt');

    server.auth.strategy('advanced', 'jwt',
        {
            key: secret,
            verifyOptions: {
                algorithms: [algorithm],
                ignoreExpiration: true
            },
            validate: async function (credentials, request, h) {

                const { _id: sid, key } = credentials.session;
                const session = await Session.findByCredentials(sid, key);

                if (!session) {
                    return { isValid: false };
                }

                session.updateLastActive();

                return { credentials, isValid: true };
            }
        }
    );

    server.auth.default('advanced');
};

module.exports = {
    name: 'auth',
    dependencies: [
        'hapi-auth-jwt2',
        'hapi-mongo-models'
    ],
    register
};
