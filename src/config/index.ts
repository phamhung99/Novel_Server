import appConfig from './app.config';
import databaseConfig from './database.config';
import authConfig from './auth.config';
import appStoreConfig from './app-store.config';

export { appConfig, authConfig, databaseConfig, appStoreConfig };

const configs = [appConfig, authConfig, databaseConfig, appStoreConfig];

export default configs;
