'use strict';

const register = function (server, serverOptions) {

    server.route({
        method: 'GET',
        path: '/',
        options: {
            tags: ['api', 'main'],
            auth: false
        },
        handler: function (request, h) {

            return {
                message: 'Welcome to the API.'
            };
        }
    });
};

module.exports = {
    name: 'api-main',
    dependencies: [],
    register
};
