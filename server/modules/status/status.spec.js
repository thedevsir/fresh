'use strict';
const { expect } = require('code');
const { describe, before, after, it } = exports.lab = require('lab').script();

const Config   = require('../../../config');
const Fixtures = require('../../../test/fixtures');

const Status = require('./status');

const config = Config.get('/hapiMongoModels/mongodb');

describe('Status Model', () => {

    before(async () => {

        await Status.connect(config.connection, config.options);
        await Fixtures.Db.removeAllData();
    });

    after(async () => {

        await Fixtures.Db.removeAllData();

        Status.disconnect();
    });

    it('should return a new instance when create succeeds', async () => {

        const status = await Status.create('Order', 'Complete');

        expect(status).to.be.an.instanceOf(Status);
        expect(status._id).to.equal('order-complete');
        expect(status.name).to.equal('Complete');
        expect(status.pivot).to.equal('Order');
    });
});
