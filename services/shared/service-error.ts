import { ServiceErrorCode } from "@/types";

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly cause?: unknown;

  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.cause = cause;
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
