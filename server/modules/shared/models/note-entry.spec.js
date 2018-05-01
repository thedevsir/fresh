'use strict';
const { expect } = require('code');
const { describe, it } = exports.lab = require('lab').script();

const NoteEntry = require('./note-entry');

describe('NoteEntry Model', () => {

    it('should instantiate an instance', () => {

        const noteEntry = new NoteEntry({
            data: 'Important stuff.',
            adminCreated: {
                id: '111111111111111111111111',
                name: 'Root Admin'
            }
        });

        expect(noteEntry).to.be.an.instanceOf(NoteEntry);
    });
});
