import type { LogMessage } from "./logger.ts";


export interface LogMiddleware<LogLevel extends string> {
  log(message: LogMessage<LogLevel>, next: (message: LogMessage<LogLevel>) => void): void;
  
  flush(): Promise<void>;
}
