import {Container} from 'typescript-ioc';
import {LOG_CONFIG, LoggerApi, LogLevel} from './logger.api';
import {ConsoleLogger} from './console.logger';

export * from './logger.api';

Container.bind(LoggerApi).to(ConsoleLogger);
Container.bindName(LOG_CONFIG).to({
  logLevel: LogLevel.INFO,
});
