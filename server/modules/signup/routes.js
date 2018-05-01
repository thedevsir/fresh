'use strict';
const Boom = require('boom');
const Bcrypt = require('bcryptjs');
const Joi = require('joi');

const Config = require('../../../config');
const Mailer = require('../../mailer');

const User = require('../user');
const Session = require('../session');
const Account = require('../account');

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

            const keyHash = await Session.generateKeyHash();

            let [account, user] = await Promise.all([
                Account.create(request.payload.name),
                User.create(
                    request.payload.username,
                    request.payload.password,
                    request.payload.email,
                    {
                        token: keyHash.hash,
                        expires: Date.now() + 3600
                    }
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

            try {
                await sendVerificationEmail(request.payload.email, keyHash.key);
            } catch (err) {
                request.log(['mailer', 'error'], err);
            }

            // create session

            const userAgent = request.headers['user-agent'];
            const ip = request.remoteAddress;
            const session = await Session.create(`${user._id}`, ip, userAgent);

            // create auth header

            const credentials = `${session._id}:${session.key}`;
            const authHeader = `Basic ${new Buffer(credentials).toString('base64')}`;

            return {
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email,
                    roles: user.roles
                },
                session,
                authHeader
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
                    email: Joi.string().email().lowercase().required(),
                    key: Joi.string().required()
                }
            },
            pre: [
                {
                    assign: 'user',
                    method: async ({ payload }, h) => {

                        const user = await User.findOne({
                            email: payload.email,
                            'verify.expires': { $gt: Date.now() }
                        });

                        if (!user) {
                            throw Boom.badRequest('Invalid email or key.');
                        }

                        return user;
                    }
                }
            ]
        },
        handler: async ({ pre: { user }, payload }, h) => {

            if (!await Bcrypt.compare(payload.key, user.verify.token)) {
                throw Boom.badRequest('Invalid email or key.');
            }

            await User.findByIdAndUpdate(user._id, {
                $unset: { verify: undefined }
            });

            return { message: 'Success.' };
        }
    });

    // TODO: can remove user pre and use `User.findOneAndUpdate` method
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
                            'verify.expires': { $lt: Date.now() }
                        });

                        if (!user) {
                            return h.response({ message: 'Success.' }).takeover();
                        }

                        return user;
                    }
                }
            ]
        },
        handler: async ({ pre, payload }, h) => {

            const { key, hash: token } = await Session.generateKeyHash();

            await User.findByIdAndUpdate(pre.user._id, {
                $set: {
                    verify: {
                        token,
                        expires: Date.now() + 3600
                    }
                }
            });

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
