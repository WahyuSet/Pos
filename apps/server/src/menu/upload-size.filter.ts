import { ArgumentsHost, Catch, ExceptionFilter, PayloadTooLargeException } from '@nestjs/common';
import { Response } from 'express';

@Catch(PayloadTooLargeException)
export class UploadSizeExceptionFilter implements ExceptionFilter {
  catch(exception: PayloadTooLargeException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(413).json({
      statusCode: 413,
      message: 'Ukuran file terlalu besar. Maksimal 2MB.',
      error: 'Payload Too Large',
    });
  }
}
