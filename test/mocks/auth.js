'use strict';

const register = (server) => {

    server.auth.strategy('test', 'basic', {
        validate() {}
    });

    server.auth.default('test');
};

module.exports = {
    register,
    dependencies: ['hapi-auth-basic'],
    name: 'auth'
};
