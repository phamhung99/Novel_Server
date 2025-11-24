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
    ],
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
