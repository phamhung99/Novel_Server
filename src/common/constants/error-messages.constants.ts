export const ERROR_MESSAGES = {
    CONTENT_GENERATE_ERROR: 'An error occurred, please try again later.',
    USER_NOT_FOUND: 'User not found',
    USER_ID_REQUIRED: 'User ID is required',
    VIOLATED_SAFETY_POLICIES_PROMPT:
        'Your prompt violated our safety policies. Please try with another prompt.',
    COMIC_GENERATED_ALL_RETRY_ATTEMPT_FAILED: 'All retry attempts failed.',
    COMIC_GENERATED_DAILY_LIMIT_REACHED: 'Daily comic generation limit reached',
    SAME_PROMPT_COOLDOWN_MESSAGE: (seconds: number) =>
        `You have already submitted the same prompt recently. Please wait ${seconds} seconds before making another request with the same prompt.`,
} as const;
