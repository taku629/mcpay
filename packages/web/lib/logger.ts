// Tiny structured logger. One JSON line per call, no external dep.
//
// Why not pino? It works fine, but for a few hundred lines of routes the
// dependency isn't earning its keep yet. Swap to pino if we ever want sampling
// or transports.

type Level = "debug" | "info" | "warn" | "error";

const SHOULD_LOG: Record<Level, boolean> = {
  debug: process.env.LOG_LEVEL === "debug",
  info: process.env.LOG_LEVEL !== "warn" && process.env.LOG_LEVEL !== "error",
  warn: process.env.LOG_LEVEL !== "error",
  error: true,
};

function emit(level: Level, msg: string, fields?: Record<string, unknown>): void {
  if (!SHOULD_LOG[level]) return;
  const line = JSON.stringify({
    level,
    msg,
    ts: new Date().toISOString(),
    ...(fields ?? {}),
  });
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const log = {
  debug: (msg: string, fields?: Record<string, unknown>) => emit("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => emit("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => emit("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => emit("error", msg, fields),
};

export interface ContextLogger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
}

// Pre-bind a set of fields so each call site doesn't repeat them.
//   const reqLog = log.child({ requestId, projectId });
//   reqLog.info("verified");
export function child(ctx: Record<string, unknown>): ContextLogger {
  return {
    debug: (msg, fields) => log.debug(msg, { ...ctx, ...fields }),
    info: (msg, fields) => log.info(msg, { ...ctx, ...fields }),
    warn: (msg, fields) => log.warn(msg, { ...ctx, ...fields }),
    error: (msg, fields) => log.error(msg, { ...ctx, ...fields }),
  };
}
