const path = require('path');

module.exports = {
    entry: './src/serverless.ts',
    target: 'node',
    mode: 'production',
    externals: ['aws-sdk'],
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.build.json',
                        transpileOnly: true
                    }
                },
                exclude: [/node_modules/, /test/],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            'src': path.resolve(__dirname, 'src')
        },
        fallback: {
            '@nestjs/websockets/socket-module': false,
            '@nestjs/microservices/microservices-module': false,
            '@nestjs/microservices': false,
        }
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'serverless.js',
        libraryTarget: 'commonjs2',
    },
    plugins: [
        new (require('webpack')).IgnorePlugin({
            checkResource(resource) {
                const lazyImports = [
                    '@nestjs/microservices',
                    '@nestjs/websockets',
                    '@nestjs/websockets/socket-module',
                    '@nestjs/microservices/microservices-module',
                ];
                return lazyImports.includes(resource);
            },
        }),
    ],
};