import log from 'sistemium-telegram/services/log';
import { fork } from 'child_process';

const { debug } = log('AnywhereConnection');

export default class AnywhereConnection {

  constructor() {
    this.requestCount = 0;
  }

  connect(params) {

    this.process = fork(`${__dirname}/anywhereProcess.js`);
    // this.process.on('message', msg => debug('got:message', msg));

    return new Promise((resolve, reject) => {
      this.send('MSG_CONNECT', params, resolve, reject);
    });

  }

  send(type, params, onSuccess, onError) {

    this.requestCount += 1;

    const { requestCount: requestId } = this;

    const callback = payload => {

      if (payload.id !== requestId) {
        return;
      }

      this.process.removeListener('message', callback);

      const { type: responseType, result, error } = payload;

      debug(responseType, requestId, error ? 'error' : 'success');

      if (error) {
        onError(error);
      } else {
        onSuccess(result);
      }

    };

    this.process.on('message', callback);

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
    this.send('MSG_DISCONNECT', null, () => onFulfill(), onFulfill);
  }

  // prepare() {
  //
  // }
  //
  commit(callback) {
    this.send('MSG_COMMIT', null, () => callback(), callback);
  }

  rollback(callback) {
    this.send('MSG_ROLLBACK', null, () => callback(), callback);
  }

  exec(sql, values, callback) {
    const params = { sql, values };
    this.send('MSG_EXECUTE', params, res => callback(null, res), callback);
  }

}
