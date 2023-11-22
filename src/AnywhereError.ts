// const msgRe = /Code: ([^ ]*) Msg: (.*)/;

export interface IAError {
  text: string
  code?: string
}

export default class AnywhereError extends Error {

  code?: string;

  constructor(e: IAError) {
    super();
    const { text, code } = e;
    this.message = text;
    this.code = code;
  }

}
