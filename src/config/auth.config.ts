export default () => ({
    jwt: {
        refreshTokenHmacSecret: process.env.REFRESH_TOKEN_HMAC_SECRET,
        accessToken: {
            secret: process.env.JWT_ACCESS_SECRET,
            expiresIn: process.env.JWT_AT_EXPIRES_IN || '15m',
            cookieExpiresIn: process.env.JWT_AT_COOKIE_EXPIRES_IN || '1h',
        },
        refreshToken: {
            secret: process.env.JWT_REFRESH_SECRET,
            expiresIn: process.env.JWT_RT_EXPIRES_IN || '7d',
            cookieExpiresIn: process.env.JWT_RT_COOKIE_EXPIRES_IN || '7d',
        },
    },
});
