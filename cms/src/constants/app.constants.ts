export const ROUTES = {
    DASHBOARD: '/dashboard',
    USERS: '/dashboard/users',
    STORY_UPLOAD: '/dashboard/stories/upload',
    STORY_DETAILS: '/dashboard/stories',
    STORY_PREVIEW: '/dashboard/stories/preview',
    CHAPTER_GENERATOR: '/dashboard/chapter-generator',
    MANAGE_STORIES: '/dashboard/stories/manage',
};

export const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const POLL_INTERVAL = 10000; // 10 seconds
