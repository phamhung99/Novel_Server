import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AiModule } from './ai/ai.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configs from './config';
import { HealthController } from './common/controllers/health.controller';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { DashboardModule } from './dashboard/dashboard.module';
import { PackageMiddleware } from './common/middleware/package.middleware';
import { StoryModule } from './story/story.module';
import { AuthModule } from './auth/auth.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: configs,
            envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
        }),
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'public'),
            serveRoot: '/',
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
                schema: configService.get<string>('database.schema'),
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
        DashboardModule,
        StoryModule,
        AuthModule,
    ],
    controllers: [HealthController],
})
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(PackageMiddleware).forRoutes('*');
    }
}
