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
        uiDisplay: {
            type: 'object',
            properties: {
                storyTitle: {
                    type: 'string',
                    description:
                        '[Catchy title in target language. Evokes genre and emotion]',
                },
                storyCoverBlurb: {
                    type: 'string',
                    description:
                        '[Compelling teaser in target language. <200 words. Focus on hook, stakes, and why-we-care. Must read as a natural book blurb for a reader, with zero references to chapter counts, narrative paradigms, or architectural terms.]',
                },
            },
            required: ['storyTitle', 'storyCoverBlurb'],
        },

        coverImage: {
            type: 'string',
            description:
                "Create a highly detailed, emotionally compelling AI art prompt for a SQUARE (1:1 aspect ratio) book cover optimized for app listing displays. The prompt MUST: 1) Seamlessly integrate the story's title (which will be chosen later) into the design. The title typography must be visually impressive, using specific colors, textures, and a font structure that perfectly reflects the story's genre and emotional tone (e.g., glowing, ancient runic fonts for Xianxia/Fantasy; sleek, distressed metallic fonts for Cyberpunk). 2) Ensure the entire composition—the character imagery, background elements, color palette, lighting, and title placement—is cohesive and instantly recognizable as belonging to the story's primary genre. 3) Create IMMEDIATE EMOTIONAL IMPACT through the characters' facial expressions and body language. 4) Include SPECIFIC VISUAL METAPHORS for the core themes: time travel (shattering hourglass, fractured time elements, swirling temporal energies), redemption (a powerful light source breaking through oppressive shadows), and tragic love (intertwined but separating or broken elements). 5) Feature a DYNAMIC COMPOSITION that balances the visual storytelling with high readability for the title. The title should feel like an integral part of the artwork, not just a flat overlay, perhaps interacting with the visual elements (e.g., light hitting the text, smoke curling around the letters). 6) Use GENRE-APPROPRIATE ART STYLES with professional art references to guide the final look.",
        },

        storyContext: {
            type: 'object',
            properties: {
                meta: {
                    type: 'object',
                    properties: {
                        primaryGenre: {
                            type: 'string',
                            description:
                                '[e.g., Quantum Fantasy, Neo-Noir Thriller, Solarpunk Romance]',
                        },
                        secondaryGenres: {
                            type: 'array',
                            items: {
                                type: 'string',
                                description: '[Supporting genres]',
                            },
                        },
                        narrativeParadigm: {
                            type: 'string',
                            description:
                                "[Hero's Journey / Kishotenketsu / Three-Act / Episodic]",
                        },
                        totalChapters: {
                            type: 'integer',
                            description:
                                'the story MUST end in ${dto.numberOfChapters}.',
                        },
                        outputLanguage: {
                            type: 'string',
                            description: '[Target language]',
                        },
                        universalStyleEngine: {
                            type: 'object',
                            properties: {
                                toneDescription: {
                                    type: 'string',
                                    description:
                                        '[e.g., Gritty yet hopeful, Lyrical with sharp edges]',
                                },
                                voicePrinciple: {
                                    type: 'string',
                                    description:
                                        '[e.g., Close-third with cinematic cuts, should avoid first person voice. THE NARRATIVE PROSE MUST FLOW SEAMLESSLY. AVOID ALL EXPLICIT, AWKWARD META-REFERENCES TO THE STORY\'S OWN STRUCTURE (e.g., "as mentioned earlier," "as will be seen in the future," "this event, which would later be known as..."). Events, backstory, and character knowledge must be revealed organically through present action, dialogue, thought, and sensory description.]',
                                },
                                sensoryPriority: {
                                    type: 'string',
                                    description:
                                        '[Visual/Tactile/Auditory balance]',
                                },
                                dialogueStyle: {
                                    type: 'string',
                                    description:
                                        '[Naturalistic / Stylized / Minimalist]',
                                },
                            },
                        },
                        characterUniverse: {
                            type: 'object',
                            properties: {
                                protagonist: {
                                    type: 'object',
                                    properties: {
                                        name: {
                                            type: 'string',
                                            description: '[Name]',
                                        },
                                        coreContradiction: {
                                            type: 'string',
                                            description:
                                                '[e.g., Brutally pragmatic but secretly sentimental]',
                                        },
                                        universalArc: {
                                            type: 'string',
                                            description:
                                                '[Transformation path]',
                                        },
                                        moralCompass: {
                                            type: 'string',
                                            description: '[Guiding principle]',
                                        },
                                    },
                                },
                                relationshipMatrix: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            character: {
                                                type: 'string',
                                                description: '[Name]',
                                            },
                                            role: {
                                                type: 'string',
                                                description:
                                                    '[Mentor/Rival/Love Interest]',
                                            },
                                            dynamic: {
                                                type: 'string',
                                                description:
                                                    '[Nature of relationship]',
                                            },
                                            conflictSource: {
                                                type: 'string',
                                                description:
                                                    '[What they disagree about fundamentally]',
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        worldFramework: {
                            type: 'object',
                            properties: {
                                corePremise: {
                                    type: 'string',
                                    description:
                                        '[One-sentence universal concept]',
                                },
                                societalEngine: {
                                    type: 'string',
                                    description:
                                        "[What makes this world's society tick?]",
                                },
                                conflictSources: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                        description:
                                            '[Primary, Secondary, Tertiary]',
                                    },
                                },
                                thematicCores: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                        description:
                                            '[Identity, Justice, Connection, Freedom]',
                                    },
                                },
                            },
                        },
                        adaptiveStructure: {
                            type: 'object',
                            properties: {
                                phaseBreakdown: {
                                    type: 'object',
                                    properties: {
                                        establishment: {
                                            type: 'string',
                                            description: 'Chapters 1-?',
                                        },
                                        complication: {
                                            type: 'string',
                                            description: 'Chapters ?-?',
                                        },
                                        culmination: {
                                            type: 'string',
                                            description: 'Chapters ?-end',
                                        },
                                    },
                                },
                                pacingPhilosophy: {
                                    type: 'string',
                                    description: '[Genre-appropriate rhythm]',
                                },
                                chapterArchetypes: {
                                    type: 'array',
                                    items: {
                                        type: 'string',
                                        description:
                                            '[Plot-driven, Character-deep, World-expand, Theme-weave]',
                                    },
                                },
                            },
                        },
                        chapter1Blueprint: {
                            type: 'object',
                            properties: {
                                openingStrategy: {
                                    type: 'string',
                                    description:
                                        '[ACTION/MYSTERY/CHARACTER/WORLD based on genre]',
                                },
                                emotionalHook: {
                                    type: 'string',
                                    description:
                                        '[What feeling to evoke first?]',
                                },
                                incitingIncident: {
                                    type: 'string',
                                    description:
                                        '[The event that changes everything]',
                                },
                                firstCliffhanger: {
                                    type: 'string',
                                    description:
                                        '[The question that demands Chapter 2]',
                                },
                            },
                        },
                    },
                },
            },
        },
    },
    required: ['uiDisplay', 'coverImage', 'storyContext'],
};

export const CHAPTER_STRUCTURE_SCHEMA = {
    type: 'object',
    properties: {
        display: {
            type: 'object',
            properties: {
                chapterTitle: {
                    type: 'string',
                    description:
                        "[Evocative title in {{meta.outputLanguage}}. Hint at chapter's emotional core]",
                },
                content: {
                    type: 'string',
                    description:
                        '[Full chapter text in {{meta.outputLanguage}}. Use \\n\\n for paragraph breaks. NO meta-commentary]',
                },
            },
            required: ['chapterTitle', 'content'],
        },

        continuitySnapshot: {
            type: 'object',
            properties: {
                chapterNumber: {
                    type: 'number',
                    description: 'Chapter index number',
                },
                chapterSummary: {
                    type: 'string',
                    description:
                        '[3-4 sentence ENGLISH summary focusing on plot advancement and character changes]',
                },

                characterStatus: {
                    type: 'object',
                    properties: {
                        protagonist: {
                            type: 'string',
                            description:
                                "[ENGLISH: Protagonist's current emotional/physical state]",
                        },
                        keyRelationships: {
                            type: 'string',
                            description:
                                '[ENGLISH: Current state of important relationships]',
                        },
                        inventoryChanges: {
                            type: 'string',
                            description:
                                '[ENGLISH: Important items gained/lost, if any]',
                        },
                    },
                },

                plotAdvancements: {
                    type: 'array',
                    items: {
                        type: 'string',
                        description:
                            '[ENGLISH: Plot or mystery advancement introduced this chapter]',
                    },
                },

                nextOptions: {
                    type: 'array',
                    description: '[Choices presented in outputLanguage]',
                    items: {
                        type: 'object',
                        properties: {
                            label: {
                                type: 'string',
                                description:
                                    '[Choice label in outputLanguage. Clear action-oriented phrasing]',
                            },
                            immediateRisk: {
                                type: 'string',
                                description:
                                    '[What could go wrong immediately?]',
                            },
                            immediateSafety: {
                                type: 'string',
                                description: '[What does this avoid?]',
                            },
                            longTermPotential: {
                                type: 'string',
                                description: '[Where could this lead?]',
                            },
                            longTermCost: {
                                type: 'string',
                                description:
                                    '[What opportunity might be lost?]',
                            },
                        },
                    },
                },

                continuityCheckpoints: {
                    type: 'object',
                    properties: {
                        toneConsistency: {
                            type: 'string',
                            description:
                                '[ENGLISH: Confirmation that tone matches Story Bible]',
                        },
                        characterConsistency: {
                            type: 'string',
                            description:
                                '[ENGLISH: Confirmation characters act according to their archetypes]',
                        },
                        worldRulesMaintained: {
                            type: 'string',
                            description:
                                '[ENGLISH: Confirmation world rules were followed]',
                        },
                        foreshadowingPlanted: {
                            type: 'string',
                            description:
                                '[ENGLISH: Any foreshadowing elements planted for future]',
                        },
                    },
                },
            },
            required: ['chapterNumber', 'chapterSummary'],
        },
    },

    required: ['display', 'continuitySnapshot'],
};
