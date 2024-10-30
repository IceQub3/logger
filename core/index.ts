
export type { Logger, LogMessage } from "./logger.ts"; 
export type { LogMiddleware } from "./middleware.ts";
export type { LogSink } from "./sink.ts";
export type { LogPiplineBuilder  } from "./builder.ts";
export type { LogPipeline } from "./pipeline.ts";

import { LogPipelineBuilderImpl, type LogPiplineBuilder } from "./builder.ts";
import type { LogPipeline } from "./pipeline.ts";

export async function createLogPipeline<LogLevel extends string>(
  levels: readonly LogLevel[],
  configure: (builder: LogPiplineBuilder<LogLevel>) => PromiseLike<void>
): Promise<LogPipeline<LogLevel>> {
  const builder = new LogPipelineBuilderImpl<LogLevel>();
  
  await configure(builder);

  return builder.build(levels);
}
