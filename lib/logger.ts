import pino from "pino";

export const logger = pino({
  level:
    process.env.NODE_ENV === "test"
      ? "silent"
      : process.env.NODE_ENV === "production"
        ? "info"
        : "debug",
  transport:
    process.env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

/** Returns a child logger with a request ID attached, to correlate logs for one request. */
export function loggerWithRequestId(requestId: string) {
  return logger.child({ requestId });
}
