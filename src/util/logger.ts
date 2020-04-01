export interface Logger {
  text: string;
  stop(): void;
}

export class VerboseLogger implements Logger {

  set text(text) {
    console.log(text);
  }
  stop() {}
}