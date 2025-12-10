import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../enums/app.enum';
import { ERROR_MESSAGES } from '../constants/app.constant';

interface PostgresError extends Error {
    code?: string;
    detail?: string;
    constraint?: string;
    table?: string;
    column?: string;
}

interface ErrorResponse {
    statusCode: number;
    timestamp: string;
    path: string;
    method: string;
    error: string;
    message: string | string[];
    correlationId?: string;
    code?: number;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const { statusCode, error, message, code } =
            this.getErrorDetails(exception);
        const correlationId = uuidv4();

        const errorResponse: ErrorResponse = {
            statusCode,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            error,
            message,
            code,
            correlationId,
        };

        this.logError(exception, request, errorResponse);

        // Remove sensitive information in production
        const clientResponse = this.sanitizeErrorResponse(errorResponse);

        response.status(statusCode).json(clientResponse);
    }

    private getErrorDetails(exception: unknown): {
        statusCode: number;
        error: string;
        message: string | string[];
        code?: number;
    } {
        // Handle TypeORM Query Failed Errors
        if (exception instanceof QueryFailedError) {
            return this.handleQueryFailedError(exception);
        }

        // Handle TypeORM Entity Not Found Errors
        if (exception instanceof EntityNotFoundError) {
            return {
                statusCode: HttpStatus.NOT_FOUND,
                error: 'Not Found',
                message: ERROR_MESSAGES.NOT_FOUND,
                code: ErrorCode.NOT_FOUND,
            };
        }

        // Handle JWT Errors
        // if (this.isJwtError(exception)) {
        //     return this.handleJwtError(exception);
        // }

        // Handle NestJS HTTP Exceptions
        if (exception instanceof HttpException) {
            return this.handleHttpException(exception);
        }

        // Handle all other exceptions
        return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Internal Server Error',
            message: ERROR_MESSAGES.UNKNOWN_ERROR_OCCURRED,
            code: ErrorCode.INTERNAL_SERVER_ERROR,
        };
    }

    private handleQueryFailedError(exception: QueryFailedError): {
        statusCode: number;
        error: string;
        message: string;
        code?: number;
    } {
        const statusCode = HttpStatus.BAD_REQUEST;
        const error = 'Database Error';

        // Cast driverError to PostgresError for proper typing
        const pgError = exception.driverError as PostgresError;

        // Handle UUID format errors
        if (
            pgError?.code === '22P02' &&
            exception.message.includes('invalid input syntax for type uuid')
        ) {
            return {
                statusCode: HttpStatus.BAD_REQUEST,
                error: 'Validation Error',
                message: ERROR_MESSAGES.INVALID_UUID,
                code: ErrorCode.INVALID_UUID,
            };
        }

        // Handle unique constraint violations
        if (pgError?.code === '23505') {
            const detail = pgError.detail || '';

            if (detail.includes('email')) {
                return {
                    statusCode,
                    error,
                    message: ERROR_MESSAGES.DUPLICATE_RECORD,
                    code: ErrorCode.EMAIL_ALREADY_EXISTS,
                };
            }

            return {
                statusCode,
                error,
                message: ERROR_MESSAGES.DUPLICATE_RECORD,
                code: ErrorCode.DUPLICATE_RECORD,
            };
        }

        // Handle foreign key constraint violations
        if (pgError?.code === '23503') {
            return {
                statusCode,
                error,
                message: ERROR_MESSAGES.FOREIGN_KEY_VIOLATION,
                code: ErrorCode.FOREIGN_KEY_VIOLATION,
            };
        }

        // Handle not null constraint violations
        if (pgError?.code === '23502') {
            return {
                statusCode,
                error,
                message: 'Required field is missing.',
                code: ErrorCode.REQUIRED_FIELD_MISSING,
            };
        }

        return {
            statusCode,
            error,
            message: 'Database operation failed.',
            code: ErrorCode.DATABASE_ERROR,
        };
    }

    // private isJwtError(exception: unknown): boolean {
    //     return (
    //         exception &&
    //         typeof exception === 'object' &&
    //         'name' in exception &&
    //         (exception.name === 'JsonWebTokenError' ||
    //             exception.name === 'TokenExpiredError' ||
    //             exception.name === 'NotBeforeError')
    //     );
    // }

    // private handleJwtError(exception: any): {
    //     statusCode: number;
    //     error: string;
    //     message: string;
    //     code?: number;
    // } {
    //     const statusCode = HttpStatus.UNAUTHORIZED;
    //     const error = 'Authentication Error';

    //     switch (exception.name) {
    //         case 'TokenExpiredError':
    //             return {
    //                 statusCode,
    //                 error,
    //                 message: 'Your session has expired. Please log in again.',
    //                 code: ErrorCode.TOKEN_EXPIRED,
    //             };
    //         case 'JsonWebTokenError':
    //             return {
    //                 statusCode,
    //                 error,
    //                 message:
    //                     'Invalid authentication token. Please log in again.',
    //                 code: ErrorCode.INVALID_TOKEN,
    //             };
    //         case 'NotBeforeError':
    //             return {
    //                 statusCode,
    //                 error,
    //                 message: 'Authentication token is not active yet.',
    //                 code: ErrorCode.TOKEN_NOT_ACTIVE,
    //             };
    //         default:
    //             return {
    //                 statusCode,
    //                 error,
    //                 message: 'Authentication failed. Please log in again.',
    //                 code: ErrorCode.INVALID_TOKEN,
    //             };
    //     }
    // }

    private handleHttpException(exception: HttpException): {
        statusCode: number;
        error: string;
        message: string | string[];
        code?: number;
    } {
        const statusCode = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        let error = 'HTTP Exception';
        let message: string | string[] = exception.message;
        let code: number | undefined;

        if (
            typeof exceptionResponse === 'object' &&
            exceptionResponse !== null
        ) {
            const responseObj = exceptionResponse as any;

            error = responseObj.error || error;
            code = responseObj.code;

            // Handle validation errors (array of messages)
            if (Array.isArray(responseObj.message)) {
                message = responseObj.message;
            } else if (responseObj.message) {
                message = responseObj.message;

                if (
                    typeof message === 'string' &&
                    this.isFileValidationError(message)
                ) {
                    message = this.getFileValidationMessage(message);
                }
            }
        }

        return { statusCode, error, message, code };
    }

    private logError(
        exception: unknown,
        request: Request,
        errorResponse: ErrorResponse,
    ): void {
        const { statusCode, correlationId } = errorResponse;
        const logLevel =
            statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

        const logMessage = `${request.method} ${request.url} ${statusCode}`;

        const logContext = {
            correlationId,
            statusCode,
            method: request.method,
            url: request.url,
            userAgent: request.get('User-Agent'),
            ip: this.getClientIp(request),
            userId: (request as any).user?.id,
            ...(exception instanceof Error && {
                stack: exception.stack,
                errorName: exception.constructor.name,
            }),
        };

        this.logger[logLevel](logMessage, logContext);

        if (process.env.NODE_ENV === 'development') {
            this.logger.debug('Full exception details', {
                correlationId,
                exception:
                    exception instanceof Error
                        ? {
                              name: exception.name,
                              message: exception.message,
                              stack: exception.stack,
                          }
                        : exception,
            });
        }
    }

    private sanitizeErrorResponse(
        errorResponse: ErrorResponse,
    ): Partial<ErrorResponse> {
        const isProduction = process.env.NODE_ENV === 'production';

        if (isProduction && errorResponse.statusCode >= 500) {
            return {
                statusCode: errorResponse.statusCode,
                timestamp: errorResponse.timestamp,
                path: errorResponse.path,
                method: errorResponse.method,
                error: 'Internal Server Error',
                message: 'An unexpected error occurred',
                correlationId: errorResponse.correlationId,
            };
        }

        return errorResponse;
    }

    private getClientIp(request: Request): string {
        return (
            (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
            request.socket.remoteAddress ||
            request.ip ||
            'unknown'
        );
    }

    private isFileValidationError(message: string): boolean {
        return (
            message.includes('file type') ||
            message.includes('expected type is') ||
            message.includes('current file type is') ||
            (message.includes('Validation failed') &&
                message.includes('application/json'))
        );
    }

    private getFileValidationMessage(originalMessage: string): string {
        if (originalMessage.includes('file type')) {
            return 'Only the following file formats are supported: PDF, TXT, DOCX';
        }

        if (originalMessage.includes('maxSize')) {
            return 'The file size exceeds the allowed limit';
        }

        return 'Unsupported file format. Only the following formats are supported: PDF, TXT, DOCX';
    }
}
