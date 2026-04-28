export enum PaymentProvider {
  DARAJA = "daraja",
  FUTURE_PROVIDER = "future_provider"
}

export type AsyncResult<T> = Promise<T>;

export enum ServiceErrorCode {
  CONFIG_ERROR = "config_error",
  UNAUTHENTICATED = "unauthenticated",
  FORBIDDEN = "forbidden",
  NOT_FOUND = "not_found",
  VALIDATION_ERROR = "validation_error",
  DATABASE_ERROR = "database_error",
  STORAGE_ERROR = "storage_error"
}
