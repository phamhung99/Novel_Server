import striptags from 'striptags';
import { decode } from 'he';

export function stripHtml(html: string): string {
    if (!html) return '';

    let text = html
        .replace(/<\/?(p|div|h[1-6]|li|br|tr|td)[^>]*>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n');

    text = decode(striptags(text))
        .replace(/\u00A0/g, ' ')
        .replace(/"/g, '')
        .replace(/\s*\n\s*/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    return text;
}
