// Connects, starts a long query and prints the pid of its anywhereProcess child,
// so a test can kill this parent and check that the child does not outlive it

const Anywhere = require('../../lib/Anywhere').default;

const conn = new Anywhere('host=fake');

conn.connect()
  .then(() => {
    conn.execImmediate('sleep').catch(() => null);
    process.stdout.write(`${conn.connection.process.pid}\n`);
  });
