import db from 'sqlanywhere';
import log from 'sistemium-telegram/services/log';

const { debug, error } = log('anywhere');

const { SQLA_CONNECTION } = process.env;

const msgRe = /Code: ([^ ]*) Msg: (.*)/;

class AnywhereError extends Error {

  constructor(saError) {

    super();

    const message = saError.toString();

    this.message = message;

    if (message) {
      const [, code, text] = message.match(msgRe);
      this.code = code;
      this.text = text;
    }

  }

}

export default class Anywhere {

  constructor(connParams = SQLA_CONNECTION) {
    this.connParams = connParams;
    this.connection = db.createConnection();
    this.statements = {};
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.connection.connect(this.connParams, err => {
        debug('connected', !err);
        if (!err) {
          resolve();
        } else {
          error('connected', err);
          reject(err);
        }
      });
    });
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

  async exec(prepared, values) {

    return new Promise((resolve, reject) => {

      prepared.exec(values, async (err, res) => {

        if (!err) {
          // debug('exec', res);
          await this.commit();
          resolve(res);
        } else {
          error('exec', err);
          await this.rollback();
          reject(new AnywhereError(err));
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

      prepared.drop(err => {

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
