import { Injectable } from '@nestjs/common';

import { StoryCrudService } from './story-crud.service';
import { StoryPublicationService } from './story-publication.service';
import { StoryInteractionService } from './story-interaction.service';
import { StoryGenerationService } from './story-generation.service';
import { StoryDiscoveryService } from './story-discovery.service';

@Injectable()
export class StoryService {
    constructor(
        private readonly crud: StoryCrudService,
        private readonly publication: StoryPublicationService,
        private readonly interaction: StoryInteractionService,
        private readonly generation: StoryGenerationService,
        private readonly discovery: StoryDiscoveryService,
    ) {}

    // ========================
    // CRUD & Basic Queries
    // ========================
    createStory = this.crud.createStory.bind(this.crud);
    findAllStories = this.crud.findAllStories.bind(this.crud);
    findDeletedStories = this.crud.findDeletedStories.bind(this.crud);
    findPendingStories = this.crud.findPendingStories.bind(this.crud);
    findPublicStories = this.crud.findPublicStories.bind(this.crud);
    findStoriesByAuthor = this.crud.findStoriesByAuthor.bind(this.crud);
    findStoryById = this.crud.findStoryById.bind(this.crud);
    updateStory = this.crud.updateStory.bind(this.crud);
    deleteStory = this.crud.deleteStory.bind(this.crud);
    restoreStory = this.crud.restoreStory.bind(this.crud);
    updateStoryCoverImage = this.crud.updateStoryCoverImage.bind(this.crud);

    // ========================
    // Publication Workflow
    // ========================
    requestPublication = this.publication.requestPublication.bind(
        this.publication,
    );
    approveStory = this.publication.approveStory.bind(this.publication);
    rejectStory = this.publication.rejectStory.bind(this.publication);
    unpublishStory = this.publication.unpublishStory.bind(this.publication);

    // ========================
    // User Interactions
    // ========================
    incrementChapterView = this.interaction.incrementChapterView.bind(
        this.interaction,
    );
    updateRating = this.interaction.updateRating.bind(this.interaction);
    likeStory = this.interaction.likeStory.bind(this.interaction);
    unlikeStory = this.interaction.unlikeStory.bind(this.interaction);

    // ========================
    // AI Generation
    // ========================
    initializeStoryWithOutline =
        this.generation.initializeStoryWithOutline.bind(this.generation);
    generateChapters = this.generation.generateChapters.bind(this.generation);
    getStoryGenerationHistory = this.generation.getStoryGenerationHistory.bind(
        this.generation,
    );
    getGenerationById = this.generation.getGenerationById.bind(this.generation);
    getChapterGenerationHistory =
        this.generation.getChapterGenerationHistory.bind(this.generation);
    previewStory = this.generation.previewStory.bind(this.generation);
    getInitializationResults = this.generation.getInitializationResults.bind(
        this.generation,
    );
    getGeneratedChapterResults =
        this.generation.getGeneratedChapterResults.bind(this.generation);

    // ========================
    // Discovery & Library
    // ========================
    getUserLibrary = this.discovery.getUserLibrary.bind(this.discovery);
    getTopTrending = this.discovery.getTopTrending.bind(this.discovery);
    getTopTrendingByCategory = this.discovery.getTopTrendingByCategory.bind(
        this.discovery,
    );
    getDiscoverStories = this.discovery.getDiscoverStories.bind(this.discovery);
    getAllCategories = this.discovery.getAllCategories.bind(this.discovery);
}
