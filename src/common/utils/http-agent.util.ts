import https from 'https';

export const httpsAgent = new https.Agent({
    keepAlive: true,
    maxSockets: 5,
});
