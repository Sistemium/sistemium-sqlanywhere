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
const MSG_PREPARE = 'MSG_PREPARE';
const MSG_DROP_PREPARED = 'MSG_DROP_PREPARED';
const MSG_EXEC_PREPARED = 'MSG_EXEC_PREPARED';

let connectedAt;
const { debug } = log('anywhereProcess');

const PREPARED_MAP = new Map();

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

function executePrepared(id, { preparedId, values }) {

  const prepared = PREPARED_MAP.get(preparedId);

  if (!prepared) {
    process.send({ id, error: { text: `Not prepared id ${preparedId}` } });
    return;
  }

  debug('executingPrepared', id, preparedId);

  prepared.exec(values, checkResult(id, result => {

    debug('executed', id, result && result.length || result);
    process.send({ id, type: 'executed', result });

  }));

}

function taskNoResult(id, name, successName) {

  conn[name](checkResult(id, () => {
    process.send({ id, type: successName });
  }));

}

function prepare(id, sql) {

  conn.prepare(sql, checkResult(id, prepared => {
    PREPARED_MAP.set(id, prepared);
    process.send({ id, type: 'prepared', result: id });
  }));

}

function dropPrepared(id, preparedId) {

  const prepared = PREPARED_MAP.get(preparedId);

  if (!prepared) {
    process.send({ id, error: { text: `Not prepared id ${preparedId}` } });
    return;
  }

  prepared.drop(checkResult(id, () => {
    PREPARED_MAP.delete(preparedId);
    process.send({ id, type: 'dropped' });
  }));

}

process.on('message', ({ type, requestId, params }) => {

  switch (type) {

    case MSG_PREPARE:
      return prepare(requestId, params);

    case MSG_DROP_PREPARED:
      return dropPrepared(requestId, params);

    case MSG_EXEC_PREPARED:
      return executePrepared(requestId, params);

    case MSG_CONNECT:
      return connect(requestId, params);

    case MSG_DISCONNECT:
      return disconnect(requestId);

    case MSG_EXECUTE:
      return execute(requestId, params);

    case MSG_COMMIT:
      return taskNoResult(requestId, 'commit', 'committed');

    case MSG_ROLLBACK:
      return taskNoResult(requestId, 'rollback', 'rolled_back');

    default:
      debug(requestId, type, params);
      return null;
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
