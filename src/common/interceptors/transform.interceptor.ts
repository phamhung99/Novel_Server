// src/common/interceptors/transform.interceptor.ts
import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SKIP_TRANSFORM_KEY } from '../decorators/skip-transform.decorator';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
    constructor(private reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const skip = this.reflector.getAllAndOverride<boolean>(
            SKIP_TRANSFORM_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skip) {
            return next.handle();
        }

        return next.handle().pipe(
            map((responseData) => {
                if (
                    responseData &&
                    typeof responseData === 'object' &&
                    'success' in responseData
                ) {
                    return responseData;
                }

                const request = context.switchToHttp().getRequest();
                const method = request.method;

                let defaultMessage = 'Operation completed';
                if (method === 'POST') defaultMessage = 'Created successfully';
                if (method === 'PUT' || method === 'PATCH')
                    defaultMessage = 'Updated successfully';
                if (method === 'DELETE')
                    defaultMessage = 'Deleted successfully';

                return {
                    success: true,
                    message: defaultMessage,
                    data: responseData ?? null,
                };
            }),
        );
    }
}
