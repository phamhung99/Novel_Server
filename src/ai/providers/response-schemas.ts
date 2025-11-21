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
        // STORY
        title: {
            type: 'string',
            description: 'Story title (**Tiêu đề truyện**)',
        },
        synopsis: {
            type: 'string',
            description: 'Story synopsis (2-3 sentences)',
        },
        genres: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of story genres (**Thể loại truyện**)',
        },
        setting: {
            type: 'string',
            description: 'Story location/environment (**Bối cảnh**)',
        },
        mainCharacter: {
            type: 'string',
            description:
                'Main protagonist (**Nhân vật chính**) name and brief description',
        },
        subCharacters: {
            type: 'string',
            description:
                'Supporting characters (**Nhân vật phụ**), comma-separated',
        },
        antagonist: {
            type: 'string',
            description:
                'Antagonist of the story (**Phản diện**), may be hidden or explicit',
        },
        motif: {
            type: 'string',
            description:
                'Recurring motif/emotional symbol throughout the story (**Motif cảm xúc**)',
        },
        tone: {
            type: 'string',
            description:
                'Overall emotional tone of the story (**Tông cảm xúc nền**)',
        },
        writingStyle: {
            type: 'string',
            description: 'Preferred writing style (**Phong cách viết**)',
        },
        plotLogic: {
            type: 'string',
            description:
                'Internal logic / story progression (**Logic phát triển**)',
        },
        hiddenTheme: {
            type: 'string',
            description: 'Underlying theme or message (**Chủ đề tiềm ẩn**)',
        },

        // OUTPUT_CHUONG_1
        chapterTitle: {
            type: 'string',
            description: 'Tiêu đề chương 1 (**Tiêu đề chương**)',
        },
        chapterContent: {
            type: 'string',
            description:
                'Chi tiết nội dung chương 1 (~1300 từ) (**Nội dung chi tiết**)',
        },
        chapterSummary: {
            type: 'string',
            description: 'Tóm tắt chương 1 (~200 từ) (**Tóm tắt chương 1**)',
        },
        chapterDirections: {
            type: 'array',
            items: { type: 'string' },
            description:
                'Hai hướng phát triển chương 2, ≤12 từ mỗi hướng, dùng tên nhân vật cụ thể (**Hai hướng phát triển chương 2**)',
        },
        imagePrompt: {
            type: 'string',
            description:
                'Prompt 20 từ tạo ảnh minh họa (**Prompt tạo ảnh minh họa**)',
        },

        // Tổng thể outline
        // outline: {
        //     type: 'string',
        //     description: 'Full story outline / framework for all chapters',
        // },
    },
    required: [
        'title',
        'synopsis',
        'genres',
        'setting',
        'mainCharacter',
        'subCharacters',
        'antagonist',
        'motif',
        'tone',
        'writingStyle',
        'plotLogic',
        'hiddenTheme',
        'chapterTitle',
        'chapterContent',
        'chapterSummary',
        'chapterDirections',
        'imagePrompt',
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
            description:
                'Chapter summary (~200 words) for context in next chapter',
        },
        imagePrompt: {
            type: 'string',
            description: 'Image generation prompt (~200 characters)',
        },
    },
    required: ['chapterNumber', 'content', 'summary', 'imagePrompt'],
};
