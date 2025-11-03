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
interface StoryOutlineResponse {
    title: string;
    synopsis: string;
    genres: string[];
    mainCharacter: string;
    subCharacters: string;
    setting: string;
    plotTheme: string;
    writingStyle: string;
    additionalContext: string;
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

        const systemPrompt = `Bạn là một người viết truyện chuyên nghiệp. 
Nhiệm vụ của bạn là lên ý tưởng để viết một câu truyện theo chủ đề được cung cấp.
Thể loại: ${dto.genres.join(', ')}`;

        const userPrompt = `Lên ý tưởng để viết một câu truyện theo chủ đề: ${dto.storyIdea}
Thể loại: ${dto.genres.join(', ')}

Cấu trúc khung truyện:
1. **Khung truyện**:
   - **Thể loại**: 
   - **Bối cảnh**: 
   - **Nhân vật chính**: 
   - **Nhân vật phụ**: 
   - **Chủ đề cốt truyện**: 
   - **Số chương**: ${dto.numberOfChapters}

2. **Phong cách viết**:
   - **Giọng văn**: 
   - **Ngôn ngữ**: 
   - **Góc nhìn**: 
   - **Hội thoại**: 
   - **Chi tiết giác quan**: 
   - **Nhịp độ**: 

3. **Hướng dẫn bổ sung**:`;

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
            // Try to parse as JSON first (from structured response)
            const parsed = JSON.parse(content);
            return {
                title: parsed.title || 'Untitled',
                synopsis: parsed.synopsis || '',
                genres: Array.isArray(parsed.genres) ? parsed.genres : [],
                mainCharacter: parsed.mainCharacter || '',
                subCharacters: parsed.subCharacters || '',
                setting: parsed.setting || '',
                plotTheme: parsed.plotTheme || '',
                writingStyle: parsed.writingStyle || '',
                additionalContext: parsed.additionalContext || '',
                numberOfChapters,
                outline: parsed.outline || content,
            };
        } catch (jsonError) {
            // Fallback to text parsing if JSON parsing fails
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
            );
            try {
                return {
                    title:
                        this.extractSection(content, 'Tên truyện|Tiêu đề') ||
                        'Untitled',
                    synopsis:
                        this.extractSection(content, 'Tóm tắt|Synopsis') || '',
                    genres: this.extractArraySection(
                        content,
                        'Thể loại|Genres',
                    ),
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
                    setting:
                        this.extractSection(content, 'Bối cảnh|Setting') || '',
                    plotTheme:
                        this.extractSection(
                            content,
                            'Chủ đề cốt truyện|Plot Theme',
                        ) || '',
                    writingStyle:
                        this.extractSection(
                            content,
                            'Phong cách viết|Writing Style',
                        ) || '',
                    additionalContext:
                        this.extractSection(
                            content,
                            'Hướng dẫn bổ sung|Additional Context',
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
                    mainCharacter: '',
                    subCharacters: '',
                    setting: '',
                    plotTheme: '',
                    writingStyle: '',
                    additionalContext: '',
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
