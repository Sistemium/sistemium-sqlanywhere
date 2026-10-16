const { assert, expect } = require('chai');
const Anywhere = require ('../lib/Anywhere').default;
const { trackForks, exited } = require('./support/processes');

const { SQLA_CONNECTION } = process.env;

console.log(process.arch, process.env.DYLD_LIBRARY_PATH);

const sqlCount = 'select count() as cnt from #test';
const sqlInsert = 'insert into #test (id, name) values (?, ?)';
const DISCONNECTED = 'Process disconnected';
const sqlPrepare = 'declare local temporary table #test (id int, name text)';

describe('Anywhere connection', function () {

  // every request is a round trip to a real server
  this.timeout(10000);

  it('should connect and disconnect', async function () {

    assert(SQLA_CONNECTION, 'SQLA_CONNECTION env var must be set');

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    await conn.disconnect();

    await conn.disconnect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED))

  });

  it('should not connect', async function () {

    const cred = SQLA_CONNECTION.replace(/pwd=[^;]+;/, 'pwd=1;')

    const forked = trackForks();
    const conn = new Anywhere(cred);
    await conn.connect()
      .then(unexpected)
      .catch(expectErr('Invalid user ID or password'))
      .finally(forked.restore)
    await exited(forked[0])
    await conn.disconnect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED))

  });

  it('should utilize prepared', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    conn.autoCommit = false;

    await conn.execImmediate(sqlPrepare);
    const p = await conn.prepare(sqlInsert);
    await conn.exec(p, [1, 'test 1']);
    await conn.exec(p, [2, 'test 2']);
    expect(await conn.dropPrepared(sqlPrepare)).equals(false, 'must be not prepared');
    expect(await conn.dropPrepared(sqlInsert)).equals(true, 'must be dropped');
    const [{ cnt }] = await conn.execImmediate(sqlCount);
    expect(cnt).equals(2);

    await conn.prepare('something invalid')
      .then(unexpected)
      .catch(expectErr('Procedure \'something\' not found'))

    await conn.disconnect();

  });

  it('should autocommit', async function () {
    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    conn.autoCommit = true;
    const sql = `${sqlPrepare} on commit preserve rows`;
    await conn.execImmediate(sql);
    const preparedId = await conn.prepare(sqlInsert);
    await conn.exec(preparedId, [1, 'to commit 1']);
    await conn.rollback();
    const [{ cnt }] = await conn.execImmediate(sqlCount);
    expect(cnt).equals(1);
    await conn.disconnect();

  });

  it('should rollback', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    conn.autoCommit = false;

    const sql = `${sqlPrepare} on commit preserve rows`;

    await conn.execImmediate(sql);
    const p = await conn.prepare(sqlInsert);
    const already = await conn.prepare(sqlInsert);
    expect(already).equals(p);

    await conn.exec(p, [1, 'to rollback 1']);
    await conn.rollback();
    const [{ cnt }] = await conn.execImmediate(sqlCount);
    expect(cnt).equals(0);

    await conn.exec(p, [1, 'to commit 1']);
    const [committed] = await conn.execImmediate(sqlCount);
    await conn.commit();
    expect(committed).eql({ cnt: 1 });

    await conn.disconnect();

  });

  it('should keep the types of values', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();

    try {

      await conn.execImmediate('declare local temporary table #types'
        + ' (bin long binary, num double, str text, nul int, dt varchar(30))');

      const bytes = Buffer.from([0, 1, 127, 128, 255]);
      const date = new Date('2024-02-03T04:05:06.789Z');
      await conn.execImmediate('insert into #types values (?, ?, ?, ?, ?)', [
        bytes, 1.5, 'text', undefined, date,
      ]);

      const [row] = await conn.execImmediate('select * from #types');
      expect(Buffer.isBuffer(row.bin)).equals(true, 'binary must be a Buffer');
      expect(row.bin.equals(bytes)).equals(true);
      expect(row).to.include({
        num: 1.5, str: 'text', nul: null, dt: date.toJSON(),
      });

    } finally {
      await conn.disconnect();
    }

  });

  it('should insert several rows with nulls', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    conn.autoCommit = false;

    try {
      await conn.execImmediate(sqlPrepare);
      const p = await conn.prepare(sqlInsert);
      await conn.exec(p, [[1, 'one'], [2, null], [3, undefined]]);
      const rows = await conn.execImmediate('select id, name from #test order by id');
      expect(rows).eql([{ id: 1, name: 'one' }, { id: 2, name: null }, { id: 3, name: null }]);
    } finally {
      await conn.disconnect();
    }

  });

  it('should throw', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();

    await conn.execImmediate(sqlPrepare);
    await conn.execImmediate('insert into #test1 (id, name) values (1, \'1\')')
      .then(unexpected)
      .catch(expectErr('Table \'#test1\' not found'));

    await conn.disconnect();

    await conn.commit()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED))

    await conn.rollback()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED))

  });

});

function unexpected() {
  throw Error('Unexpected success')
}

function expectErr(message) {
  return e => expect(e.message).equals(message)
}
