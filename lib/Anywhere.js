import { nsLog } from 'sistemium-telegram/services/log';
import AnywhereConnection from './AnywhereConnection';
// import AnywhereError from './AnywhereError';

const { debug, error } = nsLog('stm-sa');

const { SQLA_CONNECTION } = process.env;

export default class Anywhere {

  constructor(connParams = SQLA_CONNECTION) {
    this.connParams = connParams;
    this.connection = new AnywhereConnection();
    this.statements = {};
  }

  async connect() {
    return this.connection.connect(this.connParams);
  }

  async disconnect() {
    return new Promise((resolve, reject) => {

      this.statements = {};
      this.connection.disconnect(err => {
        debug('disconnect', !err);
        if (!err) {
          resolve();
        } else {
          error('disconnect', err);
          reject(err);
        }
      });
    });
  }

  async prepare(sql) {

    const prepared = this.statements[sql];

    if (prepared) {
      return prepared;
    }

    return new Promise((resolve, reject) => {
      this.connection.prepare(sql, (err, stmt) => {
        if (!err) {
          this.statements[sql] = stmt;
          resolve(stmt);
        } else {
          error('prepare', err);
          reject(err);
        }
      });
    });

  }

  async commit() {

    return new Promise((resolve, reject) => {
      this.connection.commit(err => {
        if (!err) {
          resolve();
        } else {
          error('commit', err);
          reject(err);
        }
      });
    });

  }

  async rollback() {

    return new Promise((resolve, reject) => {
      this.connection.rollback(err => {
        if (!err) {
          resolve();
        } else {
          error('commit', err);
          reject(err);
        }
      });
    });

  }

  async execImmediate(sql, values = []) {

    return new Promise((resolve, reject) => {

      this.connection.exec(sql, values, (err, res) => {

        if (!err) {
          resolve(res);
        } else {
          error('exec', err);
          reject(err);
        }

      });

    });

  }

  async exec(preparedId, values) {

    return new Promise((resolve, reject) => {

      this.connection.execPrepared(preparedId, values, async (err, res) => {

        if (!err) {
          await this.commit();
          resolve(res);
        } else {
          error('exec', err);
          await this.rollback();
          reject(err);
        }

      });

    });

  }

  async dropPrepared(sql) {

    const prepared = this.statements[sql];

    if (!prepared) {
      return false;
    }

    return new Promise((resolve, reject) => {

      delete this.statements[sql];

      this.connection.dropPrepared(prepared, err => {

        if (!err) {
          resolve(true);
        } else {
          error('exec', err);
          reject(err);
        }

      });

    });

  }

}
