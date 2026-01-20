import { StoryPreviewDto } from './story-preview.dto';

export class PaginatedStoryPreviewResponse {
    page: number;
    limit: number;
    total: number;
    items: StoryPreviewDto[];
}
