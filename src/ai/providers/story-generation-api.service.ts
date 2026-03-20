import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
    ChapterStructureContent,
    ChapterStructureResponse,
} from '../../story/dto/generate-chapter.dto';
import { StoryGenerationProviderFactory } from './story-generation-provider.factory';
import {
    STORY_OUTLINE_SCHEMA,
    CHAPTER_STRUCTURE_SCHEMA,
} from './response-schemas';
import { GenerateRawContentDto } from '../dto/generate-raw-content.dto';
import { isEmptyObject } from '../utils/object.utils';

export interface StoryContent {
    title: string;
    synopsis: string;
    coverImage: string;
    storyContext: any;
    numberOfChapters: number;
    outline: string;
}

export interface StoryOutlineResponse {
    content: StoryContent;
    totalTokenCount: number;
}

export interface rawContentResponse {
    content: string;
    totalTokenCount: number;
}

@Injectable()
export class StoryGenerationApiService {
    private readonly logger = new Logger(StoryGenerationApiService.name);

    constructor(
        private storyGenerationProviderFactory: StoryGenerationProviderFactory,
    ) {}

    async generateCoverImage(prompt: string, model?: string): Promise<string> {
        const providerName = 'gemini';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        try {
            const imageUrl = await aiProvider.generateImage(prompt, model);
            return imageUrl;
        } catch (error) {
            this.logger.error('Error generating cover image:', error);
            throw error;
        }
    }

    async generateStoryOutline(dto: {
        storyPrompt: string;
        genres: string[];
        numberOfChapters: number;
        aiProvider: string;
        aiModel?: string;
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
`;

        try {
            const { content, totalTokenCount } =
                await aiProvider.generateContent({
                    prompt: userPrompt,
                    systemPrompt,
                    responseSchema: STORY_OUTLINE_SCHEMA,
                    model: dto.aiModel,
                });

            const parsedOutline = this.parseStoryOutline(
                content,
                dto.numberOfChapters,
            );

            return {
                content: parsedOutline,
                totalTokenCount,
            };
        } catch (error) {
            this.logger.error('Error generating story outline:', error);
            throw new BadRequestException(
                `Failed to generate story outline: ${error.message}`,
            );
        }
    }

    async generateFirstChapter(dto: {
        storyId: string;
        chapterNumber: number;
        storyMetadata: string;
        aiProvider: string;
        aiModel?: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `# YOU ARE A WORLD-CLASS NOVELIST SPECIALIZING IN UNFORGETTABLE OPENINGS
Your first chapters have launched 37 bestselling careers. Literary agents say: "If she writes the opening, the book sells."
Critics describe your style as "a literary gut-punch followed by a slow-burn addiction."
`;

        const userPrompt = `# YOUR CURRENT ASSIGNMENT
Write Chapter 1 of a novel based on this Story Bible: 

## STORY BIBLE ${dto.storyMetadata}

YOUR OPENING MANIFESTO
FIRST SENTENCE: Must make the reader FEEL something immediately
FIRST PAGE: Must make the reader CARE about someone
FIRST CHAPTER: Must make the reader NEED to know what happens next

ABSOLUTE PROHIBITIONS
NO waking up scenes

NO breakfast routines

NO mirror descriptions

NO weather openings (unless thematically essential)

NO info-dumping history lessons

EXECUTION FRAMEWORK
STEP 1: ACTIVATE THE BLUEPRINT
Check chapter1Blueprint from Story Bible

Implement the specified opening strategy exactly

Respect all universalStyleEngine rules (tone, voice, sensoryPriority)
STEP 2: CHARACTER INTRODUCTION THROUGH ACTION
Show, never tell:

Don't say "he was brave" → Show him doing something brave despite fear

Don't say "she was lonely" → Show her rituals of solitude

Don't say "they were powerful" → Show others reacting to them

CONNECTION RULE: THE ORIGIN-SETTING BRIDGE Establish a critical resonance between the protagonist's Background (Origin) and the Current Conflict (Setting). This bridge must rely on two pillars:
1. Domain Expertise Transfer: The protagonist's unique skills/obsessions from their previous life/phase must be the exact tools needed to solve the new world's problems (e.g., A CEO managing a Kingdom, a Hacker decoding Magic).
2. Thematic Irony: Place the protagonist in a situation that directly challenges their past beliefs, arrogance, or regrets. They must become what they once mocked, feared, or failed to understand.

STEP 3: WORLD-BUILDING THROUGH IMMERSION
Let the reader discover:

Society through conflicts and norms

Technology/magic through usage and limitations

History through consequences and relics

STEP 4: THE HOOK & ESCALATION
Minute 1: Establish normal (with tension underneath)

Minute 5: Disrupt normal (inciting incident)

Minute 10: Force choice (protagonist must act)

Minute 15: Raise stakes (consequences appear)

Ending: Cliffhanger that poses NEW, URGENT question

TECHNICAL SPECIFICATIONS
Length: 1500 words

Language: Strictly {{meta.outputLanguage}} from Story Bible

Pacing: Follow pacing_philosophy from Story Bible

Sensory: Implement sensoryPriority balance from Story Bible

CRITICAL RULES
Chapter content must be written in {{meta.outputLanguage}}

Continuity snapshot must be written in ENGLISH for AI processing

Do NOT include full chapter content in the continuity snapshot - only summaries

End with a compelling cliffhanger that creates demand for Chapter 2

Follow all genre conventions specified in the Story Bible

VALIDATION CHECKLIST (INTERNAL)
Before output, verify:

Chapter follows chapter1Blueprint from Story Bible

Language is correct {{meta.outputLanguage}}

Tone matches tone_description from Story Bible

Characters act according to their archetypes

World-building is immersive, not expository

Ending has a strong cliffhanger

Continuity snapshot is comprehensive but concise (ENGLISH only)

Return ONLY the JSON object. No additional text.
`;

        try {
            const { content, totalTokenCount } =
                await aiProvider.generateContent({
                    prompt: userPrompt,
                    systemPrompt,
                    responseSchema: CHAPTER_STRUCTURE_SCHEMA,
                    model: dto.aiModel,
                });

            const chapterStructure = await this.parseChapterStructure(
                content,
                dto.chapterNumber,
            );

            return {
                content: chapterStructure,
                totalTokenCount,
            };
        } catch (error) {
            this.logger.error('Error generating chapter structure:', error);
            throw new BadRequestException(
                `Failed to generate chapter structure: ${error.message}`,
            );
        }
    }

    async generateRemainChapters(dto: {
        storyId: string;
        chapterNumber: number;
        aiProvider: string;
        direction: string;
        storyPrompt: string;
        storyMetadata: string;
        previousChapterMetadata: string;
        aiModel?: string;
    }): Promise<ChapterStructureResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `# YOU ARE A GENRE STEWARD & SERIAL STORYTELLER
Your dual mission: 
1. Continue the story respecting user choices
2. Maintain absolute genre authenticity across the entire narrative`;

        const userPrompt = `## INPUT REQUIREMENTS
You need these 3 inputs:
**1. ORIGINAL STORY BIBLE:** ${dto.storyMetadata}
2. PREVIOUS CHAPTER CONTINUITY SNAPSHOT (from previous chapter output): ${dto.previousChapterMetadata}
3. USER'S CHOICE FOR THIS CHAPTER: ${dto.direction}
WRITING INSTRUCTIONS
A. UNDERSTAND CURRENT STATE
Read the continuity_snapshot to understand where the story left off

Note: This contains ONLY summaries, not the full chapter text

Current chapter number: ${dto.chapterNumber}

B. EXECUTE USER'S CHOICE
The protagonist will attempt: "{{SELECTED_OPTION_LABEL_FROM_PREVIOUS_NEXT_OPTIONS}}"

Show the attempt, complications, and realistic consequences

Filter this through the protagonist's established personality from Story Bible

C. FOLLOW STORY BIBLE RULES
Tone: Must match tone_description from Story Bible

Style: Must follow linguistic_signature rules

Characters: Must act according to their archetypes

World: Must respect established world rules

D. CHAPTER STRUCTURE
Opening (200 words): Re-establish context naturally from where previous chapter ended

Development (600 words): Protagonist executes the chosen option, encounters obstacles

Crisis (400 words): Situation worsens or reveals unexpected complications

Cliffhanger (300 words): New urgent question or revelation that demands next chapter

E. TECHNICAL REQUIREMENTS
Length: 1500 words

Language: {{meta.output_language}} from Story Bible

Ending: Must have compelling cliffhanger

Pacing: Consider current story phase (Setup/Development/Climax)

CRITICAL RULES
Chapter content: Written in {{meta.output_language}}

Continuity snapshot: Written in ENGLISH only

No full text: Do NOT include previous chapter content in output

Continuity: Must be consistent with all previous continuity snapshots

Cliffhanger required: Chapter must end with new compelling question

**CORE MANDATE**: The entire narrative must be designed as an inexorable march toward the user's stated goal. While not every chapter needs to show direct 
progress in conquest or romance, each chapter should meaningfully contribute to the protagonist's overall power, influence, relationships, or strategic position. 
Character development, political intrigue, and world-building chapters are essential but must ultimately serve the core objectives, creating a cohesive narrative 
where even detours feel purposeful and lead back to the main path. User's goal: ${dto.storyPrompt}

VALIDATION (INTERNAL AI CHECK)
Before output, ask:

Is this consistent with previous continuity_snapshot data?

Does the protagonist's action match the user's chosen option?

Are Story Bible rules followed (tone, style, characters, world)?

Is the ending cliffhanger compelling?

Is continuity snapshot in ENGLISH only?

Is chapter content in correct language?

Return ONLY the JSON object. No additional text or commentary.
`;

        try {
            const { content, totalTokenCount } =
                await aiProvider.generateContent({
                    prompt: userPrompt,
                    systemPrompt,
                    responseSchema: CHAPTER_STRUCTURE_SCHEMA,
                    model: dto.aiModel,
                });

            const chapterStructure = await this.parseChapterStructure(
                content,
                dto.chapterNumber,
            );

            return {
                content: chapterStructure,
                totalTokenCount,
            };
        } catch (error) {
            this.logger.error('Error generating chapter structure:', error);
            throw new BadRequestException(
                `Failed to generate chapter structure: ${error.message}`,
            );
        }
    }

    async generateChapterSummary(dto: {
        storyId: string;
        aiProvider: string;
        chapterSummary: string;
        storyMetadata: string;
    }): Promise<rawContentResponse> {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const systemPrompt = `CORE PURPOSE
Generate concise English narrative summaries for every 5-chapter batch to preserve plot continuity while minimizing token usage for subsequent AI story generation.`;

        const userPrompt = `INPUT REQUIREMENTS
Chapter Batch: ${dto.chapterSummary}
Story Architecture: ${dto.storyMetadata}
"
SUMMARIZATION GUIDELINES
1. CONTENT EXTRACTION PRIORITIES
Plot-Advancing Events: Major battles, political decisions, strategic moves

Status Changes: Gains/losses of territory, resources, allies, romantic interests

Character Development: Pivotal decisions, moral turning points, relationship shifts

Power Dynamics: Changes in protagonist's influence, authority, or strategic position

2. CONTENT CONDENSATION RULES
Remove: Detailed environmental descriptions, elaborate costume details, minor character interactions without plot impact

Reduce: Extended internal monologues to their core emotional/decision point

Compress: Multi-scene sequences into their narrative function (e.g., ""a series of diplomatic meetings secured three key alliances"")

Abstract: World-building details to their plot relevance only

3. SUMMARY STRUCTURE TEMPLATE
text
Beginning State: [Protagonist's situation at chapter start]

Key Developments:
1. [Most significant event with direct consequence]
2. [Secondary important development]
3. [Relationship/romantic progression if applicable]

Status Change: [How protagonist's position changed overall]

Emerging Threat/Opportunity: [What new situation requires attention]
4. LANGUAGE SPECIFICATIONS
Output Language: English only

Tense: Past tense, third-person objective

Voice: Clinical narrative reporting (not literary)

Style: Factual, emotion-neutral, plot-focused

Prohibited: Meta-references (""as mentioned earlier""), authorial commentary, chapter number citations

5. QUALITY CONTROLS
Length: Strict 150-200 word range

Density: Must contain 3-5 plot-significant data points

Forward Momentum: Each summary should clearly enable the next 5-chapter continuation

Architecture Alignment: Verify events serve story's core objectives from original blueprint"
`;

        try {
            const { content, totalTokenCount } =
                await aiProvider.generateContent({
                    prompt: userPrompt,
                    systemPrompt,
                });

            return {
                content,
                totalTokenCount,
            };
        } catch (error) {
            this.logger.error('Error generating chapter structure:', error);
            throw new BadRequestException(
                `Failed to generate chapter structure: ${error.message}`,
            );
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

    private parseStoryOutline(
        content: string,
        numberOfChapters: number,
    ): StoryContent {
        try {
            const parsed = JSON.parse(content);

            if (!parsed.storyContext?.meta) {
                throw new BadRequestException(
                    'AI response is missing required storyContext.meta field in outline response',
                );
            }

            return {
                title: parsed.uiDisplay?.storyTitle || 'Untitled',
                synopsis: parsed.uiDisplay?.storyCoverBlurb || '',
                coverImage: parsed.coverImage || '',
                storyContext: parsed.storyContext || {},
                numberOfChapters,
                outline: parsed.outline || content,
            };
        } catch (error) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
                error,
            );
        }
    }

    private parseChapterStructure(
        content: string,
        chapterNumber: number,
    ): ChapterStructureContent {
        try {
            const parsed = JSON.parse(content);

            if (
                !parsed ||
                !parsed.display?.chapterTitle ||
                !parsed.display?.content ||
                isEmptyObject(parsed.continuitySnapshot) ||
                !parsed.continuitySnapshot?.nextOptions
            ) {
                throw new BadRequestException(
                    'AI response is missing required fields in chapter structure response',
                );
            }

            return {
                chapterNumber,

                title: parsed.display?.chapterTitle || '',
                content: parsed.display?.content || '',

                structure: parsed.continuitySnapshot || {},
                raw: content,
            };
        } catch (jsonError) {
            this.logger.warn(
                'Failed to parse JSON response, falling back to text parsing',
                jsonError,
            );

            try {
                const extract = (label: string) =>
                    this.extractSection(content, label) || '';

                return {
                    chapterNumber,

                    title: extract('chapterTitle'),
                    content: extract('content'),
                    structure: {
                        continuitySnapshot: extract('continuitySnapshot'),
                    },
                    raw: content,
                };
            } catch (error) {
                this.logger.error('Error parsing chapter structure:', error);

                return {
                    chapterNumber,
                    title: '',
                    content: '',
                    structure: {},
                    raw: content,
                };
            }
        }
    }

    async generateRawContent(dto: GenerateRawContentDto) {
        const providerName = dto.aiProvider || 'grok';
        const aiProvider =
            this.storyGenerationProviderFactory.getProvider(providerName);

        const effectiveSystemPrompt =
            dto.systemPrompt ||
            `
You are a helpful, creative and precise AI assistant.
Respond naturally and directly to the user's request.
Keep your answer focused, high-quality and well-structured.
`.trim();

        try {
            const { content } = await aiProvider.generateContent({
                prompt: dto.prompt,
                systemPrompt: effectiveSystemPrompt,
            });

            return content;
        } catch (error) {
            this.logger.error('Error in generateRawContent:', error);
            throw new BadRequestException(
                `Failed to generate raw content: ${error.message || 'Unknown error'}`,
            );
        }
    }
}
