export interface StagePrinter {
  asString(stages: {[name: string]: {name: string}}): string;
}

export interface IBaseVariable {
  name: string;
  description?: string;
  type?: string;
  defaultValue?: string;
}

export interface BaseVariable extends IBaseVariable, StagePrinter {
}
