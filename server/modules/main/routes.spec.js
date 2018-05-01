'use strict';
const Hapi = require('hapi');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    it
} = exports.lab = require('lab').script();

const Main = require('./routes').default;

let server;

before(async () => {

    server = Hapi.Server();

    await server.register(Main);
    await server.start();
});

after(async () => {

    await server.stop();
});

describe('GET /', () => {

    let request;

    beforeEach(() => {

        request = {
            method: 'GET',
            url: '/'
        };
    });

    it('should return HTTP 200 when all is good', async () => {

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/welcome/i);
    });
});
