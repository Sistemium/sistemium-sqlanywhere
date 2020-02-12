// require('epipebomb')();

const log = require('sistemium-telegram/services/log').default;
const sqlanywhere = require('sqlanywhere');

// const connParams = process.argv[2];
const conn = sqlanywhere.createConnection();

errorHandling(conn);

const MSG_CONNECT = 'MSG_CONNECT';
const MSG_DISCONNECT = 'MSG_DISCONNECT';
const MSG_EXECUTE = 'MSG_EXECUTE';
const MSG_ROLLBACK = 'MSG_ROLLBACK';
const MSG_COMMIT = 'MSG_COMMIT';

let connectedAt;
const { debug } = log('anywhereProcess');

// require('./errorHandlers')(conn);
// conn.name = process.argv.length > 3 ? process.argv[3] : 'unnamed';

function parseError(saError) {

  const err = saError.toString();

  try {
    return {
      code: err.match(/Code: ([^ ]*)/)[1],
      text: err.match(/Msg: (.*)/)[1],
    };
  } catch (e) {
    return {
      code: '',
      text: err,
    };
  }

}

function connect(connParams) {

  conn.connect(connParams, err => {

    if (err) {
      process.send({ error: parseError(err) });
      return;
    }

    connectedAt = new Date();
    process.send('connected');

  });

}

function disconnect() {

  conn.disconnect(err => {

    if (err) {
      process.send({ error: parseError(err) });
      return;
    }

    // debug('disconnect', connectedAt - new Date());
    connectedAt = null;
    process.send('disconnected');

  });

}

function execute({ sql, values }) {

  debug('executing', sql);

  conn.exec(sql, values, (err, executed = true) => {

    if (err) {
      process.send({ error: parseError(err) });
      return;
    }

    debug('executed', executed && executed.length || executed);
    process.send({ executed });

  });
}


function taskNoResult(name, onSuccess) {

  conn[name](err => {

    if (err) {
      process.send({ error: parseError(err) });
      return;
    }

    process.send(onSuccess);

  });

}

process.on('message', ({ type, params }) => {

  switch (type) {

    case MSG_CONNECT: {
      connect(params);
      return;
    }

    case MSG_DISCONNECT: {
      disconnect();
      return;
    }

    case MSG_EXECUTE: {
      execute(params);
      return;
    }

    case MSG_COMMIT: {
      taskNoResult('commit', 'committed');
      return;
    }

    case MSG_ROLLBACK: {
      taskNoResult('rollback', 'rolled_back');
      return;
    }

    default:
      debug(type, params);

  }

});

function errorHandling() {

  function killer() {

    debug('killer', 'conn name:', conn.name || 'unnamed');

    if (connectedAt) {
      conn.disconnect(() => {
        process.exit();
      });
    } else {
      process.exit();
    }

  }

  process.on('close', () => {
    debug('closed');
  });

  process.on('exit', () => {
    debug('exit');
  });

  // process.on('disconnect', killer);
  process.on('SIGINT', killer);
  process.on('SIGTERM', killer);

}
