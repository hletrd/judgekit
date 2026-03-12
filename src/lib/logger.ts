import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
  base: { service: "judgekit" },
});

export function createRequestLogger(context: {
  requestId?: string;
  userId?: string;
  route?: string;
}) {
  return logger.child(context);
}
