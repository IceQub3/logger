

export type Logger<Loglevel extends string> = {
  [Level in Loglevel]: {
    (this: Logger<Loglevel>, template: string, values?: Record<string, unknown>): void;
  }
} & {
  /**
   * Create a named sublogger with extra default values
   **/
  ramify(name: string, values?: Record<string, unknown>): Logger<Loglevel>;
}

export type LogMessage<Loglevel> = {
  level: Loglevel,
  template: string,
  values: Record<string, unknown>,
  meta: Record<string, unknown>
}
