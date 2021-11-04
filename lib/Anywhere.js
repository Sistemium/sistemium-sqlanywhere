import { nsLog } from 'sistemium-debug';
import AnywhereConnection from './AnywhereConnection';
// import AnywhereError from './AnywhereError';

const { debug, error } = nsLog('stm-sa');

const { SQLA_CONNECTION } = process.env;

export default class Anywhere {

  /**
   * Init
   * @param {string} [connParams]
   */

  constructor(connParams = SQLA_CONNECTION) {
    this.connParams = connParams;
    /**
     * @type {AnywhereConnection}
     * @private
     */
    this.connection = new AnywhereConnection();
    /**
     * @private
     * @type {{}}
     */
    this.statements = {};
  }

  /**
   * Connect with optional params
   * @param {string} [connParams]
   * @returns {Promise<boolean>}
   */

  async connect(connParams) {
    return this.connection.connect(connParams || this.connParams);
  }

  /**
   * Disconnect
   * @returns {Promise<unknown>}
   */

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

  /**
   * Prepare statement
   * @param sql
   * @returns {Promise<number>}
   */

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

  /**
   * Commit transaction
   * @returns {Promise<unknown>}
   */

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

  /**
   * Rollback transaction
   * @returns {Promise<unknown>}
   */

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

  /**
   * Execute statement with optional values array
   * @param {string} sql
   * @param {any[]} [values]
   * @returns {Promise<unknown>}
   */

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

  /**
   * Execute prepared
   * @param {number} preparedId
   * @param {any[]} [values]
   * @returns {Promise<unknown>}
   */

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

  /**
   * Drop prepared statement
   * @param {string} sql
   * @returns {Promise<unknown>}
   */

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
