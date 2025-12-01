import {
    Injectable,
    BadRequestException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    ChapterStructureResponse,
    GenerateChapterDto,
} from '../../story/dto/generate-chapter.dto';
import { StoryGenerationProviderFactory } from './story-generation-provider.factory';
import { StoryGeneration } from '../../story/entities/story-generation.entity';
import {
    STORY_OUTLINE_SCHEMA,
    CHAPTER_STRUCTURE_SCHEMA,
} from './response-schemas';

// Internal DTOs for 3-step flow
export interface StoryOutlineResponse {
    story: {
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
        numberOfChapters: number;
        outline: string;
    };
    chapter: {
        title: string;
        content: string;
        summary: string;
        directions: string[];
        imagePrompt: string;
    };
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
        storyPrompt: string;
        genres: string[];
        numberOfChapters: number;
        aiProvider: string;
    }): Promise<StoryOutlineResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `Bạn là một tiểu thuyết gia bậc thầy kiêm chuyên gia cấu trúc truyện AI.`;

        const userPrompt = `
Dựa vào yêu cầu sau: ${dto.storyPrompt}

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
    async generateMiddleChapters(dto: {
        storyId: string;
        chapterNumber: number;
        previousChapterSummary: string;
        aiProvider: string;
        storyPrompt: string;
        direction: string;
        previousChapterMeta: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const summaryWordLimit = 200 + (dto.chapterNumber - 1) * 50;

        const systemPrompt = `Bạn là một tiểu thuyết gia bậc thầy kiêm chuyên gia cấu trúc truyện AI.`;

        const userPrompt = `Dựa trên dữ liệu: ${dto.storyPrompt}
Tóm tắt nội dung câu chuyện trước đó: ${dto.previousChapterSummary || 'Không có dữ liệu trước đó.'}

Viết Chương ${dto.chapterNumber} (1300 từ) tiếp tục phong cách và cảm xúc theo hướng ${dto.direction}.
cùng các thông tin sau ${dto.previousChapterMeta}

**YÊU CẦU NỘI DUNG**
1. Tiếp nối logic chương trước. Đảm bảo tính logic về mặt không gian, thời gian, địa điểm và nhân vật.
2. Cho nhân vật đối mặt thử thách (thể chất, tâm lý hoặc triết lý).
3. Phản diện nếu đã xuất hiện thì có đối đầu hoặc tương phản gián tiếp. Nếu chưa xuất hiện thì dần xuất hiện rõ rệt.
4. Motif cảm xúc được tái hiện hoặc biến đổi.
5. Kết chương bằng cao trào hoặc tiết lộ.

**OUTPUT_CHUONG_${dto.chapterNumber}**
1. **Tiêu đề chương**
2. **Nội dung chi tiết** (1300 từ)
3. **Tóm tắt TRUYỆN ĐẾN HIỆN TẠI** (≤ ${summaryWordLimit} từ) - PHẢI tổng hợp từ: (A) "Tóm tắt nội dung câu chuyện trước đó" + (B) "Nội dung chương ${dto.chapterNumber} vừa viết"
4. **Hai hướng phát triển chương sau** - ngắn gọn, không quá 12 từ

**META_CHUONG_${dto.chapterNumber}**
1. **Phong cách viết**
2. **Tông cảm xúc** (3 cảm xúc chính)
3. **Logic phát triển**
4. **Motif cảm xúc** (trạng thái hiện tại)
5. **Nhân vật chính** (biến chuyển nội tâm)
6. **Nhân vật phụ** (thay đổi vai trò / cảm xúc)
7. **Phản diện** (chiến lược / hành động)
8. **Biểu đồ cảm xúc** [khởi đầu → đỉnh → kết]
9. **Chủ đề triết lý phụ**`;

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

    async generatePenultimateChapter(dto: {
        storyId: string;
        chapterNumber: number;
        previousChapterSummary: string;
        aiProvider: string;
        storyPrompt: string;
        direction: string;
        previousChapterMeta: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const summaryWordLimit = 200 + (dto.chapterNumber - 1) * 50;

        const systemPrompt = `Bạn là một tiểu thuyết gia bậc thầy kiêm chuyên gia cấu trúc truyện AI.`;

        const userPrompt = `Dựa trên dữ liệu: ${dto.storyPrompt}
Tóm tắt nội dung câu chuyện trước đó: ${dto.previousChapterSummary || 'Không có dữ liệu trước đó.'}

Viết Chương ${dto.chapterNumber} (1300 từ) tiếp tục phong cách và cảm xúc theo hướng ${dto.direction}.
cùng các thông tin sau ${dto.previousChapterMeta}

**YÊU CẦU NỘI DUNG**
1. Tiếp nối logic chương trước. Đảm bảo tính logic về mặt không gian, thời gian, địa điểm và nhân vật.
2. Cho nhân vật đối mặt thử thách (thể chất, tâm lý hoặc triết lý).
3. Phản diện nếu đã xuất hiện thì có đối đầu hoặc tương phản gián tiếp. Nếu chưa xuất hiện thì dần xuất hiện rõ rệt.
4. Motif cảm xúc được tái hiện hoặc biến đổi.
5. Kết chương bằng cao trào hoặc tiết lộ.
6. Chương này là chương trước chương kết thúc của câu chuyện. Hãy chuẩn bị cho sự kết thúc câu chuyện ở chương sau (chương cuối cùng) để đảm bảo cái kết ở chương sau không gây cảm giác đột ngột cho người đọc.

**OUTPUT_CHUONG_${dto.chapterNumber}**
1. **Tiêu đề chương**
2. **Nội dung chi tiết** (1300 từ)
3. **Tóm tắt TRUYỆN ĐẾN HIỆN TẠI** (≤ ${summaryWordLimit} từ) - PHẢI tổng hợp từ: (A) "Tóm tắt nội dung câu chuyện trước đó" + (B) "Nội dung chương ${dto.chapterNumber} vừa viết"
4. **Hai hướng phát triển chương sau** - ngắn gọn, không quá 12 từ

**META_CHUONG_${dto.chapterNumber}**
1. **Phong cách viết**
2. **Tông cảm xúc** (3 cảm xúc chính)
3. **Logic phát triển**
4. **Motif cảm xúc** (trạng thái hiện tại)
5. **Nhân vật chính** (biến chuyển nội tâm)
6. **Nhân vật phụ** (thay đổi vai trò / cảm xúc)
7. **Phản diện** (chiến lược / hành động)
8. **Biểu đồ cảm xúc** [khởi đầu → đỉnh → kết]
9. **Chủ đề triết lý phụ**`;

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

    async generateFinalChapter(dto: {
        storyId: string;
        chapterNumber: number;
        previousChapterSummary: string;
        aiProvider: string;
        storyPrompt: string;
        direction: string;
        previousChapterMeta: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const summaryWordLimit = 200 + (dto.chapterNumber - 1) * 50;

        const systemPrompt = `Bạn là một tiểu thuyết gia bậc thầy kiêm chuyên gia cấu trúc truyện AI.`;

        const userPrompt = `Dựa trên dữ liệu: ${dto.storyPrompt}
Tóm tắt nội dung câu chuyện trước đó: ${dto.previousChapterSummary || 'Không có dữ liệu trước đó.'}

Viết Chương ${dto.chapterNumber} (1300 từ) tiếp tục phong cách và cảm xúc theo hướng ${dto.direction}.
cùng các thông tin sau ${dto.previousChapterMeta}

**YÊU CẦU NỘI DUNG**
1. Tiếp nối logic chương trước. Đảm bảo tính logic về mặt không gian, thời gian, địa điểm và nhân vật.
2. Cho nhân vật đối mặt thử thách (thể chất, tâm lý hoặc triết lý).
3. Phản diện nếu đã xuất hiện thì có đối đầu hoặc tương phản gián tiếp. Nếu chưa xuất hiện thì dần xuất hiện rõ rệt.
4. Motif cảm xúc được tái hiện hoặc biến đổi.
5. Kết chương bằng cao trào hoặc tiết lộ.
6. Chương này là chương kết thúc của câu chuyện. Hãy kết thúc câu chuyện nhưng đảm bảo cái kết ở chương này không gây cảm giác đột ngột cho người đọc.

**OUTPUT_CHUONG_${dto.chapterNumber}**
1. **Tiêu đề chương**
2. **Nội dung chi tiết** (1300 từ)
3. **Tóm tắt TRUYỆN ĐẾN HIỆN TẠI** (≤ ${summaryWordLimit} từ) - PHẢI tổng hợp từ: (A) "Tóm tắt nội dung câu chuyện trước đó" + (B) "Nội dung chương ${dto.chapterNumber} vừa viết"
4. **Hai hướng phát triển chương sau** - ngắn gọn, không quá 12 từ

**META_CHUONG_${dto.chapterNumber}**
1. **Phong cách viết**
2. **Tông cảm xúc** (3 cảm xúc chính)
3. **Logic phát triển**
4. **Motif cảm xúc** (trạng thái hiện tại)
5. **Nhân vật chính** (biến chuyển nội tâm)
6. **Nhân vật phụ** (thay đổi vai trò / cảm xúc)
7. **Phản diện** (chiến lược / hành động)
8. **Biểu đồ cảm xúc** [khởi đầu → đỉnh → kết]
9. **Chủ đề triết lý phụ**`;

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

    //     async generateChapter(
    //         dto: GenerateChapterDto,
    //     ): Promise<ChapterStructureResponseDto> {
    //         // Fetch story attributes from DB if not provided in DTO
    //         let storyAttributes = dto.storyAttributes;
    //         if (!storyAttributes) {
    //             // Try to fetch from the StoryGeneration record for this story
    //             const generation = await this.storyGenerationRepository.findOne({
    //                 where: { storyId: dto.storyId },
    //             });

    //             if (generation) {
    //                 // Reconstruct attributes from direct columns
    //                 storyAttributes = {
    //                     title: generation.title,
    //                     synopsis: generation.synopsis,
    //                     genres: generation.genres || [],
    //                     mainCharacter: generation.mainCharacter,
    //                     subCharacters: generation.subCharacters,
    //                     setting: generation.setting,
    //                     plotTheme: generation.plotTheme,
    //                     writingStyle: generation.writingStyle,
    //                     additionalContext: generation.additionalContext,
    //                 };
    //             } else {
    //                 throw new NotFoundException(
    //                     `Story attributes not found for story ${dto.storyId}. Please provide storyAttributes in the request.`,
    //                 );
    //             }
    //         }

    //         // Create a temporary DTO with fetched attributes for prompt building
    //         const dtoWithAttributes = { ...dto, storyAttributes };

    //         const providerName = dto.aiProvider || 'gpt';
    //         const aiProvider =
    //             this.storyGenerationProviderFactory.getProvider(providerName);

    //         const systemPrompt = `Bạn là một người viết truyện chuyên nghiệp.
    // Nhiệm vụ của bạn là viết các chương truyện hấp dẫn, với cấu trúc rõ ràng và nội dung phong phú.`;

    //         const userPrompt = this.buildChapterPrompt(dtoWithAttributes);

    //         try {
    //             const response = await aiProvider.generateContent(
    //                 systemPrompt,
    //                 userPrompt,
    //             );

    //             return this.parseChapterResponse(response, dto.chapterNumber);
    //         } catch (error) {
    //             this.logger.error('Error generating chapter:', error);
    //             throw new BadRequestException(
    //                 `Failed to generate chapter: ${error.message}`,
    //             );
    //         }
    //     }

    //     private buildChapterPrompt(dto: GenerateChapterDto): string {
    //         const storyContext = `
    // **Thông tin truyện:**
    // - Tiêu đề: ${dto.storyAttributes.title}
    // - Tóm tắt: ${dto.storyAttributes.synopsis}
    // - Thể loại: ${dto.storyAttributes.genres.join(', ')}
    // ${dto.storyAttributes.mainCharacter ? `- Nhân vật chính: ${dto.storyAttributes.mainCharacter}` : ''}
    // ${dto.storyAttributes.setting ? `- Bối cảnh: ${dto.storyAttributes.setting}` : ''}
    // ${dto.storyAttributes.plotTheme ? `- Chủ đề cốt truyện: ${dto.storyAttributes.plotTheme}` : ''}
    // ${dto.storyAttributes.writingStyle ? `- Phong cách viết: ${dto.storyAttributes.writingStyle}` : ''}
    // ${dto.storyAttributes.additionalContext ? `- Thêm thông tin: ${dto.storyAttributes.additionalContext}` : ''}
    // `;

    //         const previousChaptersContext =
    //             dto.previousChaptersSummaries &&
    //             dto.previousChaptersSummaries.length > 0
    //                 ? `
    // **Tóm tắt các chương trước:**
    // ${dto.previousChaptersSummaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n')}
    // `
    //                 : '';

    //         return `${storyContext}${previousChaptersContext}
    // Từ thông tin truyện và các chương trước, xây dựng cấu trúc chương ${dto.chapterNumber} theo cấu trúc cơ bản sau.
    // Bạn có thể thêm vào cấu trúc các mục cần thiết để tăng tính hấp dẫn và phù hợp với nội dung.
    // Đảm bảo chương ${dto.chapterNumber} kế tiếp một cách tự nhiên từ các chương trước.

    // **Cấu trúc chương (${dto.wordCount || 300} từ)**:
    // - **Mở đầu hấp dẫn**:
    // - **Miêu tả bối cảnh**:
    // - **Giới thiệu nhân vật**:
    // - **Hướng phát triển cốt truyện**:`;
    //     }

    // private parseChapterResponse(
    //     content: string,
    //     chapterNumber: number,
    // ): ChapterStructureResponseDto {
    //     try {
    //         return {
    //             chapterNumber,
    //             openingHook: this.extractSection(content, 'Mở đầu hấp dẫn'),
    //             sceneSetting: this.extractSection(content, 'Miêu tả bối cảnh'),
    //             characterIntroduction: this.extractSection(
    //                 content,
    //                 'Giới thiệu nhân vật',
    //             ),
    //             plotDevelopment: this.extractSection(
    //                 content,
    //                 'Hướng phát triển cốt truyện',
    //             ),
    //             content,
    //         };
    //     } catch (error) {
    //         this.logger.error('Error parsing chapter response:', error);
    //         return {
    //             chapterNumber,
    //             openingHook: '',
    //             sceneSetting: '',
    //             characterIntroduction: '',
    //             plotDevelopment: '',
    //             content,
    //         };
    //     }
    // }

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
            const parsed = JSON.parse(content);

            const story = parsed.story || {};
            const chapter = parsed.chapter || {};

            return {
                story: {
                    title: story.title || 'Untitled',
                    synopsis: story.synopsis || '',
                    genres: Array.isArray(story.genres) ? story.genres : [],
                    setting: story.setting || '',
                    mainCharacter: story.mainCharacter || '',
                    subCharacters: story.subCharacters || '',
                    antagonist: story.antagonist || '',
                    motif: story.motif || '',
                    tone: story.tone || '',
                    writingStyle: story.writingStyle || '',
                    plotLogic: story.plotLogic || '',
                    hiddenTheme: story.hiddenTheme || '',
                    numberOfChapters,
                    outline: story.outline || content,
                },
                chapter: {
                    title: chapter.title || '',
                    content: chapter.content || '',
                    summary: chapter.summary || '',
                    directions: Array.isArray(chapter.directions)
                        ? chapter.directions
                        : [],
                    imagePrompt: chapter.imagePrompt || '',
                },
            };
        } catch (error) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
                error,
            );

            try {
                return {
                    story: {
                        title:
                            this.extractSection(
                                content,
                                'Tên truyện|Tiêu đề|Title',
                            ) || 'Untitled',
                        synopsis:
                            this.extractSection(content, 'Tóm tắt|Synopsis') ||
                            '',
                        genres: this.extractArraySection(
                            content,
                            'Thể loại|Genres',
                        ),
                        setting:
                            this.extractSection(content, 'Bối cảnh|Setting') ||
                            '',
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
                            this.extractSection(
                                content,
                                'Phản diện|Antagonist',
                            ) || '',
                        motif:
                            this.extractSection(
                                content,
                                'Motif cảm xúc|Motif',
                            ) || '',
                        tone:
                            this.extractSection(
                                content,
                                'Tông cảm xúc nền|Tone',
                            ) || '',
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
                        numberOfChapters,
                        outline: content,
                    },
                    chapter: {
                        title:
                            this.extractSection(
                                content,
                                'Tiêu đề chương|Chapter Title',
                            ) || '',
                        content:
                            this.extractSection(
                                content,
                                'Nội dung chi tiết|Chapter Content',
                            ) || '',
                        summary:
                            this.extractSection(
                                content,
                                'Tóm tắt chương|Chapter Summary',
                            ) || '',
                        directions: this.extractArraySection(
                            content,
                            'Hướng phát triển|Chapter Directions',
                        ),
                        imagePrompt:
                            this.extractSection(
                                content,
                                'Prompt tạo ảnh|minh họa|Image Prompt',
                            ) || '',
                    },
                };
            } catch (error) {
                this.logger.error('Error parsing story outline:', error);
                return {
                    story: {
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
                        numberOfChapters,
                        outline: content,
                    },
                    chapter: {
                        title: '',
                        content: '',
                        summary: '',
                        directions: [],
                        imagePrompt: '',
                    },
                };
            }
        }
    }

    private parseChapterStructure(
        content: string,
        chapterNumber: number,
    ): ChapterStructureResponse {
        try {
            const parsed = JSON.parse(content);
            return {
                chapterNumber,
                title: parsed.title || '',
                content: parsed.content || '',
                structure: {
                    summary: parsed.summary || '',
                    directions: Array.isArray(parsed.directions)
                        ? parsed.directions
                        : [],

                    writingStyle: parsed.writingStyle || '',
                    tone: parsed.tone || '',
                    plotLogic: parsed.plotLogic || '',
                    emotionalMotif: parsed.emotionalMotif || '',
                    mainCharacterArc: parsed.mainCharacterArc || '',
                    subCharacterArc: parsed.subCharacterArc || '',
                    antagonistAction: parsed.antagonistAction || '',
                    emotionChart: parsed.emotionChart || '',
                    philosophicalSubtheme: parsed.philosophicalSubtheme || '',
                },
                raw: content,
            };
        } catch (jsonError) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
            );

            try {
                const extract = (label: string) =>
                    this.extractSection(content, label);

                return {
                    chapterNumber,

                    title: extract('Tiêu đề chương|Title'),
                    content: extract('Nội dung chi tiết|Content'),
                    structure: {
                        summary: extract('Tóm tắt truyện đến hiện tại|Summary'),
                        directions: extract('Hướng phát triển|Directions')
                            .split('\n')
                            .map((s) => s.trim())
                            .filter(Boolean),

                        writingStyle: extract('Phong cách viết|Writing Style'),
                        tone: extract('Tông cảm xúc|Tone'),
                        plotLogic: extract('Logic phát triển|Plot Logic'),
                        emotionalMotif: extract(
                            'Motif cảm xúc|Emotional Motif',
                        ),
                        mainCharacterArc: extract(
                            'Nhân vật chính|Main Character',
                        ),
                        subCharacterArc: extract('Nhân vật phụ|Sub Character'),
                        antagonistAction: extract('Phản diện|Antagonist'),
                        emotionChart: extract('Biểu đồ cảm xúc|Emotion Chart'),
                        philosophicalSubtheme: extract(
                            'Chủ đề triết lý|Philosophical Subtheme',
                        ),
                    },
                    raw: content,
                };
            } catch (error) {
                this.logger.error('Error parsing chapter structure:', error);

                return {
                    chapterNumber,
                    title: '',
                    content: '',
                    structure: {
                        summary: '',
                        directions: [],

                        writingStyle: '',
                        tone: '',
                        plotLogic: '',
                        emotionalMotif: '',
                        mainCharacterArc: '',
                        subCharacterArc: '',
                        antagonistAction: '',
                        emotionChart: '',
                        philosophicalSubtheme: '',
                    },
                    raw: content,
                };
            }
        }
    }

    /**
     * Parse complete chapter response from AI
     * Expects structured JSON response with content, summary, and imagePrompt
     */
    // private parseCompleteChapter(
    //     content: string,
    //     chapterNumber: number,
    // ): CompleteChapterResponseDto {
    //     try {
    //         // Try to parse as JSON first (from structured response)
    //         const parsed = JSON.parse(content);
    //         return {
    //             chapterNumber: parsed.chapterNumber || chapterNumber,
    //             content: parsed.content || '',
    //             summary: parsed.summary || '',
    //             imagePrompt: parsed.imagePrompt || '',
    //         };
    //     } catch (jsonError) {
    //         // Fallback to text parsing if JSON parsing fails
    //         this.logger.warn(
    //             'Failed to parse JSON response, falling back to text parsing',
    //         );
    //         try {
    //             const chapterContent = this.extractSection(
    //                 content,
    //                 'NỘI DUNG CHƯƠNG|Content',
    //             );
    //             const summary = this.extractSection(content, 'TÓM TẮT|Summary');
    //             const imagePrompt = this.extractSection(
    //                 content,
    //                 'IMAGE PROMPT|Image Prompt',
    //             );

    //             return {
    //                 chapterNumber,
    //                 content: chapterContent || content,
    //                 summary: summary || '',
    //                 imagePrompt: imagePrompt || '',
    //             };
    //         } catch (error) {
    //             this.logger.error('Error parsing complete chapter:', error);
    //             return {
    //                 chapterNumber,
    //                 content: content,
    //                 summary: '',
    //                 imagePrompt: '',
    //             };
    //         }
    //     }
    // }
}
