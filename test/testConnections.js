import { expect, assert } from 'chai';
import Anywhere from '../lib/Anywhere';

const { SQLC } = process.env;

describe('Anywhere connection', function () {

  it('should connect and disconnect', async function () {

    assert(SQLC, 'SQLC env var must be set');

    const conn = new Anywhere(SQLC);

    await conn.connect();

    console.log('connected');

    await conn.disconnect();

    console.log('disconnected');

  });

});
