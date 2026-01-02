export const ROUTES = {
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
