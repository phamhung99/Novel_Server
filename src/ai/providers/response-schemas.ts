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
        ui_display: {
            type: 'object',
            properties: {
                story_title: { type: 'string' },
                story_cover_blurb: { type: 'string' },
            },
            required: ['story_title', 'story_cover_blurb'],
        },

        cover_image: { type: 'string' },

        story_context: {
            type: 'object',
            additionalProperties: true,
        },
    },

    required: ['ui_display', 'cover_image', 'story_context'],
};

export const CHAPTER_STRUCTURE_SCHEMA = {
    type: 'object',
    properties: {
        title: {
            type: 'string',
            description: 'Tiêu đề chương (**1. Tiêu đề chương**)',
        },
        content: {
            type: 'string',
            description:
                'Nội dung chi tiết chương (~1300 từ) (**2. Nội dung chi tiết**)',
        },
        summary: {
            type: 'string',
            description:
                'Tóm tắt TRUYỆN ĐẾN HIỆN TẠI (≤250 từ). PHẢI tổng hợp từ phần A ("Tóm tắt trước đó") + phần B ("Nội dung chương hiện tại"). Không tự tạo thêm thông tin. (**3. Tóm tắt truyện đến hiện tại**)',
        },
        directions: {
            type: 'array',
            items: { type: 'string' },
            description:
                'Hai hướng phát triển cho chương sau, ≤12 từ mỗi hướng (**4. Hai hướng phát triển chương sau**)',
        },

        // STORY DEVELOPMENT METADATA
        writingStyle: {
            type: 'string',
            description: 'Phong cách viết của chương (**1. Phong cách viết**)',
        },
        tone: {
            type: 'string',
            description: 'Ba cảm xúc chính của chương (**2. Tông cảm xúc**)',
        },
        plotLogic: {
            type: 'string',
            description:
                'Logic triển khai cốt truyện trong chương (**3. Logic phát triển**)',
        },
        emotionalMotif: {
            type: 'string',
            description:
                'Motif cảm xúc tại thời điểm hiện tại (**4. Motif cảm xúc**)',
        },
        mainCharacterArc: {
            type: 'string',
            description:
                'Biến chuyển nội tâm nhân vật chính trong chương (**5. Nhân vật chính**)',
        },
        subCharacterArc: {
            type: 'string',
            description:
                'Thay đổi vai trò / cảm xúc của nhân vật phụ (**6. Nhân vật phụ**)',
        },
        antagonistAction: {
            type: 'string',
            description:
                'Chiến lược hoặc hành động của phản diện trong chương (**7. Phản diện**)',
        },
        emotionChart: {
            type: 'string',
            description:
                'Biểu đồ cảm xúc: khởi đầu → đỉnh → kết (**8. Biểu đồ cảm xúc**)',
        },
        philosophicalSubtheme: {
            type: 'string',
            description:
                'Chủ đề triết lý phụ lồng trong chương (**9. Chủ đề triết lý phụ**)',
        },
    },
    required: [
        'chapterTitle',
        'chapterContent',
        'chapterSummary',
        'chapterDirections',

        'writingStyle',
        'tone',
        'plotLogic',
        'emotionalMotif',
        'mainCharacterArc',
        'subCharacterArc',
        'antagonistAction',
        'emotionChart',
        'philosophicalSubtheme',
    ],
};
