export class StoryPreviewChapterDto {
    id: string;
    index: number;
    title: string;
    isLock: boolean;
    createdAt: string;
    updatedAt: string;
}

export class StoryPreviewCategoryDto {
    id: string;
    name: string;
}

export class StoryPreviewDto {
    storyId: string;
    title: string;
    synopsis: string;
    rating: string;
    type: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    visibility?: string;
    likesCount: number;
    viewsCount: number;
    sourceType?: string;

    categories: StoryPreviewCategoryDto[];
    mainCategory: StoryPreviewCategoryDto | null;

    authorId: string;
    authorUsername: string;

    lastReadAt: string | null;
    lastReadChapter: string | null;

    isLike: boolean;
    isCompleted: boolean;

    profileImageUrl: string | null;
    coverImageUrl: string | null;

    chapters: StoryPreviewChapterDto[];

    canEdit: boolean;
}
