import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.resolve(process.cwd(), 'service_account.json');
export const GOOGLE_SERVICE_ACCOUNT = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf-8'),
);
