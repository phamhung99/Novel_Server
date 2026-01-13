export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    USERS: '/dashboard/users',
    STORY_UPLOAD: '/dashboard/stories/upload',
    STORY_OVERVIEW: '/dashboard/stories',
    STORY_PREVIEW: '/dashboard/stories/preview',
    CHAPTER_GENERATOR: '/dashboard/chapter-generator',
    MANAGE_STORIES: '/dashboard/stories/manage',
    MANUAL_CREATION: '/dashboard/stories/manual-creation',
};

export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// in milliseconds
export const POLL_INTERVAL = 10000;
export const POLL_INITIALIZATION_DELAY = 10000;

export const STORY_SOURCE_TYPES = {
    AI: 'AI',
    MANUAL: 'MANUAL',
};

export const STORY_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    PUBLISHED: 'published',
    REJECTED: 'rejected',
} as const;

export type StoryStatus = (typeof STORY_STATUS)[keyof typeof STORY_STATUS];

export const STORY_VISIBILITY = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    UNLISTED: 'unlisted',
} as const;

export type StoryVisibility =
    (typeof STORY_VISIBILITY)[keyof typeof STORY_VISIBILITY];

export const STORY_SOURCE = {
    ALL: 'all' as const,
    AI: 'AI' as const,
    MANUAL: 'Manual' as const,
} satisfies Record<string, string>;

export type StorySource = (typeof STORY_SOURCE)[keyof typeof STORY_SOURCE];

export const USER_ROLES = {
    ADMIN: 'admin',
    EDITOR: 'editor',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];
