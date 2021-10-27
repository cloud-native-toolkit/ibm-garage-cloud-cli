import {from, interval, takeUntil} from 'rxjs';
import {Logger} from './logger';


const progressBar = (logger: Logger, progressInterval: number = 1000) => {
  return <T = any>(promise: Promise<T>, message?: string): Promise<T> => {
    if (message) {
      logger.logn(message);
    }

    interval(progressInterval)
      .pipe(takeUntil(from(promise)))
      .subscribe({
        next: () => logger.logn('.'),
        complete: () => logger.log('')
      });

    return promise;
  }
};

export default progressBar;
