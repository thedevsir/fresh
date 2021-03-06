'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Config = require('../../../config');
const Mailer = require('../../mailer');

const AuthAttempt = require('./auth-attempt');
const Session = require('../session');
const User = require('../user');

const Jwt = require('jsonwebtoken');

const { secret, algorithm } = Config.get('/jwt');

const register = function (server, serverOptions) {

    server.route({
        method: 'POST',
        path: '/login',
        options: {
            tags: ['api', 'login'],
            description: 'Log in with username and password. [No Scope]',
            notes: 'Log in with username and password.',
            auth: false,
            validate: {
                payload: {
                    usernameOrEmail: Joi.string().lowercase().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'abuseDetected',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.usernameOrEmail;
                    const detected = await AuthAttempt.abuseDetected(ip, username);

                    if (detected) {
                        throw Boom.badRequest('Maximum number of auth attempts reached.');
                    }

                    return h.continue;
                }
            }, {
                assign: 'user',
                method: async function (request, h) {

                    const ip = request.remoteAddress;
                    const username = request.payload.usernameOrEmail;
                    const password = request.payload.password;
                    const user = await User.findByCredentials(username, password);

                    if (!user) {
                        await AuthAttempt.create(ip, username);

                        throw Boom.badRequest('Credentials are invalid or account is inactive.');
                    }

                    return user;
                }
            }, {
                assign: 'session',
                method: async function (request, h) {

                    const userId = `${request.pre.user._id}`;
                    const ip = request.remoteAddress;
                    const userAgent = request.headers['user-agent'];

                    return await Session.create(userId, ip, userAgent);
                }
            }]
        },
        handler: async function ({ pre: { user, session } }, h) {

            const { _id: uid, username, verify, isActive } = user;
            const { _id: sid, key } = session;

            const roles = await user.hydrateRoles();

            const credentials = {
                roles,
                session: { key, _id: sid },
                user: { username, verify, isActive, _id: uid }
            };

            return {
                authorization: Jwt.sign(credentials, secret, { algorithm })
            };
        }
    });

    server.route({
        method: 'POST',
        path: '/login/forgot',
        options: {
            tags: ['api', 'login'],
            description: 'Trigger forgot password email. [No Scope]',
            notes: 'Trigger forgot password email.',
            auth: false,
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [{
                assign: 'user',
                method: async function (request, h) {

                    const query = { email: request.payload.email };
                    const user = await User.findOne(query);

                    if (!user) {
                        const response = h.response({ message: 'Success.' });

                        return response.takeover();
                    }

                    return user;
                }
            }]
        },
        handler: async function ({ pre, payload }, h) {

            // set reset token

            const document = {
                user: {
                    id: pre.user._id,
                    email: pre.user.email,
                    username: pre.user.username
                }
            };

            const key = Jwt.sign(document, secret, { algorithm, expiresIn: '24h' });

            // send email

            const projectName = Config.get('/projectName');
            const emailOptions = {
                subject: `Reset your ${projectName} password`,
                to: payload.email
            };
            const template = 'forgot-password';
            const context = { key };

            await Mailer.sendEmail(emailOptions, template, context);

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'POST',
        path: '/login/reset',
        options: {
            tags: ['api', 'login'],
            description: 'Reset password with forgot password key. [No Scope]',
            notes: 'Reset password with forgot password key.',
            auth: false,
            validate: {
                payload: {
                    key: Joi.string().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'jwt',
                method: function ({ payload }, h) {

                    // validate reset token

                    try {
                        const document = Jwt.verify(payload.key, secret, { algorithms: [algorithm] });

                        return document;

                    } catch (err) {
                        throw Boom.badRequest('Invalid key.');
                    }
                }
            }]
        },
        handler: async function ({ pre: { jwt }, payload }, h) {

            // update user

            const password = payload.password;
            const passwordHash = await User.generatePasswordHash(password);

            const update = {
                $set: {
                    password: passwordHash.hash
                }
            };

            await User.findByIdAndUpdate(jwt.user.id, update);

            return { message: 'Success.' };
        }
    });
};

module.exports = {
    name: 'api-login',
    dependencies: [
        'hapi-mongo-models',
        'hapi-remote-address'
    ],
    register
};
