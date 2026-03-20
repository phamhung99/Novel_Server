export enum StoryStatus {
    DRAFT = 'draft', // Only visible to author
    PENDING = 'pending', // Waiting for admin approval
    PUBLISHED = 'published', // Live and publicly visible
    REJECTED = 'rejected', // Admin rejected, author can revise
}
