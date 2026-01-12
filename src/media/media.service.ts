import { Injectable, BadRequestException } from '@nestjs/common';
import { extname } from 'path';
import * as fs from 'fs/promises';
import { DoSpacesService } from '../upload/do-spaces.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
    constructor(private readonly storage: DoSpacesService) {}

    async uploadStoryCover(
        file: Express.Multer.File,
    ): Promise<{ key: string; url: string }> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        const ext = extname(file.originalname).toLowerCase() || '.jpg';
        const key = `covers/${uuidv4()}${ext}`;

        let buffer: Buffer | undefined;
        const tempFilePath: string | undefined = file.path;

        try {
            if (file.buffer) {
                buffer = file.buffer;
            } else if (file.path) {
                buffer = await fs.readFile(file.path);
            } else {
                throw new BadRequestException(
                    'File buffer or path not available',
                );
            }

            const uploadedKey = await this.storage.uploadFromBuffer(
                buffer,
                key,
                file.mimetype,
            );

            const url = await this.storage.getImageUrl(uploadedKey);

            return { key: uploadedKey, url };
        } catch (err) {
            console.error('Upload story cover failed:', err);
            throw err;
        } finally {
            if (tempFilePath) {
                try {
                    await fs.unlink(tempFilePath);
                } catch (cleanupErr) {
                    console.warn(
                        `Failed to cleanup temp file ${tempFilePath}:`,
                        cleanupErr,
                    );
                }
            }
        }
    }

    uploadFromStream = this.storage.uploadFromStream.bind(this.storage);

    async delete(key: string): Promise<void> {
        await this.storage.deleteImage(key);
    }

    async getMediaUrl(key: string): Promise<string> {
        return this.storage.getImageUrl(key);
    }
}
