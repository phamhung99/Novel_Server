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
        source: string,
        mimeType: string = 'image/jpeg',
    ): Promise<string> {
        const key = `covers/${uuidv4()}.jpg`;

        let buffer: Buffer;

        // Trường hợp 1: source là base64 (có hoặc không có data URI prefix)
        if (source.startsWith('data:image')) {
            // Cắt bỏ phần header data:image/png;base64,
            const base64Data = source.split(';base64,').pop() || source;
            buffer = Buffer.from(base64Data, 'base64');
        } else if (
            source.startsWith('http://') ||
            source.startsWith('https://')
        ) {
            // Trường hợp 2: source là URL
            const response = await axios.get(source, {
                responseType: 'arraybuffer',
            });
            buffer = Buffer.from(response.data);
        } else {
            // Giả định source là base64 thuần (không có prefix)
            buffer = Buffer.from(source, 'base64');
        }

        // Kiểm tra buffer có hợp lệ không
        if (buffer.length === 0) {
            throw new Error('Invalid image data: empty buffer');
        }

        await this.client.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ACL: 'public-read',
                ContentType: mimeType,
            }),
        );

        return key;
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
