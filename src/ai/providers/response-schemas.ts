/**
 * JSON Schemas for structured AI responses
 * Used with Grok and OpenAI's response_format parameter
 */

/**
 * Schema for Story Outline Response
 * Ensures AI returns structured data with all 9 story attributes
 */
export const STORY_OUTLINE_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Story title',
    },
    synopsis: {
      type: 'string',
      description: 'Story synopsis (2-3 sentences)',
    },
    genres: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: 'Array of story genres (e.g., ["Ngôn Tình", "Hệ Thống"])',
    },
    mainCharacter: {
      type: 'string',
      description: 'Main protagonist name and brief description',
    },
    subCharacters: {
      type: 'string',
      description: 'Supporting characters (comma-separated)',
    },
    setting: {
      type: 'string',
      description: 'Story location/environment (bối cảnh)',
    },
    plotTheme: {
      type: 'string',
      description: 'Main plot theme or central conflict',
    },
    writingStyle: {
      type: 'string',
      description: 'Writing style preferences (e.g., descriptive, fast-paced)',
    },
    additionalContext: {
      type: 'string',
      description: 'Additional context or special instructions',
    },
    outline: {
      type: 'string',
      description: 'Full story outline/framework for all chapters',
    },
  },
  required: [
    'title',
    'synopsis',
    'genres',
    'mainCharacter',
    'subCharacters',
    'setting',
    'plotTheme',
    'writingStyle',
    'additionalContext',
    'outline',
  ],
};

/**
 * Schema for Chapter Structure Response
 * Ensures AI returns structured chapter planning data
 */
export const CHAPTER_STRUCTURE_SCHEMA = {
  type: 'object',
  properties: {
    chapterNumber: {
      type: 'number',
      description: 'Chapter number',
    },
    openingHook: {
      type: 'string',
      description: 'Opening hook to grab reader attention',
    },
    sceneSetting: {
      type: 'string',
      description: 'Scene setting and atmosphere description',
    },
    characterIntroduction: {
      type: 'string',
      description: 'Character introduction or development',
    },
    plotDevelopment: {
      type: 'string',
      description: 'Plot development and key events',
    },
    structure: {
      type: 'string',
      description: 'Full chapter structure outline',
    },
  },
  required: [
    'chapterNumber',
    'openingHook',
    'sceneSetting',
    'characterIntroduction',
    'plotDevelopment',
    'structure',
  ],
};

/**
 * Schema for Complete Chapter Response
 * Ensures AI returns chapter content, summary, and image prompt
 */
export const COMPLETE_CHAPTER_SCHEMA = {
  type: 'object',
  properties: {
    chapterNumber: {
      type: 'number',
      description: 'Chapter number',
    },
    content: {
      type: 'string',
      description: 'Full chapter content (~1300 words)',
    },
    summary: {
      type: 'string',
      description: 'Chapter summary (~200 words) for context in next chapter',
    },
    imagePrompt: {
      type: 'string',
      description: 'Image generation prompt (~200 characters)',
    },
  },
  required: ['chapterNumber', 'content', 'summary', 'imagePrompt'],
};
