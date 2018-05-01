'use strict';
const { expect } = require('code');
const { describe, afterEach, it } = exports.lab = require('lab').script();

const Config = require('../config');

const Mailer = require('./mailer');

describe('Mailer', () => {

    const mailerTransport = Mailer.transport;

    afterEach(() => {

        Mailer.transport = mailerTransport;
    });

    it('should populate the template cache on first render', async () => {

        const context = { username: 'ren', email: 'ren@stimpy.show' };
        const content = await Mailer.renderTemplate('welcome', context);

        expect(content).to.match(/ren@stimpy.show/i);
    });

    it('should use the template cache on subsequent renders', async () => {

        const context = { username: 'stimpy', email: 'stimpy@ren.show' };
        const content = await Mailer.renderTemplate('welcome', context);

        expect(content).to.match(/stimpy@ren.show/i);
    });

    it('should send the email through the the transport', async () => {

        Mailer.transport = {
            sendMail: function (options) {

                expect(options).to.be.an.object();
                expect(options.from).to.equal(Config.get('/system/fromAddress'));
                expect(options.cc).to.be.an.object();
                expect(options.cc.email).to.equal('stimpy@ren.show');

                return { wasSent: true };
            }
        };

        const context = { username: 'stimpy', email: 'stimpy@ren.show' };
        const content = await Mailer.renderTemplate('welcome', context);
        const options = {
            cc: {
                name: 'Stimpson J Cat',
                email: 'stimpy@ren.show'
            }
        };

        const info = await Mailer.sendEmail(options, 'welcome', context);

        expect(info).to.be.an.object();
        expect(info.wasSent).to.equal(true);
        expect(content).to.match(/stimpy@ren.show/i);
    });
});
