// ============================================
// 16. ERROR HANDLING MIDDLEWARE (lib/error-handler.ts)
// ============================================
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function handleError(error: unknown): {
  message: string;
  statusCode: number;
  stack?: string;
} {
  if (error instanceof AppError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    };
  }

  // Unknown error
  console.error('Unexpected error:', error);
  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
    stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
  };
}