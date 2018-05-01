'use strict';
const { expect } = require('code');
const { describe, it } = exports.lab = require('lab').script();

const StatusEntry = require('./status-entry');

describe('Status Model', () => {

    it('should instantiate an instance', () => {

        const statusEntry = new StatusEntry({
            id: 'account-happy',
            name: 'Happy',
            adminCreated: {
                id: '111111111111111111111111',
                name: 'Root Admin'
            }
        });

        expect(statusEntry).to.be.an.instanceOf(StatusEntry);
    });
});
