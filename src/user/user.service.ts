import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';
import { UserGenres } from './entities/user-genres.entity';
import { ERROR_MESSAGES } from 'src/common/constants/app.constant';
import { StoryCategory } from 'src/common/enums/app.enum';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(
        @InjectRepository(User) userRepo: Repository<User>,
        @InjectRepository(UserGenres)
        private readonly userGenresRepo: Repository<UserGenres>,
        private readonly dataSource: DataSource,
    ) {
        super(userRepo);
    }

    protected getEntityName(): string {
        return 'User';
    }

    protected getUniqueField(): keyof User {
        return;
    }

    async findByEmail(email: string): Promise<User> {
        return this.repository.findOne({ where: { email } });
    }

    async createOrUpdateUser({
        userId,
        language,
    }: {
        userId: string;
        language: string;
    }): Promise<User> {
        let user = await this.findById(userId, false);
        if (!user) {
            user = this.repository.create({
                id: userId,
                country: language,
            });
        }
        await this.repository.save(user);
        return user;
    }

    async getSelectedGenres(userId: string): Promise<StoryCategory[]> {
        const user = await this.repository.findOne({ where: { id: userId } });
        if (!user) {
            throw new NotFoundException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const userGenres = await this.userGenresRepo.find({
            where: { userId },
            select: ['genre'],
        });

        return userGenres.map((ug) => ug.genre as StoryCategory);
    }

    async updateSelectedGenres(
        userId: string,
        genres: StoryCategory[],
    ): Promise<StoryCategory[]> {
        if (!Array.isArray(genres)) {
            throw new BadRequestException('genres must be an array');
        }

        // Transaction: xóa cũ + insert mới
        await this.dataSource.transaction(async (manager) => {
            await manager.delete(UserGenres, { userId });

            if (genres.length) {
                const userGenres = genres.map((genre) =>
                    manager.create(UserGenres, { userId, genre }),
                );
                await manager.save(userGenres);
            }
        });

        return genres;
    }
}
