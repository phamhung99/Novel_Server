import fs from 'fs';
import path from 'path';

const firebaseServiceAccountPath = path.resolve(
    process.cwd(),
    'firebase-service-account.json',
);

export const FIREBASE_SERVICE_ACCOUNT = JSON.parse(
    fs.readFileSync(firebaseServiceAccountPath, 'utf-8'),
);
