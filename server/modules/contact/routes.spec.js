'use strict';
const Hapi = require('hapi');
const { expect } = require('code');
const {
    describe,
    before,
    beforeEach,
    after,
    afterEach,
    it
} = exports.lab = require('lab').script();

const Mailer = require('../../mailer');

const Contact = require('./routes');

let server;

before(async () => {

    server = Hapi.Server();

    await server.register(Contact);
    await server.start();
});

after(async () => {

    await server.stop();
});

describe('POST /contact', () => {

    const Mailer_sendEmail = Mailer.sendEmail;
    let request;

    beforeEach(() => {

        request = {
            method: 'POST',
            url: '/contact'
        };
    });

    afterEach(() => {

        Mailer.sendEmail = Mailer_sendEmail;
    });

    it('should return HTTP 200 when all is good', async () => {

        Mailer.sendEmail = () => undefined;

        request.payload = {
            name: 'Foo Barzley',
            email: 'foo@stimpy.show',
            message: 'Hello. How are you?'
        };

        const response = await server.inject(request);

        expect(response.statusCode).to.equal(200);
        expect(response.result.message).to.match(/success/i);
    });
});
