export interface AuthorDto {
    id: string;
    firstName?: string;
    lastName?: string;
    active?: boolean;
    username?: string;
}

export interface ChapterDto {
    id: string;
    index: number;
    title: string;
    content: string;
}

export interface StoryDto {
    id: string;
    authorId: string;
    authorUsername?: string;
    title: string;
    synopsis: string;
    genres: string[];
    coverImageUrl: string;
    type: string;
    viewsCount: number;
    likesCount: number;
    rating: string;
    status: string;
    visibility: string;
    sourceType: string;
    freeChaptersCount?: number;
    isFullyFree?: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    author: AuthorDto;
    mainCategory: any;
    categories: any[];
    chapters: ChapterDto[];
    generation?: any;
}
