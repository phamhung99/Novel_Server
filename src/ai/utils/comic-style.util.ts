import { ComicStyleType } from '../enum/comic-style-type.enum';

export const PremiumComicTypes = new Set<ComicStyleType>([
    ComicStyleType.MANHUA,
    ComicStyleType.ANIME,
    ComicStyleType.POP_ART,
    ComicStyleType.WEBTOON,
]);

export function isPremiumStyle(type: ComicStyleType): boolean {
    return PremiumComicTypes.has(type);
}
