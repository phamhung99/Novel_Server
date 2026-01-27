import { Injectable, OnModuleInit } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    PutBucketLifecycleConfigurationCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { IMAGE_PREFIX } from 'src/common/constants/app.constant';

@Injectable()
export class DoSpacesService implements OnModuleInit {
    private client: S3Client;
    private bucket = process.env.DO_SPACES_BUCKET;
    private region = process.env.DO_SPACES_REGION;
    private endpoint = `https://${this.region}.digitaloceanspaces.com`;

    constructor() {
        this.client = new S3Client({
            endpoint: this.endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId: process.env.DO_SPACES_KEY,
                secretAccessKey: process.env.DO_SPACES_SECRET,
            },
        });
    }

    async onModuleInit(): Promise<void> {
        await this.setupLifecycleRules().catch((err) => {
            console.error('Failed to setup DO Spaces lifecycle rules:', err);
        });
    }

    getEndpoint(): string {
        return this.endpoint;
    }

    async setupLifecycleRules(): Promise<void> {
        try {
            const cmd = new PutBucketLifecycleConfigurationCommand({
                Bucket: this.bucket,
                LifecycleConfiguration: {
                    Rules: [
                        {
                            ID: 'temp-images-1day',
                            Status: 'Enabled',
                            Prefix: IMAGE_PREFIX.COVERS_TEMP,
                            Expiration: {
                                Days: 1,
                            },
                        },
                    ],
                },
            });

            await this.client.send(cmd);
            console.log('Lifecycle rule for temporary images (1 day) applied');
        } catch (err: any) {
            if (
                err.name === 'NoSuchLifecycleConfiguration' ||
                err.$metadata?.httpStatusCode === 404
            ) {
            } else if (
                err.name === 'MalformedXML' ||
                err.message?.includes('already exists')
            ) {
                console.log('Lifecycle rule already exists or conflict');
            } else {
                console.error('Failed to apply lifecycle rules:', err);
                throw err;
            }
        }
    }

    async deleteImage(key: string): Promise<void> {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }),
        );
    }

    async getImageUrl(key: string): Promise<string> {
        return `https://${this.bucket}.${this.region}.cdn.digitaloceanspaces.com/${key}`;
    }

    async uploadBuffer(
        buffer: Buffer,
        options: {
            prefix: string;
            filename?: string;
            mimeType?: string;
            isPublic?: boolean;
        },
    ): Promise<string> {
        const {
            prefix,
            filename = `${uuidv4()}.jpg`,
            mimeType = 'image/jpeg',
            isPublic = true,
        } = options;

        if (buffer.length === 0) {
            throw new Error('Invalid buffer: empty');
        }

        const normalizedPrefix = prefix.replace(/\/$/, '');
        const key = `${normalizedPrefix}/${filename}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
                ACL: isPublic ? 'public-read' : undefined,
            }),
        );

        return key;
    }

    async uploadFromSource(
        source: string, // base64 string hoặc http(s) url
        options: {
            prefix: string;
            filename?: string;
            mimeType?: string;
            isPublic?: boolean;
        },
    ): Promise<string> {
        let buffer: Buffer;

        if (source.startsWith('data:image') || source.includes('base64')) {
            const base64Data = source.split(';base64,').pop() || source;
            buffer = Buffer.from(base64Data, 'base64');
        } else if (
            source.startsWith('http://') ||
            source.startsWith('https://')
        ) {
            const response = await axios.get(source, {
                responseType: 'arraybuffer',
            });
            buffer = Buffer.from(response.data);
        } else {
            // giả sử là base64 thuần
            buffer = Buffer.from(source, 'base64');
        }

        if (buffer.length === 0) {
            throw new Error('Invalid image data: empty buffer');
        }

        return this.uploadBuffer(buffer, options);
    }

    async uploadCover(buffer: Buffer, isTemporary = false): Promise<string> {
        return this.uploadBuffer(buffer, {
            prefix: isTemporary
                ? IMAGE_PREFIX.COVERS_TEMP
                : IMAGE_PREFIX.COVERS,
            mimeType: 'image/jpeg',
        });
    }

    async uploadAvatar(buffer: Buffer): Promise<string> {
        return this.uploadBuffer(buffer, {
            prefix: IMAGE_PREFIX.AVATARS,
            mimeType: 'image/jpeg',
        });
    }
}
