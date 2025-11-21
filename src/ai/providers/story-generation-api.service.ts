import {
    Injectable,
    BadRequestException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    GenerateChapterDto,
    ChapterStructureResponseDto,
    GenerateCompleteChapterDto,
    CompleteChapterResponseDto,
} from '../../story/dto/generate-chapter.dto';
import { StoryGenerationProviderFactory } from './story-generation-provider.factory';
import { StoryGeneration } from '../../story/entities/story-generation.entity';
import {
    STORY_OUTLINE_SCHEMA,
    CHAPTER_STRUCTURE_SCHEMA,
    COMPLETE_CHAPTER_SCHEMA,
} from './response-schemas';

// Internal DTOs for 3-step flow
export interface StoryOutlineResponse {
    // STORY
    title: string;
    synopsis: string;
    genres: string[];

    setting: string;
    mainCharacter: string;
    subCharacters: string;
    antagonist: string;
    motif: string;
    tone: string;
    writingStyle: string;
    plotLogic: string;
    hiddenTheme: string;

    // OUTPUT_CHUONG_1
    chapterTitle: string;
    chapterContent: string;
    chapterSummary: string;
    chapterDirections: string[];
    imagePrompt: string;

    // EXTRA
    numberOfChapters: number;
    outline: string;
}

interface ChapterStructureResponse {
    chapterNumber: number;
    openingHook: string;
    sceneSetting: string;
    characterIntroduction: string;
    plotDevelopment: string;
    structure: string;
}

/**
 * Story Generation API Service
 * Orchestrates chapter generation using story generation AI providers
 * Implements 3-step flow: Outline → Structure → Complete Chapter
 */
@Injectable()
export class StoryGenerationApiService {
    private readonly logger = new Logger(StoryGenerationApiService.name);

    constructor(
        private storyGenerationProviderFactory: StoryGenerationProviderFactory,
        @InjectRepository(StoryGeneration)
        private storyGenerationRepository: Repository<StoryGeneration>,
    ) {}

    /**
     * STEP 1: Generate story outline/framework
     * Internal method for 3-step async process
     */
    async generateStoryOutline(dto: {
        storyIdea: string;
        genres: string[];
        numberOfChapters: number;
        aiProvider: string;
    }): Promise<StoryOutlineResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `Bạn là một tiểu thuyết gia bậc thầy kiêm chuyên gia cấu trúc truyện AI.`;

        const userPrompt = `
Dựa vào yêu cầu sau: ${dto.storyIdea}

Bạn hãy tự động xác định và sáng tạo:
- **Thể loại truyện**
- **Bối cảnh** (thời đại, thế giới, không gian)
- **Nhân vật chính** (tên, giới tính, xuất thân, mục tiêu)
- **Nhân vật phụ quan trọng**
- **Phản diện** (phải tồn tại nhưng có thể ẩn danh hoặc gieo bóng)
- **Phong cách viết** (điện ảnh, cổ phong, hiện đại, trữ tình…)
- **Biểu tượng cảm xúc xuyên truyện (Motif)**
- **Tông cảm xúc nền** (tò mò, cô độc, khát vọng, bi thương, hi vọng...)

**KIỂU MỞ TRUYỆN** (AI TỰ CHỌN hoặc tự sáng tạo phù hợp):
1. **Hiện sinh** – triết lý, cô đơn → mở bằng suy tư, hành động nhỏ chứa mâu thuẫn.  
2. **Hành động** – chiến đấu, hacker, sinh tồn → mở giữa hành động, nhịp nhanh.  
3. **Sự kiện lạ** – công nghệ, huyền bí, xuyên không → mở bằng hiện tượng phi logic.  
4. **Hồi ức / Giấc mơ** – cảm xúc, tình yêu, bi kịch → mở bằng giấc mơ hoặc ký ức nối hiện tại.  
5. **Thế giới** – dị giới, tu tiên, hệ thống → mở bằng miêu tả thế giới, luật lệ, quy tắc.

**YÊU CẦU NỘI DUNG**:
1. Viết **Chương 1** (1300 từ), có tiêu đề riêng hấp dẫn.
2. Cấu trúc: mở đầu – phát triển – cao trào nhẹ – kết mở sang chương 2.
3. Giới thiệu **nhân vật chính**, **motif cảm xúc**, **bóng phản diện**.
4. Không tóm tắt, viết miêu tả chi tiết và có nhịp cảm xúc.
5. Trả về chi tiết **Chương 1** với chữ: "Chi tiết chương 1", không thêm từ khác.

**OUTPUT_CHUONG_1**
1. **Tiêu đề chương**  
2. **Nội dung chi tiết** (1300 từ)  
3. **Tóm tắt chương 1** (200 từ)  
4. **Hai hướng phát triển chương 2**, ngắn ≤12 từ, dùng tên nhân vật cụ thể  
5. **Prompt 20 từ tạo ảnh minh họa**

**META_CHUONG_1**
1. **Thể loại truyện**  
2. **Bối cảnh**  
3. **Nhân vật chính**  
4. **Nhân vật phụ**  
5. **Phản diện** (ẩn hoặc hiện)  
6. **Motif cảm xúc**  
7. **Tông cảm xúc nền**  
8. **Phong cách viết**  
9. **Logic phát triển**  
10. **Chủ đề tiềm ẩn**
`;

        try {
            const response = await aiProvider.generateContent(
                systemPrompt,
                userPrompt,
                STORY_OUTLINE_SCHEMA,
            );
            return this.parseStoryOutline(response, dto.numberOfChapters);
        } catch (error) {
            this.logger.error('Error generating story outline:', error);
            throw new BadRequestException(
                `Failed to generate story outline: ${error.message}`,
            );
        }
    }

    /**
     * STEP 2: Generate chapter structure
     * Internal method for 3-step async process
     */
    async generateChapterStructure(dto: {
        storyId: string;
        chapterNumber: number;
        storyOutline: string;
        previousChaptersSummaries?: string[];
        aiProvider: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `Bạn là một người viết truyện chuyên nghiệp. 
Nhiệm vụ của bạn là xây dựng cấu trúc chương dựa trên dàn ý truyện đã được cung cấp.`;

        const previousChaptersContext =
            dto.previousChaptersSummaries &&
            dto.previousChaptersSummaries.length > 0
                ? `\n**Tóm tắt các chương trước:**\n${dto.previousChaptersSummaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n')}`
                : '';

        const userPrompt = `Từ dàn ý và tóm tắt nội dung chương trước xây dựng cấu trúc chương ${dto.chapterNumber} theo cấu trúc cơ bản sau. 
Bạn có thể thêm vào cấu trúc các mục cần thiết để tăng tính hấp dẫn và phù hợp với nội dung.

**Dàn ý truyện:**
${dto.storyOutline}${previousChaptersContext}

**Cấu trúc chương ${dto.chapterNumber}**:
- **Mở đầu hấp dẫn**:
- **Miêu tả bối cảnh**:
- **Giới thiệu nhân vật**:
- **Hướng phát triển cốt truyện**:`;

        try {
            const response = await aiProvider.generateContent(
                systemPrompt,
                userPrompt,
                CHAPTER_STRUCTURE_SCHEMA,
            );
            return this.parseChapterStructure(response, dto.chapterNumber);
        } catch (error) {
            this.logger.error('Error generating chapter structure:', error);
            throw new BadRequestException(
                `Failed to generate chapter structure: ${error.message}`,
            );
        }
    }

    /**
     * STEP 3: Generate complete chapter
     * Using chapter structure → AI generates full content + summary + image prompt
     */
    async generateCompleteChapter(
        dto: GenerateCompleteChapterDto,
    ): Promise<CompleteChapterResponseDto> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `Bạn là một người viết truyện chuyên nghiệp. 
Nhiệm vụ của bạn là viết nội dung chương, tóm tắt chương, và tạo prompt để sinh ảnh.`;

        const wordCount = dto.wordCount || 1300;
        const userPrompt = `Thực hiện 3 yêu cầu:

1. Viết nội dung chương ${dto.chapterNumber} theo dàn bài trên (khoảng ${wordCount} từ).
2. Tóm tắt nội dung chương ${dto.chapterNumber} (tối đa 200 từ).
3. Viết prompt để dùng để gen ảnh trên OpenAI dựa trên nội dung chương ${dto.chapterNumber} (tối đa 200 ký tự).

**Cấu trúc chương:**
${dto.chapterStructure}

Định dạng câu trả lời:
**NỘI DUNG CHƯƠNG:**
[nội dung chương ở đây]

**TÓM TẮT:**
[tóm tắt ở đây]

**IMAGE PROMPT:**
[image prompt ở đây]`;

        try {
            const response = await aiProvider.generateContent(
                systemPrompt,
                userPrompt,
                COMPLETE_CHAPTER_SCHEMA,
            );
            return this.parseCompleteChapter(response, dto.chapterNumber);
        } catch (error) {
            this.logger.error('Error generating complete chapter:', error);
            throw new BadRequestException(
                `Failed to generate complete chapter: ${error.message}`,
            );
        }
    }

    async generateChapter(
        dto: GenerateChapterDto,
    ): Promise<ChapterStructureResponseDto> {
        // Fetch story attributes from DB if not provided in DTO
        let storyAttributes = dto.storyAttributes;
        if (!storyAttributes) {
            // Try to fetch from the StoryGeneration record for this story
            const generation = await this.storyGenerationRepository.findOne({
                where: { storyId: dto.storyId },
            });

            if (generation) {
                // Reconstruct attributes from direct columns
                storyAttributes = {
                    title: generation.title,
                    synopsis: generation.synopsis,
                    genres: generation.genres || [],
                    mainCharacter: generation.mainCharacter,
                    subCharacters: generation.subCharacters,
                    setting: generation.setting,
                    plotTheme: generation.plotTheme,
                    writingStyle: generation.writingStyle,
                    additionalContext: generation.additionalContext,
                };
            } else {
                throw new NotFoundException(
                    `Story attributes not found for story ${dto.storyId}. Please provide storyAttributes in the request.`,
                );
            }
        }

        // Create a temporary DTO with fetched attributes for prompt building
        const dtoWithAttributes = { ...dto, storyAttributes };

        const providerName = dto.aiProvider || 'gpt';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `Bạn là một người viết truyện chuyên nghiệp. 
Nhiệm vụ của bạn là viết các chương truyện hấp dẫn, với cấu trúc rõ ràng và nội dung phong phú.`;

        const userPrompt = this.buildChapterPrompt(dtoWithAttributes);

        try {
            const response = await aiProvider.generateContent(
                systemPrompt,
                userPrompt,
            );

            return this.parseChapterResponse(response, dto.chapterNumber);
        } catch (error) {
            this.logger.error('Error generating chapter:', error);
            throw new BadRequestException(
                `Failed to generate chapter: ${error.message}`,
            );
        }
    }

    private buildChapterPrompt(dto: GenerateChapterDto): string {
        const storyContext = `
**Thông tin truyện:**
- Tiêu đề: ${dto.storyAttributes.title}
- Tóm tắt: ${dto.storyAttributes.synopsis}
- Thể loại: ${dto.storyAttributes.genres.join(', ')}
${dto.storyAttributes.mainCharacter ? `- Nhân vật chính: ${dto.storyAttributes.mainCharacter}` : ''}
${dto.storyAttributes.setting ? `- Bối cảnh: ${dto.storyAttributes.setting}` : ''}
${dto.storyAttributes.plotTheme ? `- Chủ đề cốt truyện: ${dto.storyAttributes.plotTheme}` : ''}
${dto.storyAttributes.writingStyle ? `- Phong cách viết: ${dto.storyAttributes.writingStyle}` : ''}
${dto.storyAttributes.additionalContext ? `- Thêm thông tin: ${dto.storyAttributes.additionalContext}` : ''}
`;

        const previousChaptersContext =
            dto.previousChaptersSummaries &&
            dto.previousChaptersSummaries.length > 0
                ? `
**Tóm tắt các chương trước:**
${dto.previousChaptersSummaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n')}
`
                : '';

        return `${storyContext}${previousChaptersContext}
Từ thông tin truyện và các chương trước, xây dựng cấu trúc chương ${dto.chapterNumber} theo cấu trúc cơ bản sau. 
Bạn có thể thêm vào cấu trúc các mục cần thiết để tăng tính hấp dẫn và phù hợp với nội dung.
Đảm bảo chương ${dto.chapterNumber} kế tiếp một cách tự nhiên từ các chương trước.

**Cấu trúc chương (${dto.wordCount || 300} từ)**:
- **Mở đầu hấp dẫn**:
- **Miêu tả bối cảnh**:
- **Giới thiệu nhân vật**:
- **Hướng phát triển cốt truyện**:`;
    }

    private parseChapterResponse(
        content: string,
        chapterNumber: number,
    ): ChapterStructureResponseDto {
        try {
            return {
                chapterNumber,
                openingHook: this.extractSection(content, 'Mở đầu hấp dẫn'),
                sceneSetting: this.extractSection(content, 'Miêu tả bối cảnh'),
                characterIntroduction: this.extractSection(
                    content,
                    'Giới thiệu nhân vật',
                ),
                plotDevelopment: this.extractSection(
                    content,
                    'Hướng phát triển cốt truyện',
                ),
                content,
            };
        } catch (error) {
            this.logger.error('Error parsing chapter response:', error);
            return {
                chapterNumber,
                openingHook: '',
                sceneSetting: '',
                characterIntroduction: '',
                plotDevelopment: '',
                content,
            };
        }
    }

    private extractSection(content: string, sectionName: string): string {
        // Support multiple section names separated by |
        // E.g., "Tên truyện|Tiêu đề" will match either "Tên truyện" or "Tiêu đề"
        const regex = new RegExp(
            `\\*\\*(${sectionName})\\*\\*:?\\s*([^\\n*]+(?:\\n(?!\\*\\*)[^\\n*]+)*)`,
            'i',
        );
        const match = content.match(regex);
        return match ? match[2].trim() : '';
    }

    private extractArraySection(
        content: string,
        sectionName: string,
    ): string[] {
        const section = this.extractSection(content, sectionName);
        return section
            .split(/[,\n]/)
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    /**
     * Parse story outline response from AI
     * Expects structured JSON response from AI with all 9 attributes
     */
    private parseStoryOutline(
        content: string,
        numberOfChapters: number,
    ): StoryOutlineResponse {
        try {
            // Try structured JSON first
            console.log('content', content);

            const parsed = JSON.parse(content);
            console.log('parsed', parsed);

            return {
                title: parsed.title || 'Untitled',
                synopsis: parsed.synopsis || '',
                genres: Array.isArray(parsed.genres) ? parsed.genres : [],

                setting: parsed.setting || '',
                mainCharacter: parsed.mainCharacter || '',
                subCharacters: parsed.subCharacters || '',
                antagonist: parsed.antagonist || '',
                motif: parsed.motif || '',
                tone: parsed.tone || '',
                writingStyle: parsed.writingStyle || '',
                plotLogic: parsed.plotLogic || '',
                hiddenTheme: parsed.hiddenTheme || '',

                chapterTitle: parsed.chapterTitle || '',
                chapterContent: parsed.chapterContent || '',
                chapterSummary: parsed.chapterSummary || '',
                chapterDirections: Array.isArray(parsed.chapterDirections)
                    ? parsed.chapterDirections
                    : [],
                imagePrompt: parsed.imagePrompt || '',

                numberOfChapters,
                outline: parsed.outline || content,
            };
        } catch (jsonError) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
            );

            try {
                return {
                    title:
                        this.extractSection(
                            content,
                            'Tên truyện|Tiêu đề|Title',
                        ) || 'Untitled',
                    synopsis:
                        this.extractSection(content, 'Tóm tắt|Synopsis') || '',

                    genres: this.extractArraySection(
                        content,
                        'Thể loại|Genres',
                    ),

                    setting:
                        this.extractSection(content, 'Bối cảnh|Setting') || '',
                    mainCharacter:
                        this.extractSection(
                            content,
                            'Nhân vật chính|Main Character',
                        ) || '',
                    subCharacters:
                        this.extractSection(
                            content,
                            'Nhân vật phụ|Sub Characters',
                        ) || '',

                    antagonist:
                        this.extractSection(content, 'Phản diện|Antagonist') ||
                        '',
                    motif:
                        this.extractSection(content, 'Motif cảm xúc|Motif') ||
                        '',
                    tone:
                        this.extractSection(content, 'Tông cảm xúc nền|Tone') ||
                        '',
                    writingStyle:
                        this.extractSection(
                            content,
                            'Phong cách viết|Writing Style',
                        ) || '',
                    plotLogic:
                        this.extractSection(
                            content,
                            'Logic phát triển|Plot Logic',
                        ) || '',
                    hiddenTheme:
                        this.extractSection(
                            content,
                            'Chủ đề tiềm ẩn|Hidden Theme',
                        ) || '',

                    chapterTitle:
                        this.extractSection(
                            content,
                            'Tiêu đề chương|Chapter Title',
                        ) || '',
                    chapterContent:
                        this.extractSection(
                            content,
                            'Nội dung chi tiết|Chapter Content',
                        ) || '',
                    chapterSummary:
                        this.extractSection(
                            content,
                            'Tóm tắt chương|Chapter Summary',
                        ) || '',
                    chapterDirections: this.extractArraySection(
                        content,
                        'Hướng phát triển|Chapter Directions',
                    ),
                    imagePrompt:
                        this.extractSection(
                            content,
                            'Prompt tạo ảnh|minh họa|Image Prompt',
                        ) || '',

                    numberOfChapters,
                    outline: content,
                };
            } catch (error) {
                this.logger.error('Error parsing story outline:', error);
                return {
                    title: 'Untitled',
                    synopsis: '',
                    genres: [],
                    setting: '',
                    mainCharacter: '',
                    subCharacters: '',
                    antagonist: '',
                    motif: '',
                    tone: '',
                    writingStyle: '',
                    plotLogic: '',
                    hiddenTheme: '',
                    chapterTitle: '',
                    chapterContent: '',
                    chapterSummary: '',
                    chapterDirections: [],
                    imagePrompt: '',
                    numberOfChapters,
                    outline: content,
                };
            }
        }
    }

    /**
     * Parse chapter structure response from AI
     * Expects structured JSON response with chapter structure sections
     */
    private parseChapterStructure(
        content: string,
        chapterNumber: number,
    ): ChapterStructureResponse {
        try {
            // Try to parse as JSON first (from structured response)
            const parsed = JSON.parse(content);
            return {
                chapterNumber: parsed.chapterNumber || chapterNumber,
                openingHook: parsed.openingHook || '',
                sceneSetting: parsed.sceneSetting || '',
                characterIntroduction: parsed.characterIntroduction || '',
                plotDevelopment: parsed.plotDevelopment || '',
                structure: parsed.structure || content,
            };
        } catch (jsonError) {
            // Fallback to text parsing if JSON parsing fails
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
            );
            try {
                return {
                    chapterNumber,
                    openingHook: this.extractSection(
                        content,
                        'Mở đầu hấp dẫn|Opening Hook',
                    ),
                    sceneSetting: this.extractSection(
                        content,
                        'Miêu tả bối cảnh|Scene Setting',
                    ),
                    characterIntroduction: this.extractSection(
                        content,
                        'Giới thiệu nhân vật|Character Introduction',
                    ),
                    plotDevelopment: this.extractSection(
                        content,
                        'Hướng phát triển cốt truyện|Plot Development',
                    ),
                    structure: content,
                };
            } catch (error) {
                this.logger.error('Error parsing chapter structure:', error);
                return {
                    chapterNumber,
                    openingHook: '',
                    sceneSetting: '',
                    characterIntroduction: '',
                    plotDevelopment: '',
                    structure: content,
                };
            }
        }
    }

    /**
     * Parse complete chapter response from AI
     * Expects structured JSON response with content, summary, and imagePrompt
     */
    private parseCompleteChapter(
        content: string,
        chapterNumber: number,
    ): CompleteChapterResponseDto {
        try {
            // Try to parse as JSON first (from structured response)
            const parsed = JSON.parse(content);
            return {
                chapterNumber: parsed.chapterNumber || chapterNumber,
                content: parsed.content || '',
                summary: parsed.summary || '',
                imagePrompt: parsed.imagePrompt || '',
            };
        } catch (jsonError) {
            // Fallback to text parsing if JSON parsing fails
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
            );
            try {
                const chapterContent = this.extractSection(
                    content,
                    'NỘI DUNG CHƯƠNG|Content',
                );
                const summary = this.extractSection(content, 'TÓM TẮT|Summary');
                const imagePrompt = this.extractSection(
                    content,
                    'IMAGE PROMPT|Image Prompt',
                );

                return {
                    chapterNumber,
                    content: chapterContent || content,
                    summary: summary || '',
                    imagePrompt: imagePrompt || '',
                };
            } catch (error) {
                this.logger.error('Error parsing complete chapter:', error);
                return {
                    chapterNumber,
                    content: content,
                    summary: '',
                    imagePrompt: '',
                };
            }
        }
    }
}
