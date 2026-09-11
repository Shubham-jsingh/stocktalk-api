import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { code, message } = this.normalizeError(exception, status);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status} ${code}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      error: { code, message },
    });
  }

  private normalizeError(
    exception: unknown,
    status: number,
  ): { code: string; message: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message = this.extractMessage(body) || exception.message;
      return {
        code: this.statusToCode(status),
        message,
      };
    }

    return {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  private extractMessage(body: string | object): string {
    if (typeof body === 'string') {
      return body;
    }

    if (body && typeof body === 'object' && 'message' in body) {
      const value = (body as { message: string | string[] }).message;
      if (Array.isArray(value)) {
        return value.join('; ');
      }
      if (typeof value === 'string') {
        return value;
      }
    }

    return '';
  }

  private statusToCode(status: number): string {
    switch (status) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED';
    }
  }
}
