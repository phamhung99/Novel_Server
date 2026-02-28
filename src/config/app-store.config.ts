export default () => ({
    apple: {
        bundleId: process.env.APPLE_BUNDLE_ID,
        appAppleId: parseInt(process.env.APPLE_APP_APPLE_ID, 10),
        privateKey: process.env.APPLE_PRIVATE_KEY,
        keyId: process.env.APPLE_KEY_ID,
        issuerId: process.env.APPLE_ISSUER_ID,
        useSandbox: process.env.APPLE_USE_SANDBOX === 'true' || true,
        enableOnlineChecks:
            process.env.APPLE_ENABLE_ONLINE_CHECKS === 'true' || false,
    },
});
