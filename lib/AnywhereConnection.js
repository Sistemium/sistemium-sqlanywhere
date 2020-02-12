import log from 'sistemium-telegram/services/log';
import { fork } from 'child_process';

const { debug } = log('AnywhereConnection');

export default class AnywhereConnection {

  connect(params) {

    this.process = fork(`${__dirname}/anywhereProcess.js`);
    // this.process.on('message', msg => debug('got:message', msg));

    return new Promise((resolve, reject) => {
      this.send('MSG_CONNECT', params);
      this.once('connected', resolve, reject);
    });
  }

  send(type, params) {
    this.process.send({ type, params });
  }

  once(type, handler, errorHandler) {

    const callback = payload => {

      debug('once:message', payload);

      if (payload === type || payload[type]) {
        this.process.off('message', callback);
        handler(payload[type] || payload);
      } else if (payload.error) {
        this.process.off('message', callback);
        errorHandler(payload.error);
      }

    };

    this.process.on('message', callback);

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
    this.send('MSG_DISCONNECT');
    this.once('disconnected', () => onFulfill(), onFulfill);
  }

  // prepare() {
  //
  // }
  //
  commit(callback) {
    this.send('MSG_COMMIT');
    this.once('committed', () => callback(), callback);
  }

  rollback(callback) {
    this.send('MSG_ROLLBACK');
    this.once('rolled_back', () => callback(), callback);
  }

  exec(sql, values, callback) {
    this.send('MSG_EXECUTE', { sql, values });
    this.once('executed', res => callback(null, res), callback);
  }

}
