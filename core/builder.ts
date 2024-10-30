import type { LogMessage } from "./logger.ts";
import type { LogMiddleware } from "./middleware.ts";
import type { LogSink } from "./sink.ts";

import { LogPipelineImpl } from "./pipeline.ts";
import { PredicateMiddleware } from "./middlewares/predicate.ts";

export interface LogPiplineBuilder<LogLevel extends string> {
  fork(): LogPiplineBuilder<LogLevel>;
  use(middleware: LogMiddleware<LogLevel>): void;
  when(
    predicate: (message: LogMessage<LogLevel>) => boolean,
    configure: (builder: LogPiplineBuilder<LogLevel>) => void
  ): void,
  sendTo(sink: LogSink<LogLevel>): void;
}

export class LogPipelineBuilderImpl<LogLevel extends string> implements LogPiplineBuilder<LogLevel> {
  private readonly middlewares: LogMiddleware<LogLevel>[] = [];
  private readonly sinks: LogSink<LogLevel>[] = [];
  private readonly children: LogPipelineBuilderImpl<LogLevel>[] = [];

  fork(): LogPiplineBuilder<LogLevel> {
      const child = new LogPipelineBuilderImpl<LogLevel>();
      this.children.push(child);

      return child;
  }

  use(middleware: LogMiddleware<LogLevel>): void {
      this.middlewares.push(middleware);
  }

  sendTo(sink: LogSink<LogLevel>): void {
      this.sinks.push(sink);
  }
  
  when(
    predicate: (message: LogMessage<LogLevel>) => boolean,
    configure: (builder: LogPiplineBuilder<LogLevel>) => void
  ): void {
    const builder = this.fork();
    builder.use(new PredicateMiddleware<LogLevel>(predicate))
    configure(builder);
  }

  build(levels: readonly LogLevel[]): LogPipelineImpl<LogLevel> {
      for (const child of this.children) {
          const pipeline = child.build(levels);
          this.sendTo(pipeline);
      }

      if (this.sinks.length < 1) {
          throw new Error("At least one sink must be set.");
      }

      return new LogPipelineImpl(levels, this.middlewares, this.sinks);
  }
}

