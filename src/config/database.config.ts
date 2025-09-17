import { parse } from 'pg-connection-string';

export default () => {
    const dbUrl = process.env.DATABASE_URL;

    let dbConfig: Partial<{
        host: string;
        port: string;
        user: string;
        password: string;
        database: string;
    }> = {};
    if (dbUrl) {
        dbConfig = parse(dbUrl);
    }

    return {
        database: {
            type: process.env.DB_TYPE || 'postgres',
            host: dbConfig.host || process.env.DB_HOST,
            port: parseInt(dbConfig.port || process.env.DB_PORT || '5432', 10),
            username: dbConfig.user || process.env.DB_USERNAME,
            password: dbConfig.password || process.env.DB_PASSWORD,
            database: dbConfig.database || process.env.DB_DATABASE,
            synchronize: process.env.NODE_ENV !== 'production',
            retryAttempts: 0,
            retryDelay: 3000,
            ssl: dbUrl ? { rejectUnauthorized: false } : undefined,
        },
    };
};
