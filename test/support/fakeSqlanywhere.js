// Fake 'sqlanywhere' driver for the process lifecycle tests.
// Preloaded into the forked anywhereProcess with NODE_OPTIONS=--require,
// it replaces the native module, which needs the SQL Anywhere client.
// The connection string picks the behaviour: host=unreachable fails to connect,
// host=crash kills the process while connecting, anything else connects.

const Module = require('module');
const crypto = require('crypto');

const SERVER_NOT_FOUND = 'Code: -100 Msg: Database server not found';

function createConnection() {

  // resolves when the 'block' query ends
  let running = Promise.resolve();

  return {

    connect(params, cb) {
      if (/host=unreachable/i.test(params)) {
        setTimeout(() => cb(new Error(SERVER_NOT_FOUND)), 10);
      } else if (/host=crash/i.test(params)) {
        process.exit(13);
      } else {
        setImmediate(cb, null);
      }
    },

    disconnect(cb) {
      // the native driver disconnects only after the running query
      running.then(() => setImmediate(cb, null));
    },

    exec(sql, values, cb) {
      if (sql === 'crash') {
        process.exit(13);
      } else if (sql === 'sleep') {
        // a long query keeps the event loop busy like the native driver does
        setTimeout(cb, 60000, null, []);
      } else if (sql === 'block') {
        // the native driver runs a query on a thread of the libuv pool,
        // which process.exit() waits for, so does this one for minutes
        running = new Promise(resolve => {
          crypto.pbkdf2('fake', 'salt', 1e9, 64, 'sha512', () => {
            resolve();
            cb(null, []);
          });
        });
      } else {
        setImmediate(cb, null, [{ sql }]);
      }
    },

    commit(cb) {
      setImmediate(cb, null);
    },

    rollback(cb) {
      setImmediate(cb, null);
    },

  };

}

const { _load: load } = Module;

Module._load = function fakeLoad(request, ...args) {
  if (request === 'sqlanywhere') {
    return { createConnection };
  }
  return load.call(this, request, ...args);
};
