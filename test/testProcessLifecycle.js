const { expect } = require('chai');
const { spawn } = require('child_process');
const path = require('path');
const Anywhere = require('../lib/Anywhere').default;
const {
  trackForks, exited, isAlive, pidExited,
} = require('./support/processes');

// Runs without the SQL Anywhere client: the forked anywhereProcess gets the fake driver

const FAKE_DRIVER = path.join(__dirname, 'support', 'fakeSqlanywhere.js');
const BUSY_PARENT = path.join(__dirname, 'support', 'busyParent.js');
const DISCONNECTED = 'Process disconnected';
const { NODE_OPTIONS } = process.env;

describe('Anywhere child process lifecycle', function () {

  let forked;

  before(function () {
    process.env.NODE_OPTIONS = [NODE_OPTIONS, `--require ${JSON.stringify(FAKE_DRIVER)}`]
      .filter(Boolean)
      .join(' ');
  });

  after(function () {
    if (NODE_OPTIONS === undefined) {
      delete process.env.NODE_OPTIONS;
    } else {
      process.env.NODE_OPTIONS = NODE_OPTIONS;
    }
  });

  beforeEach(function () {
    forked = trackForks();
  });

  afterEach(function () {
    forked.restore();
    // do not leave anything behind when a test fails
    forked.forEach(child => child.kill('SIGKILL'));
  });

  it('should not leave a child process after a failed connect', async function () {

    const conn = new Anywhere('host=unreachable');

    await conn.connect()
      .then(unexpected)
      .catch(expectErr('Database server not found'));

    expect(forked).to.have.length(1);
    await exited(forked[0]);

    await conn.disconnect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

  });

  it('should not leave a child process after disconnect', async function () {

    const conn = new Anywhere('host=fake');
    await conn.connect();
    expect(await conn.execImmediate('select 1')).eql([{ sql: 'select 1' }]);
    await conn.disconnect();

    expect(forked).to.have.length(1);
    await exited(forked[0]);

  });

  it('should reject connect if the child process dies', async function () {

    const conn = new Anywhere('host=crash');

    await conn.connect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

    await exited(forked[0]);

    await conn.disconnect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

  });

  it('should reject pending and further requests if the child process dies', async function () {

    const conn = new Anywhere('host=fake');
    await conn.connect();

    await conn.execImmediate('crash')
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

    await exited(forked[0]);

    await conn.execImmediate('select 1')
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

    await conn.disconnect()
      .then(unexpected)
      .catch(expectErr(DISCONNECTED));

  });

  it('should not leave the previous child process on reconnect', async function () {

    const conn = new Anywhere('host=fake');
    await conn.connect();
    await conn.connect();

    expect(forked).to.have.length(2);
    await exited(forked[0]);
    expect(isAlive(forked[1].pid)).equals(true);

    await conn.disconnect();
    await exited(forked[1]);

  });

  it('should exit the child process when the parent dies', async function () {

    this.timeout(5000);

    const parent = spawn(process.execPath, [BUSY_PARENT], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    const childPid = await new Promise((resolve, reject) => {
      parent.stdout.once('data', data => resolve(parseInt(data.toString(), 10)));
      parent.once('exit', code => reject(new Error(`Parent exited with ${code}`)));
    });

    try {
      expect(isAlive(childPid)).equals(true);
      parent.kill('SIGKILL');
      await pidExited(childPid);
    } finally {
      if (isAlive(childPid)) {
        process.kill(childPid, 'SIGKILL');
      }
    }

  });

});

function unexpected() {
  throw Error('Unexpected success');
}

function expectErr(message) {
  return e => expect(e.message).equals(message);
}
