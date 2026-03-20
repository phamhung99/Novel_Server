import { HttpException, HttpStatus } from '@nestjs/common';
import { promises as fs } from 'fs';

export async function encodeFileToBase64(filePath: string): Promise<string> {
    try {
        const fileBuffer = await fs.readFile(filePath);
        return fileBuffer.toString('base64').trim();
    } catch (err) {
        console.error(`Failed to read file ${filePath}:`, err);
        throw new HttpException('Cannot read file', HttpStatus.BAD_REQUEST);
    }
}
