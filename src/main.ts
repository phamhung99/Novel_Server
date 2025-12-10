import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JSendInterceptor } from './common/interceptors/jsend.interceptor';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api/v1');
    // production phải sửa lại
    app.enableCors();

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
        }),
    );

    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalInterceptors(new JSendInterceptor());
    await app.listen(5000);
}
bootstrap();
