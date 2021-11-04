export default class AnywhereError extends Error {
    constructor({ text, code }: {
        text: any;
        code: any;
    });
    code: any;
}
