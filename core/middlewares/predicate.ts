
import type { LogMessage } from "../logger.ts";
import type { LogMiddleware } from "../middleware.ts";

export class PredicateMiddleware<LogLevel extends string> implements LogMiddleware<LogLevel> {
  constructor(
    private predicate: (message: LogMessage<LogLevel>) => boolean
  ) {}

  log(message: LogMessage<LogLevel>, next: (message: LogMessage<LogLevel>) => void): void {
    if (this.predicate(message)) {
      next(message);
    }
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }
}
