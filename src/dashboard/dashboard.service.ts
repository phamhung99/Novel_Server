import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { get24HoursAgo } from 'src/common/utils/date.utils';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async countNewUsersIn24h(): Promise<number> {
        const since = get24HoursAgo();
        return this.userRepository.count({
            where: { createdAt: MoreThanOrEqual(since) },
        });
    }
}
