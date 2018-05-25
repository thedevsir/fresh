# Fresh API Build on JSON Web Tokens

A user system API starter. Bring your own front-end.

[![Build Status](https://travis-ci.org/escommunity/fresh.svg?branch=master)](https://travis-ci.org/escommunity/fresh)
[![Dependency Status](https://david-dm.org/escommunity/fresh.svg?style=flat)](https://david-dm.org/escommunity/fresh)
[![devDependency Status](https://david-dm.org/escommunity/fresh/dev-status.svg?style=flat)](https://david-dm.org/escommunity/fresh#info=devDependencies)


## Features

 - Sign up system with verification email
 - Login system with forgot password and reset password
 - Upload avatar for accounts
 - Abusive login attempt detection
 - User roles for accounts and admins
 - Admins only notes and status history for accounts
 - Admin groups with shared permissions
 - Admin level permissions that override group permissions


## Technology

Fresh is built with the [hapi 17](https://hapijs.com/) framework. We're
using [MongoDB](http://www.mongodb.org/) as a data store.


## Bring your own front-end

Fresh is only a restful JSON API. If you'd like a ready made front-end for clients,
checkout [Hexagenal](https://github.com/escommunity/hexagonal). Or better yet, fork
this repo and build one on top of Fresh.


## Requirements

You need [Node.js](http://nodejs.org/download/) `>=8.x` and you'll need a
[MongoDB](http://www.mongodb.org/downloads) `>=2.6` server running.


## Installation

```bash
$ git clone https://github.com/escommunity/fresh.git
$ cd fresh
$ npm install
```


## Configuration

Simply edit `config.js`. The configuration uses
[`confidence`](https://github.com/hapijs/confidence) which makes it easy to
manage configuration settings across environments. __Don't store secrets in
this file or commit them to your repository.__

__Instead, access secrets via environment variables.__ We use
[`dotenv`](https://github.com/motdotla/dotenv) to help make setting local
environment variables easy (not to be used in production).

Simply copy `.env-sample` to `.env` and edit as needed. __Don't commit `.env`
to your repository.__


## First time setup

__WARNING__: This will clear all data in the following MongoDB collections if
they exist: `accounts`, `adminGroups`, `admins`, `authAttempts`, `sessions`,
`statuses`, and `users`.

```bash
$ npm run first-time-setup

# > fresh@1.0.0 first-time-setup /home/escommunity/projects/fresh
# > node first-time-setup.js

# MongoDB URL: (mongodb://localhost:27017/fresh)
# Root user email: no-one@your-service
# Root user password:
# Setup complete.
```


## Running the app

```bash
$ npm start

# > fresh@1.0.0 start /home/escommunity/projects/fresh
# > cross-env NODE_ENV=development nodemon -e js,md server.js

# [nodemon] 1.17.3
# ...
```

Now you should be able to point your browser to http://127.0.0.1:9000/ and
see the welcome message.

[`nodemon`](https://github.com/remy/nodemon) watches for changes in server
code and restarts the app automatically.

### With the debugger

```bash
$ npm run inspect

# > fresh@1.0.0 inspect /home/escommunity/projects/fresh
# > nodemon --inspect -e js,md server.js

# [nodemon] 1.17.3
# [nodemon] to restart at any time, enter `rs`
# [nodemon] watching: *.*
# [nodemon] starting `node --inspect server.js`
# Debugger listening on ws://127.0.0.1:9229/3d706d9a-b3e0-4fc6-b64e-e7968b7f94d0
# For help see https://nodejs.org/en/docs/inspector
# 180203/193534.071, [log,info,mongodb] data: HapiMongoModels: successfully connected to the db.
# 180203/193534.127, [log,info,mongodb] data: HapiMongoModels: finished processing auto indexes.
# Server started on port 9000
```

Once started with the debuger you can open Google Chrome and go to
[chrome://inspect](chrome://inspect). See https://nodejs.org/en/docs/inspector/
for more details.


## Running in production

```bash
$ node server.js
```

Unlike `$ npm start` this doesn't watch for file changes. Also be sure to set
these environment variables in your production environment:

 - `NODE_ENV=production` - This is important for many different
   optimizations.
 - `NPM_CONFIG_PRODUCTION=false` - This tells `$ npm install` to not skip
   installing `devDependencies`, which we may need to run the first time
   setup script.


## Have a question?

Any issues or questions (no matter how basic), open an issue. Please take the
initiative to read relevant documentation and be pro-active with debugging.


## Want to contribute?

Contributions are welcome. If you're changing something non-trivial, you may
want to submit an issue before creating a large pull request.


## Running tests

[Lab](https://github.com/hapijs/lab) is part of the hapi ecosystem and what we
use to write all of our tests.

```bash
$ npm test

# > fresh@1.0.0 test /home/escommunity/projects/fresh
# > lab -c -L

#  ..................................................
#  ..................................................
#  ..................................................
#  ..............

# 164 tests complete
# Test duration: 14028 ms
# No global variable leaks detected
# Coverage: 100.00%
# Linting results: No issues
```

### Targeted tests

If you'd like to run a specific test or subset of tests you can use the
`test-server` npm script.

You specificy the path(s) via the `TEST_TARGET` environment variable like:

```bash
$ TEST_TARGET=test/server/web/main.js npm run test-server
```

## Forked from

[https://github.com/jedireza/frame](https://github.com/jedireza/frame)

## License

MIT


## Don't forget

What you build with Fresh is more important than Fresh. 