import { Injectable, BadRequestException } from '@nestjs/common';
import * as fs from 'fs/promises';
import { DoSpacesService } from '../upload/do-spaces.service';

@Injectable()
export class MediaService {
    constructor(private readonly storage: DoSpacesService) {}

    async uploadFromSource(
        source: string,
        options: {
            prefix: string;
            filename?: string;
            mimeType?: string;
            isPublic?: boolean;
        },
    ): Promise<string> {
        return this.storage.uploadFromSource(source, options);
    }

    async uploadStoryCover(
        file: Express.Multer.File,
    ): Promise<{ key: string; url: string }> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

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

            const uploadedKey = await this.storage.uploadCover(buffer, false);

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

    async uploadUserProfileImage(
        file: Express.Multer.File,
    ): Promise<{ key: string; url: string }> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

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

            const uploadedKey = await this.storage.uploadAvatar(buffer);

            const url = await this.storage.getImageUrl(uploadedKey);

            return { key: uploadedKey, url };
        } catch (err) {
            console.error('Upload user avatar failed:', err);
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

    async delete(key: string): Promise<void> {
        await this.storage.deleteImage(key);
    }

    async getMediaUrl(key: string): Promise<string> {
        return this.storage.getImageUrl(key);
    }
}
