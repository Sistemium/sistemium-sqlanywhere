import { expect, assert } from 'chai';
import Anywhere from '../lib/Anywhere';

const { SQLA_CONNECTION } = process.env;

describe('Anywhere connection', function () {

  it('should connect and disconnect', async function () {

    assert(SQLA_CONNECTION, 'SQLA_CONNECTION env var must be set');

    const conn = new Anywhere(SQLA_CONNECTION);

    await conn.connect();

    console.log('connected');

    await conn.disconnect();

    console.log('disconnected');

  });

});
