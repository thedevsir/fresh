'use strict';
const Joi = require('joi');

const Config = require('../../../config');
const Mailer = require('../../mailer');

const register = function (server, serverOptions) {

    server.route({
        method: 'POST',
        path: '/contact',
        options: {
            tags: ['api', 'contact'],
            description: 'Generate a contact email. [No Scope]',
            notes: 'Generate a contact email.',
            auth: false,
            validate: {
                payload: {
                    name: Joi.string().required(),
                    email: Joi.string().email().required(),
                    message: Joi.string().required()
                }
            }
        },
        handler: async function (request, h) {

            const emailOptions = {
                subject: Config.get('/projectName') + ' contact form',
                to: Config.get('/system/toAddress'),
                replyTo: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };
            const template = 'contact';

            await Mailer.sendEmail(emailOptions, template, request.payload);

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-contact',
    dependencies: [],
    register
};
