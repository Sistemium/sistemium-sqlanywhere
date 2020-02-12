import { expect, assert } from 'chai';
import Anywhere from '../lib/Anywhere';

const SQLC = 'host=asa3a.sistemium.com;eng=AWS03a;dbn=bsd;uid=bsapi;pwd=sqL2019-bs';

describe('Anywhere connection', function () {

  // before(async function () {
  //   assert(process.env.MONGO_URL, 'Must be set MONGO_URL variable');
  //   await mongo.connect();
  // });

  it('should connect and disconnect', async function () {

    const conn = new Anywhere(SQLC);

    await conn.connect();

    console.log('connected');

    await conn.disconnect();

    console.log('disconnected');

  });

  // after(async function () {
  //   await mongo.disconnect();
  // });

});
