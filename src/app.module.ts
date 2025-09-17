import { Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configs from './config';
import { HealthController } from './common/controllers/health.controller';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GptTransactionsModule } from './gpt-transactions/gpt-transactions.module';
import { IapProductModule } from './iap-product/iap-product.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: configs,
            envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
        }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: configService.get<'postgres'>('database.type'),
                host: configService.get<string>('database.host'),
                port: configService.get<number>('database.port'),
                username: configService.get<string>('database.username'),
                password: configService.get<string>('database.password'),
                database: configService.get<string>('database.database'),
                synchronize: configService.get<boolean>('database.synchronize'),
                entities: [__dirname + '/**/*.entity{.ts,.js}'],
                autoLoadEntities: true,
                retryAttempts: configService.get<number>(
                    'database.retryAttempts',
                ),
                retryDelay: configService.get<number>('database.retryDelay'),
                ssl: configService.get('database.ssl'),
            }),
        }),
        AiModule,
        UserModule,
        GptTransactionsModule,
        IapProductModule,
    ],
    controllers: [HealthController],
})
export class AppModule {}
