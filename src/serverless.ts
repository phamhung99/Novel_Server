import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import serverlessExpress from '@vendia/serverless-express';
import { Callback, Context, Handler } from 'aws-lambda';
import { AppModule } from './app.module';
import { CronService } from './cron/cron.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { AppNotificationType } from './common/enums/app.enum';

let server: Handler;
let cronAppContext: any;

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

    app.useGlobalFilters(new AllExceptionsFilter());
    app.setGlobalPrefix('api/v1');
    await app.init();

    const expressApp = app.getHttpAdapter().getInstance();
    return serverlessExpress({ app: expressApp });
}

async function runCronJob(event: any) {
    console.log('Cron job triggered:', JSON.stringify(event));

    if (!cronAppContext) {
        try {
            cronAppContext =
                await NestFactory.createApplicationContext(AppModule);
            console.log(
                'Cron context initialized successfully (using AppModule)',
            );
        } catch (err) {
            console.error('Failed to init cron context:', err);
            throw err;
        }
    }

    const cronService = cronAppContext.get(CronService);

    switch (event.type) {
        case AppNotificationType.CHECK_IN:
            await cronService.sendDailyCheckInGiftReminder();
            break;
        case AppNotificationType.COIN_EXPIRY:
            await cronService.sendCoinExpiryNotifications();
            break;
        default:
            console.warn('Unknown cron job type:', event.type);
    }

    console.log('Cron job completed:', event.type);
}

export const handler: Handler = async (
    event: any,
    context: Context,
    callback: Callback,
) => {
    const isCron =
        event.type ||
        event.source === 'aws.events' ||
        event['detail-type'] === 'Scheduled Event';

    if (isCron) {
        await runCronJob(event);
        return;
    }

    server = server ?? (await bootstrap());
    return server(event, context, callback);
};
