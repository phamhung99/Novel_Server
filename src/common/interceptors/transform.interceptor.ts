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
            map((data) => {
                if (data && data.status && (data.data || data.message)) {
                    return data;
                }

                return {
                    data,
                };
            }),
        );
    }
}
