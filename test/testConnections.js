const { assert, expect } = require('chai');
const Anywhere = require ('../lib/Anywhere').default;

const { SQLA_CONNECTION } = process.env;

console.log(process.arch, process.env.DYLD_LIBRARY_PATH);

describe('Anywhere connection', function () {

  it('should connect and disconnect', async function () {

    assert(SQLA_CONNECTION, 'SQLA_CONNECTION env var must be set');

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();
    await conn.disconnect();

  });

  it('should utilize prepared', async function () {

    const conn = new Anywhere(SQLA_CONNECTION);
    await conn.connect();

    await conn.execImmediate('declare local temporary table #test (id int, name text)');
    const p = await conn.prepare('insert into #test (id, name) values (?, ?)');
    await conn.exec(p, [1, 'test 1']);
    await conn.exec(p, [2, 'test 2']);
    const [{ cnt }] = await conn.execImmediate('select count() as cnt from #test');
    expect(cnt).equals(2);

    await conn.disconnect();

  });

});
