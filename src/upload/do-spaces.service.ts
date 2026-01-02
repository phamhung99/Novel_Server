import { Injectable } from '@nestjs/common';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class DoSpacesService {
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

    async uploadFromStream(
        imageUrl: string,
        mimeType = 'image/jpeg',
    ): Promise<string> {
        const key = `covers/${uuidv4()}.jpg`;

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
        });
        const buffer = Buffer.from(response.data);

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ACL: 'public-read',
                ContentType: mimeType,
            }),
        );

        return `${key}`;
    }

    async uploadFromBuffer(
        buffer: Buffer,
        key: string,
        contentType: string = 'image/jpeg',
    ): Promise<string> {
        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ACL: 'public-read',
                ContentType: contentType,
            }),
        );

        return key;
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
}
