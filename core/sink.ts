import type { LogMessage } from "./logger.ts";


export interface LogSink<LogLevel> {
  log(message: LogMessage<LogLevel>): void;
  flush(): Promise<void>;
}
