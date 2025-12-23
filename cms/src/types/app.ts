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

export interface GenerationDto {
    type?: string;
    status?: string;
    aiProvider?: string;
    aiModel?: string;
    prompt?: any;
    title?: string;
    genres?: string[];
    setting?: string;
    mainCharacter?: string;
    subCharacters?: string;
    antagonist?: string;
    motif?: string;
    tone?: string;
    writingStyle?: string;
    plotLogic?: string;
    hiddenTheme?: string;
}

export interface StoryDto {
    id: string;
    authorId: string;
    title: string;
    synopsis: string;
    genres: string[];
    coverImageUrl: string;
    type: string;
    views: number;
    rating: string;
    status: string;
    visibility: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
    author: AuthorDto;
    chapters: ChapterDto[];
    generation?: GenerationDto;
}
