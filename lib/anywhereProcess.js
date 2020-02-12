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

function checkResult(id, callback) {
  return (err, result = true) => {
    if (err) {
      process.send({ id, error: parseError(err) });
    } else {
      callback(result);
    }
  };
}

function connect(id, connParams) {

  conn.connect(connParams, checkResult(id, () => {

    connectedAt = new Date();
    process.send({ id, type: 'connected' });

  }));

}

function disconnect(id) {

  conn.disconnect(checkResult(id, () => {

    // debug('disconnect', connectedAt - new Date());
    connectedAt = null;
    process.send({ id, type: 'disconnected' });

  }));

}

function execute(id, { sql, values }) {

  debug('executing', id);

  conn.exec(sql, values, checkResult(id, result => {

    debug('executed', id, result && result.length || result);
    process.send({ id, type: 'executed', result });

  }));

}


function taskNoResult(id, name, onSuccess) {

  conn[name](checkResult(id, () => {
    process.send({ id, type: [onSuccess] });
  }));

}

process.on('message', ({ type, requestId, params }) => {

  switch (type) {

    case MSG_CONNECT: {
      connect(requestId, params);
      return;
    }

    case MSG_DISCONNECT: {
      disconnect(requestId);
      return;
    }

    case MSG_EXECUTE: {
      execute(requestId, params);
      return;
    }

    case MSG_COMMIT: {
      taskNoResult(requestId, 'commit', 'committed');
      return;
    }

    case MSG_ROLLBACK: {
      taskNoResult(requestId, 'rollback', 'rolled_back');
      return;
    }

    default:
      debug(requestId, type, params);

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
