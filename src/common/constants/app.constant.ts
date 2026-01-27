export const MAX_FILE_SIZE_UPLOAD = {
    TXT: 100 * 1024, // 100 KB
    DOCX: 2 * 1024 * 1024, // 2 MB
    IMAGE: 5 * 1024 * 1024, // 5 MB
};

export const DEFAULT_COVER_IMAGE_URL =
    'https://myapp-assets.sfo3.cdn.digitaloceanspaces.com/covers/cbba6c8b-744e-47fc-b5ad-a3ec8d7ccfe3.jpg';

export const TEMPORARY_COIN_DAYS = 7;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const DEFAULT_PROFILE_IMAGE_URL = 'avatars/default_avatar.png';

export const DEFAULT_AI_PROVIDER = 'gemini';

export const ERROR_MESSAGES = {
    // File Upload
    FILE_REQUIRED: 'File is required when content type is FILE.',
    UNSUPPORTED_FILE_FORMAT: 'Unsupported file format.',
    NO_TEXT_FOUND: 'No text content found in the uploaded file.',
    FAILED_EXTRACT_TEXT: 'Failed to extract text from file.',
    INVALID_AI_RESPONSE:
        'AI response is missing required fields or has invalid format.',
    FILE_TOO_LARGE: 'Uploaded file exceeds the maximum allowed size.',
    UNSUPPORTED_PLATFORM:
        'Unsupported platform. Allowed platforms are gemini and grok.',
    FAILED_TO_PARSE_FILE: 'Failed to parse the uploaded file.',
    AI_RESPONSE_MISSING_CONTENT: 'AI response missing content',

    STORY_ID_REQUIRED: 'storyId is required',

    STORY_NOT_FOUND: 'Story not found',

    // Common
    CONTENT_GENERATE_ERROR: 'An error occurred, please try again later.',
    USER_NOT_FOUND: 'User not found',
    USER_ID_REQUIRED: 'User ID is required',
    VIOLATED_SAFETY_POLICIES_PROMPT:
        'Your prompt violated our safety policies. Please try with another prompt.',
    COMIC_GENERATED_ALL_RETRY_ATTEMPT_FAILED: 'All retry attempts failed.',
    COMIC_GENERATED_DAILY_LIMIT_REACHED: 'Daily comic generation limit reached',

    FOREIGN_KEY_VIOLATION:
        'Cannot perform this operation due to existing references.',
    DUPLICATE_RECORD: 'A record with this value already exists.',
    INVALID_UUID: 'Invalid UUID format provided',
    NOT_FOUND: 'The requested resource was not found.',
    UNKNOWN_ERROR_OCCURRED:
        'The server is undergoing maintenance. Please try again later.',
    GENERATED_ALL_RETRY_ATTEMPT_FAILED: 'All retry attempts failed.',
    GENERATED_DAILY_LIMIT_REACHED: 'Daily generation limit reached',
} as const;

export const IMAGE_PREFIX = {
    COVERS: 'covers',
    COVERS_TEMP: 'covers/temp/',
    AVATARS: 'avatars',
} as const;
