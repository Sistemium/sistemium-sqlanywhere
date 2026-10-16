import { nsLog } from 'sistemium-debug';
import { ChildProcess, fork } from 'child_process';

import AnywhereError from './AnywhereError';

const { debug, error } = nsLog('stm-sa:connection');

const DISCONNECTED = 'Process disconnected';

export type ResultCallback = (err: any, result?: any) => void

interface MessagePayload {
  id: number
  type: string
  result: any
  error: any
}

interface PendingRequest {
  type: string
  callback: ResultCallback
}

export default class AnywhereConnection {

  requestCount: number = 0;
  process?: ChildProcess | null;
  private pending = new Map<number, PendingRequest>();

  async connect(params?: string): Promise<true> {

    // do not orphan the child of a previous connect
    this.destroy();

    // structured clone instead of JSON keeps the types of results, e.g. Buffers of binary columns
    const child = fork(`${__dirname}/anywhereProcess.js`, [], { serialization: 'advanced' });
    this.process = child;

    child.on('message', (payload: MessagePayload) => this.onMessage(payload));

    // the child has died or can't be talked to: nobody is going to answer pending requests
    const onGone = (reason: any) => {
      if (this.process !== child) {
        // destroyed on purpose
        return;
      }
      error('process gone', reason);
      this.destroy();
    };

    child.on('error', onGone);
    child.once('disconnect', () => onGone('disconnect'));
    child.once('exit', (code, signal) => onGone(`exit ${signal || code}`));

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

    const { process: child, requestCount: requestId } = this;

    if (!child) {
      callback(new AnywhereError({ text: DISCONNECTED }), null);
      return;
    }

    this.pending.set(requestId, { type, callback });

    child.send({
      type,
      params,
      requestId,
    }, err => {
      if (err && this.pending.delete(requestId)) {
        debug(type, requestId, err.message);
        callback(new AnywhereError({ text: DISCONNECTED }), null);
      }
    });

  }

  private onMessage(payload: MessagePayload) {

    const { id: requestId, type: responseType, result, error: err } = payload;
    const request = this.pending.get(requestId);

    if (!request) {
      return;
    }

    this.pending.delete(requestId);

    debug(responseType || request.type, requestId, err ? 'error' : 'success');

    if (err) {
      request.callback(new AnywhereError(err), result);
    } else {
      request.callback(null, result);
    }

  }

  destroy() {

    const { process: child } = this;
    this.process = null;

    if (child) {
      if (child.connected) {
        child.disconnect();
      }
      // the child exits on disconnect by itself, this is for one which is stuck
      if (child.exitCode === null && child.signalCode === null) {
        child.kill();
      }
    }

    const pending = Array.from(this.pending.values());
    this.pending.clear();

    pending.forEach(({ callback }) => callback(new AnywhereError({ text: DISCONNECTED }), null));

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
    this.send('MSG_EXEC_PREPARED', { preparedId, values: bindValues(values) }, callback);
  }

  commit(callback: ResultCallback) {
    this.send('MSG_COMMIT', null, callback);
  }

  rollback(callback: ResultCallback) {
    this.send('MSG_ROLLBACK', null, callback);
  }

  exec(sql: string, values: any[], callback: ResultCallback) {
    const params = { sql, values: bindValues(values) };
    this.send('MSG_EXECUTE', params, callback);
  }

}

/**
 * The driver binds only numbers, strings, Buffers and nulls.
 * JSON serialization used to turn undefined and NaN into null and Dates into strings,
 * so it is done here as the advanced serialization passes them as they are
 */

function bindValues(values: any[]): any[] {
  return Array.isArray(values) ? values.map(toBindValue) : values;
}

function toBindValue(value: any): any {
  if (Array.isArray(value)) {
    // a row of a wide statement
    return value.map(toBindValue);
  }
  if (value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    return null;
  }
  if (value && typeof value.toJSON === 'function' && !Buffer.isBuffer(value)) {
    return value.toJSON();
  }
  return value;
}
