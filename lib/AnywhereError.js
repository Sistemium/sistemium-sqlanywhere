const msgRe = /Code: ([^ ]*) Msg: (.*)/;

export default class AnywhereError extends Error {

  constructor({ text, code }) {

    super();

    this.message = text;
    this.code = code;

  }

}
