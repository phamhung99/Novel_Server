import { MediaService } from 'src/media/media.service';
import { StoryPreviewDto } from 'src/story/dto/story-preview.dto';

export async function enrichStoriesToPreviewDto(
    rawStories: any[],
    mediaService: MediaService,
    userId?: string,
): Promise<StoryPreviewDto[]> {
    return Promise.all(
        rawStories.map(async (story) => ({
            storyId: story.storyId,
            title: story.title,
            synopsis: story.synopsis,
            rating: story.rating,
            type: story.type,
            status: story.status,
            createdAt: story.createdAt,
            updatedAt: story.updatedAt,
            visibility: story.visibility,
            likesCount: story.likesCount ?? 0,
            viewsCount: story.viewsCount ?? 0,
            sourceType: story.sourceType,
            chapterCount: Number(story.chapterCount) ?? 0,

            categories: story.categories || [],
            mainCategory: story.mainCategory || null,

            authorId: story.authorId,
            authorUsername: story.authorUsername,

            lastReadAt: story.lastReadAt ?? null,
            lastReadChapter: story.lastReadChapter ?? null,

            isLike: !!story.isLike,
            isCompleted: !!story.isCompleted,

            profileImageUrl: story.profileImage
                ? await mediaService.getMediaUrl(story.profileImage)
                : null,
            coverImageUrl: story.coverImage
                ? await mediaService.getMediaUrl(story.coverImage)
                : null,

            canEdit: userId ? story.authorId === userId : false,
        })),
    );
}
