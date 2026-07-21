let errorHandler: ((error: unknown, context: string) => void) | null = null;

export function onError(cb: (error: unknown, context: string) => void): void {
  errorHandler = cb;
}

export function reportError(error: unknown, context: string): void {
  if (errorHandler) {
    errorHandler(error, context);
  } else if (process.env.NODE_ENV === "development") {
    console.warn(`[${context}]`, error);
  }
}

export function reportSilentError(context: string): void {
  reportError(new Error("Silent catch hit"), context);
}
