import { FileValidator } from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/app.constant';

export class MimeTypeValidator extends FileValidator {
    private allowedMimeTypesSet: Set<string>;

    constructor(allowedMimeTypes: string[] | Record<string, string>) {
        super({});
        if (Array.isArray(allowedMimeTypes)) {
            this.allowedMimeTypesSet = new Set(allowedMimeTypes);
        } else {
            this.allowedMimeTypesSet = new Set(Object.values(allowedMimeTypes));
        }
    }

    isValid(file?: Express.Multer.File): boolean {
        if (!file) return true;
        return this.allowedMimeTypesSet.has(file.mimetype);
    }

    buildErrorMessage(): string {
        return ERROR_MESSAGES.UNSUPPORTED_FILE_FORMAT;
    }
}
