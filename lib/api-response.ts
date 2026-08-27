import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

const DEFAULT_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  const body: ApiSuccessBody<T> = { success: true, data, ...(message ? { message } : {}) };
  return NextResponse.json(body, { status });
}

export function apiError(code: ApiErrorCode, message: string, details?: unknown, status?: number) {
  const body: ApiErrorBody = {
    success: false,
    error: { code, message, ...(details !== undefined ? { details } : {}) },
  };
  return NextResponse.json(body, { status: status ?? DEFAULT_STATUS_BY_CODE[code] });
}

/**
 * Wraps a route handler so any thrown error becomes a safe INTERNAL_ERROR response
 * instead of leaking a stack trace to the client. Known errors should be caught and
 * turned into apiError(...) explicitly inside the handler; this is the last-resort net.
 */
export function withApiErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (err) {
      const { UnauthorizedError, ForbiddenError } = await import("@/lib/permissions");
      if (err instanceof UnauthorizedError) return apiError("UNAUTHORIZED", err.message);
      if (err instanceof ForbiddenError) return apiError("FORBIDDEN", err.message);

      const { logger } = await import("@/lib/logger");
      logger.error({ err }, "Unhandled API error");
      return apiError("INTERNAL_ERROR", "Something went wrong. Please try again.");
    }
  };
}
