
export enum ErrorSeverity {
  WARNING = 'Warning',
  ERROR = 'Error',
  FATAL = 'Fatal'
}

export interface ErrorType {
  readonly name: string;
  readonly severity: ErrorSeverity;
}

export class CommandError extends Error {
  readonly type: ErrorType;

  constructor(message: string, type: ErrorType) {
    super(message);

    this.type = type;
  }
}

export function isCommandError(error: Error | CommandError): error is CommandError {
  return (error as CommandError).type !== undefined
    && (error as CommandError).type.severity !== undefined;
}
