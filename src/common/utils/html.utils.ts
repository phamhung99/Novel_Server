import striptags from 'striptags';
import { decode } from 'he';

export function stripHtml(html: string): string {
    if (!html) return '';

    return decode(striptags(html))
        .replace(/\u00A0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
