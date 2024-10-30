import type { Logger, LogMessage } from "./logger.ts";
import type { LogMiddleware } from "./middleware.ts";
import type { LogSink } from "./sink.ts";


export interface LogPipeline<LogLevel extends string> {
  readonly closed: boolean;
  close(): Promise<void>;
  readonly rootLogger: Logger<LogLevel>
}

class LoggerFactory<LogLevel extends string> {
  constructor(
    public pipeline: LogPipelineImpl<LogLevel>,
    private loglevels: readonly LogLevel[],
    public readonly defaultValues?: Record<string, unknown>,
  ) {
  }

  createLogger(): Logger<LogLevel> {
    return new LoggerImpl<LogLevel>(".", this.loglevels, this) as unknown as Logger<LogLevel>;
  }

  createSubLogger(parent: LoggerImpl<LogLevel>, name: string, values?: Record<string, unknown>): Logger<LogLevel> {
    const subFactory = new LoggerFactory(
      this.pipeline,
      this.loglevels,
      { ...this.defaultValues, ...values }
    );
    
    return new LoggerImpl(name, this.loglevels, subFactory, parent) as unknown as Logger<LogLevel>;
  }
}

class LoggerImpl<LogLevel extends string> {
  private fullName: string | undefined;

  constructor(
    private name: string,
    levels: readonly LogLevel[],
    private readonly factory: LoggerFactory<LogLevel>,
    private readonly parent?: LoggerImpl<LogLevel>
  ) {
    for (const level of levels) {
      (this as any)[level] = this.log.bind(this, level);
    }
  }

  private log(level: LogLevel, template: string, values?: Record<string, unknown>): void {
    this.factory.pipeline.log({
      level,
      template,
      values: { ...this.factory.defaultValues, ...values },
      meta: this.getDefaultMeta(),
    });
  }

  public ramify(name: string, values?: Record<string, unknown>): Logger<LogLevel> {
    return this.factory.createSubLogger(this, name, values);
  }

  private getDefaultMeta(): Record<string, unknown> {
    return {
      name: this.name,
      fullname: this.getFullName(),
      timestamp: new Date().toISOString()
    };
  }
  
  private getFullName(): string {
    if (this.fullName !== undefined) {
      return this.fullName;
    }

    const parentName = this.parent?.getFullName();
    if (parentName === undefined) {
      return this.name;
    }
    if (parentName === ".") {
      return "." + this.name;
    }
    this.fullName = parentName + "." + this.name;

    return this.fullName;
  }
}


export class LogPipelineImpl<LogLevel extends string> implements LogPipeline<LogLevel>, LogSink<LogLevel> {
  public closed: boolean = false;
  public readonly rootLogger: Logger<LogLevel>;
  private readonly logsInFlight: number[];

  constructor(
    loglevels: readonly LogLevel[],
    private readonly middlewares: readonly LogMiddleware<LogLevel>[],
    private readonly sinks: readonly LogSink<LogLevel>[]
  ) {
    this.logsInFlight = new Array(middlewares.length);
    this.logsInFlight.fill(0);
    this.rootLogger = new LoggerFactory<LogLevel>(this, loglevels).createLogger();
  }

  log(message: LogMessage<LogLevel>): void {
    if (this.closed) {
      return;
    }

    this.next(0, message);
  }

  private next(index: number, message: LogMessage<LogLevel>): void {
    if (this.middlewares.length === index) {
      this.send(message);
    } else {
      this.middlewares[index].log(message, this.next.bind(this, ++index));
    }
  }
  
  private send(message: LogMessage<LogLevel>): void {
    for (const sink of this.sinks) {
      sink.log(message);
    }
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    
    
    for (const middleware of this.middlewares) {
      await middleware.flush();
    }

    const flushResults = await Promise.allSettled(
      this.sinks.map(sink => sink.flush())
    );
    
    const errors: unknown[] = [];
    for (const flushResult of flushResults) {
      if (flushResult.status === "rejected") {
        errors.push(flushResult.reason);
      }
    }
    
    if (errors.length > 0) {
      const text = errors.length === 1
        ? "an error."
        : "multiple errors";
      const part = errors.length < flushResults.length
        ? "partially "
        : ""
      throw new AggregateError(errors, `sinks flush ${part}failed with ${text}`);
    }
  }

  async flush(): Promise<void> {
    await this.close();
  }
}


