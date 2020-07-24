
export const LOG_CONFIG: string = 'LOG_CONFIG';

export enum LogLevel {
  TRACE = 4,
  DEBUG = 3,
  INFO  = 2,
  WARN  = 1,
  ERROR = 0,
}

export interface LogConfig {
  logLevel: LogLevel;
}

export abstract class LoggerApi {
  abstract info(message: string, context?: object);
  abstract warn(message: string, context?: object);
  abstract error(message: string, context?: object);
  abstract debug(message: string, context?: object);
  abstract trace(message: string, context?: object);
  abstract child(component: string): LoggerApi;
}
