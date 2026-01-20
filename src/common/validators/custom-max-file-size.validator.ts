import { FileValidator } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/app.constant';
import { AllowedImageMimeTypes } from '../enums/app.enum';

export class CustomMaxFileSizeValidator extends FileValidator {
    constructor(private readonly maxSizeMap: Record<string, number>) {
        super({});
    }

    isValid(file?: Express.Multer.File): boolean {
        if (!file) return true;

        let configKey: string;
        switch (file.mimetype) {
            // case AllowedFileMimeTypes.TXT:
            //     configKey = 'TXT';
            //     break;
            // case AllowedFileMimeTypes.DOCX:
            //     configKey = 'DOCX';
            //     break;
            case AllowedImageMimeTypes.JPEG:
            case AllowedImageMimeTypes.PNG:
            case AllowedImageMimeTypes.JPG:
            case AllowedImageMimeTypes.WEBP:
                configKey = 'IMAGE';
                break;
            default:
                return false;
        }

        const maxSize = this.maxSizeMap[configKey] || 0;

        return file.size <= maxSize;
    }

    buildErrorMessage(): string {
        return ERROR_MESSAGES.FILE_TOO_LARGE;
    }
}
