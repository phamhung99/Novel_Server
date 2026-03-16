import {
    BadRequestException,
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AppFeedback } from './entities/app-feedback.entity';
import {
    ReportEntityType,
    Report,
    ReportReason,
} from './entities/report.entity';

import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { CreateAppFeedbackDto } from './dto/create-app-feedback.dto';
import { CreateReportDto } from 'src/story/dto/create-report.dto';
import { StoryCrudService } from 'src/story/story-crud.service';

@Injectable()
export class UserReportService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
        @InjectRepository(AppFeedback)
        private readonly appFeedbackRepo: Repository<AppFeedback>,
        @InjectRepository(Report)
        private readonly reportRepo: Repository<Report>,
        @Inject(forwardRef(() => StoryCrudService))
        private readonly storyCrudService: StoryCrudService,
    ) {}

    async createAppFeedback(
        userId: string,
        platform: string,
        createDto: CreateAppFeedbackDto,
    ): Promise<AppFeedback> {
        const user = await this.userRepo.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        let feedback = await this.appFeedbackRepo.findOne({
            where: { userId },
        });

        if (feedback) {
            feedback.platform = platform;
            feedback.rating = createDto.rating;
            feedback.comment = createDto.comment;
            return await this.appFeedbackRepo.save(feedback);
        }

        feedback = this.appFeedbackRepo.create({
            userId,
            platform,
            rating: createDto.rating,
            comment: createDto.comment,
        });

        return await this.appFeedbackRepo.save(feedback);
    }

    async createStoryReport(
        userId: string,
        storyId: string,
        createDto: CreateReportDto,
    ) {
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        await this.storyCrudService.findStoryById(storyId);

        if (createDto.reason === ReportReason.OTHER && !createDto.description) {
            throw new BadRequestException(
                'Description is required when reason is OTHER',
            );
        }

        const report = this.reportRepo.create({
            reporterId: userId,
            entityType: ReportEntityType.STORY,
            entityId: storyId,
            reason: createDto.reason,
            description: createDto.description,
        });

        return await this.reportRepo.save(report);
    }
}
