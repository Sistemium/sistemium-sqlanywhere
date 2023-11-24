import { nsLog } from 'sistemium-debug';
import { ChildProcess, fork } from 'child_process';

import AnywhereError from './AnywhereError';

const { debug } = nsLog('stm-sa:connection');

export type ResultCallback = (err: any, result?: any) => void

interface MessagePayload {
  id: number
  type: string
  result: any
  error: any
}

export default class AnywhereConnection {

  requestCount: number = 0;
  process?: ChildProcess | null;

  async connect(params?: string): Promise<true> {

    this.process = fork(`${__dirname}/anywhereProcess.js`);

    return new Promise<true>((resolve, reject) => {
      this.send('MSG_CONNECT', params, err => {
        if (err) {
          this.destroy();
          reject(err);
        } else {
          resolve(true);
        }
      });
    });

  }

  send(type: string, params: any, callback: ResultCallback) {

    this.requestCount += 1;

    if (!this.process) {
      callback(new AnywhereError({ text: 'Process disconnected' }), null);
      return;
    }

    const { requestCount: requestId } = this;

    const onMessage = (payload: MessagePayload) => {

      if (payload.id !== requestId) {
        return;
      }

      this.process?.removeListener('message', onMessage);

      const { type: responseType, result, error } = payload;

      debug(responseType || type, requestId, error ? 'error' : 'success');

      if (error) {
        callback(new AnywhereError(error), result);
      } else {
        callback(null, result);
      }

    };

    this.process.on('message', onMessage);

    this.process.send({
      type,
      params,
      requestId,
    });

  }

  destroy() {
    this.process?.disconnect();
    this.process = null;
  }

  disconnect(callback: ResultCallback) {
    const onFulfill = (err: any) => {
      this.destroy();
      callback(err);
    };
    this.send('MSG_DISCONNECT', null, onFulfill);
  }

  prepare(sql: string, callback: ResultCallback) {
    this.send('MSG_PREPARE', sql, callback);
  }

  dropPrepared(preparedId: number, callback: ResultCallback) {
    this.send('MSG_DROP_PREPARED', preparedId, callback);
  }

  execPrepared(preparedId: number, values: any[], callback: ResultCallback) {
    this.send('MSG_EXEC_PREPARED', { preparedId, values }, callback);
  }

  commit(callback: ResultCallback) {
    this.send('MSG_COMMIT', null, callback);
  }

  rollback(callback: ResultCallback) {
    this.send('MSG_ROLLBACK', null, callback);
  }

  exec(sql: string, values: any[], callback: ResultCallback) {
    const params = { sql, values };
    this.send('MSG_EXECUTE', params, callback);
  }

}
