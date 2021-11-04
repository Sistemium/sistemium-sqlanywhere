export default class AnywhereConnection {
    requestCount: number;
    connect(params: any): Promise<any>;
    process: any;
    send(type: any, params: any, callback: any): void;
    destroy(): void;
    disconnect(callback: any): void;
    prepare(sql: any, callback: any): void;
    dropPrepared(preparedId: any, callback: any): void;
    execPrepared(preparedId: any, values: any, callback: any): void;
    commit(callback: any): void;
    rollback(callback: any): void;
    exec(sql: any, values: any, callback: any): void;
}
