import { nsLog } from 'sistemium-telegram/services/log';
import { fork } from 'child_process';

const { debug } = nsLog('stm-sa:connection');

export default class AnywhereConnection {

  constructor() {
    this.requestCount = 0;
  }

  connect(params) {

    this.process = fork(`${__dirname}/anywhereProcess.js`);

    return new Promise((resolve, reject) => {
      this.send('MSG_CONNECT', params, err => {
        if (err) {
          reject(err);
        } else {
          resolve(true);
        }
      });
    });

  }

  send(type, params, callback) {

    this.requestCount += 1;

    const { requestCount: requestId } = this;

    const onMessage = payload => {

      if (payload.id !== requestId) {
        return;
      }

      this.process.removeListener('message', onMessage);

      const { type: responseType, result, error } = payload;

      debug(responseType || type, requestId, error ? 'error' : 'success');

      callback(error, result);

    };

    this.process.on('message', onMessage);

    this.process.send({
      type,
      params,
      requestId,
    });

  }

  destroy() {
    this.process.disconnect();
    this.process = null;
  }

  disconnect(callback) {
    const onFulfill = err => {
      this.destroy();
      callback(err);
    };
    this.send('MSG_DISCONNECT', null, onFulfill);
  }

  prepare(sql, callback) {
    this.send('MSG_PREPARE', sql, callback);
  }

  dropPrepared(preparedId, callback) {
    this.send('MSG_DROP_PREPARED', preparedId, callback);
  }

  execPrepared(preparedId, values, callback) {
    this.send('MSG_EXEC_PREPARED', { preparedId, values }, callback);
  }

  commit(callback) {
    this.send('MSG_COMMIT', null, callback);
  }

  rollback(callback) {
    this.send('MSG_ROLLBACK', null, callback);
  }

  exec(sql, values, callback) {
    const params = { sql, values };
    this.send('MSG_EXECUTE', params, callback);
  }

}
