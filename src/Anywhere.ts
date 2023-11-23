import { nsLog } from 'sistemium-debug';
import AnywhereConnection from './AnywhereConnection';
// import AnywhereError from './AnywhereError';

const { debug, error } = nsLog('stm-sa');

const { SQLA_CONNECTION } = process.env;

export default class Anywhere {

  connParams?: string;
  private connection: AnywhereConnection = new AnywhereConnection();
  statements: Record<string, any> = {};
  autoCommit: boolean = false;

  constructor(connParams?: string) {
    this.connParams = connParams || SQLA_CONNECTION;
  }

  /**
   * Connect with optional params
   */

  async connect(connParams?: string): Promise<boolean> {
    return this.connection.connect(connParams || this.connParams);
  }

  /**
   * Disconnect
   */

  async disconnect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {

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
   */

  async prepare(sql: string): Promise<number> {

    const prepared = this.statements[sql];

    if (prepared) {
      return prepared;
    }

    return new Promise<number>((resolve, reject) => {
      this.connection.prepare(sql, (err: any, stmt: number) => {
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
   */

  async commit(): Promise<void> {

    return new Promise<void>((resolve, reject) => {
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
   */

  async rollback(): Promise<void> {

    return new Promise<void>((resolve, reject) => {
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
   */

  async execImmediate(sql: string, values: any[] = []): Promise<any> {

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
   */

  async exec(preparedId: number, values: any[]): Promise<any> {

    return new Promise((resolve, reject) => {

      this.connection.execPrepared(preparedId, values, async (err, res) => {

        if (!err) {
          if (this.autoCommit) {
            await this.commit();
          }
          resolve(res);
        } else {
          error('exec', err);
          if (this.autoCommit) {
            await this.rollback();
          }
          reject(err);
        }

      });

    });

  }

  /**
   * Drop prepared statement
   */

  async dropPrepared(sql: string): Promise<boolean> {

    const prepared = this.statements[sql];

    if (!prepared) {
      return false;
    }

    return new Promise<true>((resolve, reject) => {
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
