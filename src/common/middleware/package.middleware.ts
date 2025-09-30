import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PackageMiddleware implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        const packageName = req.header('X-PACKAGE');
        console.log('Package Name:', packageName);

        if (packageName !== 'com.comickey.comicworld') {
            throw new ForbiddenException('Invalid package');
        }
        next();
    }
}
