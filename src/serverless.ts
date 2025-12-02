import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { JSendInterceptor } from './common/interceptors/jsend.interceptor';

let server: Handler;

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.enableCors();

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
        }),
    );
    app.useGlobalInterceptors(new JSendInterceptor());
    app.setGlobalPrefix('api/v1');
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();

    return serverlessExpress({ app: expressApp });
}

export const handler: Handler = async (
    event: any,
    context: Context,
    callback: Callback,
) => {
    server = server ?? (await bootstrap());
    return server(event, context, callback);
};
