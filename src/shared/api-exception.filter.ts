import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        code = payload.toUpperCase();
      } else if (
        typeof payload === 'object' &&
        payload !== null &&
        'message' in payload
      ) {
        const message = (payload as { message: unknown }).message;
        code =
          typeof message === 'string'
            ? message.toUpperCase()
            : 'VALIDATION_ERROR';
      }
    }

    response.status(status).json({ success: false, error: code });
  }
}
