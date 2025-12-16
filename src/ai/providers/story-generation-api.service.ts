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
    title: string;
    synopsis: string;
    coverImage: string;
    storyContext: any;
    numberOfChapters: number;
    outline: string;
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

        const systemPrompt = `# YOU ARE THE WORLD'S FOREMOST NARRATIVE ARCHITECT
Publishers pay $50,000 for your story blueprints. Hollywood adapts your frameworks into blockbusters. 
Your genius lies in transforming raw ideas into universal narrative engines that resonate across all cultures.`;

        const userPrompt = `
# YOUR CURRENT COMMISSION
A client brings you this idea: ${dto.storyPrompt}

Language detection: [AUTO-DETECT]
Target output language: [USER_SPECIFIED_OR_DEFAULT_TO_INPUT]

# YOUR CREATIVE PROCESS
You think in three dimensions simultaneously:
1. **EMOTIONAL CORE**: What human experience is at the heart?
2. **STRUCTURAL BONES**: What plot architecture supports it?
3. **UNIVERSAL APPEAL**: How does this work globally?

# CRITICAL INSTRUCTIONS
1. **SEGREGATE OUTPUT**: UI display vs Backend logic
2. **UI DISPLAY**: In target language - For readers. *The story cover blurb must be a compelling teaser focused on hook, stakes, and emotional appeal. It should NEVER mention technical or meta details like total chapter count, narrative structure phases, or writing instructions.*
3. **STORY CONTEXT**: In ENGLISH - For AI reasoning consistency
4. **CULTURAL AGNOSTIC**: Design for global resonance
5. **NARRATIVE IMMERSION**: The story's prose, when generated from this architecture, must maintain an organic and seamless flow. It is strictly forbidden to use awkward meta-references to its own structure (e.g., "as mentioned in chapter X," "as we will see later," "little did he know, this event would trigger..."). All exposition, foreshadowing, and character knowledge must be revealed naturally through present-moment action, dialogue, internal thought, and sensory description.

# OUTPUT FORMAT - SINGLE JSON ONLY
{
  "ui_display": {
    "story_title": "[Catchy title in target language. Evokes genre and emotion]",
    "story_cover_blurb": "[Compelling teaser in target language. <200 words. Focus on hook, stakes, and why-we-care. Must read as a natural book blurb for a reader, with zero references to chapter counts, narrative paradigms, or architectural terms.]"
  },
"cover_image": "Create a highly detailed, emotionally compelling AI art prompt for a SQUARE (1:1 aspect ratio) book cover that will stand out in a listing of many covers. The prompt MUST: 1) Be entirely TEXT-FREE - absolutely no words, letters, symbols, or text of any kind visible in the image. 2) Use a SQUARE (1:1) aspect ratio optimized for app listing displays. 3) Create an IMMEDIATE EMOTIONAL IMPACT through facial expressions, body language, composition, and color psychology. 4) Include SPECIFIC VISUAL METAPHORS for the core themes: time travel (shattering hourglass, fractured time elements), redemption (light breaking through shadows), and tragic love (intertwined but broken elements). 5) Feature a DYNAMIC, EYE-CATCHING COMPOSITION that tells the story at a glance - consider circular flow, diagonal tension, or symbolic contrast within the square frame. 6) Use GENRE-APPROPRIATE ART STYLES (semi-realistic digital painting for Xianxia) with professional art references. The prompt should be concise yet detailed enough for AI image generators to produce a cover that makes viewers feel the story's emotional core before reading a single word, with ZERO text elements in the final image."
  "story_context": {
    "meta": {
      "primary_genre": "[e.g., Quantum Fantasy, Neo-Noir Thriller, Solarpunk Romance]",
      "secondary_genres": ["Supporting genres"],
      "narrative_paradigm": "[Hero's Journey / Kishotenketsu / Three-Act / Episodic]",
      "total_chapters": the story MUST end in ${dto.numberOfChapters}.
      "output_language": "[Target language]"
    },
    "universal_style_engine": {
      "tone_description": "[e.g., Gritty yet hopeful, Lyrical with sharp edges]",
      "voice_principle": "[e.g., Close-third with cinematic cuts, should avoid first person voice. THE NARRATIVE PROSE MUST FLOW SEAMLESSLY. AVOID ALL EXPLICIT, AWKWARD META-REFERENCES TO THE STORY'S OWN STRUCTURE (e.g., 'as mentioned earlier,' 'as will be seen in the future,' 'this event, which would later be known as...'). Events, backstory, and character knowledge must be revealed organically through present action, dialogue, thought, and sensory description.]",
      "sensory_priority": "[Visual/Tactile/Auditory balance]",
      "dialogue_style": "[Naturalistic / Stylized / Minimalist]"
    },
    "character_universe": {
      "protagonist": {
        "name": "[Name]",
        "core_contradiction": "[e.g., Brutally pragmatic but secretly sentimental]",
        "universal_arc": "[Transformation path]",
        "moral_compass": "[Guiding principle]"
      },
      "relationship_matrix": [
        {
          "character": "[Name]",
          "role": "[Mentor/Rival/Love Interest]",
          "dynamic": "[Nature of relationship]",
          "conflict_source": "[What they disagree about fundamentally]"
        }
      ]
    },
    "world_framework": {
      "core_premise": "[One-sentence universal concept]",
      "societal_engine": "[What makes this world's society tick?]",
      "conflict_sources": ["Primary", "Secondary", "Tertiary"],
      "thematic_cores": ["Identity", "Justice", "Connection", "Freedom"]
    },
    "adaptive_structure": {
      "phase_breakdown": {
        "establishment": "Chapters 1-?",
        "complication": "Chapters ?-?",
        "culmination": "Chapters ?-end"
      },
      "pacing_philosophy": "[Genre-appropriate rhythm]",
      "chapter_archetypes": ["Plot-driven", "Character-deep", "World-expand", "Theme-weave"]
    },
    "chapter_1_blueprint": {
      "opening_strategy": "[ACTION/MYSTERY/CHARACTER/WORLD based on genre]",
      "emotional_hook": "[What feeling to evoke first?]",
      "inciting_incident": "[The event that changes everything]",
      "first_cliffhanger": "[The question that demands Chapter 2]"
    }
  }
}`;

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

            return {
                title: parsed.ui_display?.story_title || 'Untitled',
                synopsis: parsed.ui_display?.story_cover_blurb || '',
                coverImage: parsed.cover_image || '',
                storyContext: parsed.story_context || {},
                numberOfChapters,
                outline: parsed.outline || content,
            };
        } catch (error) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
                error,
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
                    coverImage: '', // fallback không parse được từ text
                    storyContext: { rawContent: content },
                    numberOfChapters,
                    outline: content,
                };
            } catch (fallbackError) {
                this.logger.error(
                    'Error parsing story outline:',
                    fallbackError,
                );
                return {
                    title: 'Untitled',
                    synopsis: '',
                    coverImage: '',
                    storyContext: { rawContent: content },
                    numberOfChapters,
                    outline: content,
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
