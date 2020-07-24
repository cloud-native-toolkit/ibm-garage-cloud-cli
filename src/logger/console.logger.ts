import {InjectValue} from 'typescript-ioc';

import {LOG_CONFIG, LogConfig, LoggerApi, LogLevel} from './logger.api';

export class ConsoleLogger implements LoggerApi {
  constructor(@InjectValue(LOG_CONFIG) public readonly config: LogConfig) {
  }

  get logLevel(): LogLevel {
    return this.config.logLevel || LogLevel.INFO;
  }

  child(component: string): LoggerApi {
    return this;
  }

  trace(message: string, context?: object) {
    if (this.logLevel >= LogLevel.TRACE) {
      console.log(message, context);
    }
  }

  debug(message: string, context?: object) {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.log(message, context);
    }
  }

  error(message: string, context?: object) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.log(message, context);
    }
  }

  info(message: string, context?: object) {
    if (this.logLevel >= LogLevel.ERROR) {
      console.log(message, context);
    }
  }

  warn(message: string, context?: object) {
    if (this.logLevel >= LogLevel.WARN) {
      console.log(message, context);
    }
  }
}