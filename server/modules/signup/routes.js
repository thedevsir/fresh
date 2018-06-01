'use strict';
const Boom = require('boom');
const Joi = require('joi');

const Config = require('../../../config');
const Mailer = require('../../mailer');

const User = require('../user');
const Session = require('../session');
const Account = require('../account');

const Jwt = require('jsonwebtoken');

const { secret, algorithm } = Config.get('/jwt');

const register = function (server, serverOptions) {

    server.route({
        method: 'POST',
        path: '/signup',
        options: {
            tags: ['api', 'signup'],
            auth: false,
            validate: {
                payload: {
                    name: Joi.string().required(),
                    email: Joi.string().email().lowercase().required(),
                    username: Joi.string().token().lowercase().required(),
                    password: Joi.string().required()
                }
            },
            pre: [{
                assign: 'usernameCheck',
                method: async function (request, h) {

                    const user = await User.findByUsername(request.payload.username);

                    if (user) {
                        throw Boom.conflict('Username already in use.');
                    }

                    return h.continue;
                }
            }, {
                assign: 'emailCheck',
                method: async function (request, h) {

                    const user = await User.findByEmail(request.payload.email);

                    if (user) {
                        throw Boom.conflict('Email already in use.');
                    }

                    return h.continue;
                }
            }]
        },
        handler: async function (request, h) {

            // create and link account and user documents

            let [account, user] = await Promise.all([
                Account.create(request.payload.name),
                User.create(
                    request.payload.username,
                    request.payload.password,
                    request.payload.email
                )
            ]);

            [account, user] = await Promise.all([
                account.linkUser(`${user._id}`, user.username),
                user.linkAccount(`${account._id}`, account.fullName())
            ]);

            // send welcome email

            const emailOptions = {
                subject: `Your ${Config.get('/projectName')} account`,
                to: {
                    name: request.payload.name,
                    address: request.payload.email
                }
            };

            try {
                await Mailer.sendEmail(emailOptions, 'welcome', request.payload);
            } catch (err) {
                request.log(['mailer', 'error'], err);
            }

            // send verification email

            const document = {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            };

            const keyHash = Jwt.sign(document, secret, { algorithm, expiresIn: '24h' });

            try {
                await sendVerificationEmail(request.payload.email, keyHash);
            } catch (err) {
                request.log(['mailer', 'error'], err);
            }

            // create session

            const userAgent = request.headers['user-agent'];
            const ip = request.remoteAddress;
            const session = await Session.create(`${user._id}`, ip, userAgent);

            // create auth header

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
        path: '/signup/verify',
        options: {
            description: 'Verify user e-mail with a key',
            tags: ['api', 'signup'],
            auth: false,
            validate: {
                payload: {
                    key: Joi.string().required()
                }
            },
            pre: [
                {
                    assign: 'jwt',
                    method: ({ payload }, h) => {

                        // validate verify token

                        try {

                            const document = Jwt.verify(payload.key, secret, { algorithms: [algorithm] });

                            return document;

                        } catch (err) {
                            throw Boom.badRequest('Invalid key.');
                        }
                    }
                }
            ]
        },
        handler: async ({ pre: { jwt }, payload }, h) => {

            const update = {
                $unset: { verify: undefined }
            };

            await User.findByIdAndUpdate(jwt.user._id, update);

            return { message: 'Success.' };
        }
    });

    server.route({
        method: 'POST',
        path: '/signup/resend-email',
        options: {
            tags: ['api', 'signup'],
            validate: {
                payload: {
                    email: Joi.string().email().lowercase().required()
                }
            },
            pre: [
                {
                    assign: 'user',
                    method: async ({ payload }, h) => {

                        const user = await User.findOne({
                            email: payload.email,
                            verify: false
                        });

                        if (!user) {
                            return h.response({ message: 'Success.' }).takeover();
                        }

                        return user;
                    }
                }
            ]
        },
        handler: async ({ pre: { user }, payload }, h) => {

            const document = {
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email
                }
            };

            const key = Jwt.sign(document, secret, { algorithm, expiresIn: '24h' });

            await sendVerificationEmail(payload.email, key);

            return { message: 'Success.' };
        }
    });

    const sendVerificationEmail = async (email, key) => {

        const projectName = Config.get('/projectName');
        const emailOptions = {
            subject: `Verify your ${projectName} account`,
            to: email
        };
        const template = 'verify';
        const context = { key };

        await Mailer.sendEmail(emailOptions, template, context);
    };
};

module.exports = {
    name: 'api-signup',
    dependencies: [
        'hapi-mongo-models',
        'hapi-remote-address'
    ],
    register
};
