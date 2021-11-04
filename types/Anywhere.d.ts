export default class Anywhere {
    /**
     * Init
     * @param {string} [connParams]
     */
    constructor(connParams?: string);
    connParams: string;
    /**
     * @type {AnywhereConnection}
     * @private
     */
    private connection;
    /**
     * @private
     * @type {{}}
     */
    private statements;
    /**
     * Connect with optional params
     * @param {string} [connParams]
     * @returns {Promise<boolean>}
     */
    connect(connParams?: string): Promise<boolean>;
    /**
     * Disconnect
     * @returns {Promise<unknown>}
     */
    disconnect(): Promise<unknown>;
    /**
     * Prepare statement
     * @param sql
     * @returns {Promise<number>}
     */
    prepare(sql: any): Promise<number>;
    /**
     * Commit transaction
     * @returns {Promise<unknown>}
     */
    commit(): Promise<unknown>;
    /**
     * Rollback transaction
     * @returns {Promise<unknown>}
     */
    rollback(): Promise<unknown>;
    /**
     * Execute statement with optional values array
     * @param {string} sql
     * @param {any[]} [values]
     * @returns {Promise<unknown>}
     */
    execImmediate(sql: string, values?: any[]): Promise<unknown>;
    /**
     * Execute prepared
     * @param {number} preparedId
     * @param {any[]} [values]
     * @returns {Promise<unknown>}
     */
    exec(preparedId: number, values?: any[]): Promise<unknown>;
    /**
     * Drop prepared statement
     * @param {string} sql
     * @returns {Promise<unknown>}
     */
    dropPrepared(sql: string): Promise<unknown>;
}
