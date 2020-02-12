const msgRe = /Code: ([^ ]*) Msg: (.*)/;

export default class AnywhereError extends Error {

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
