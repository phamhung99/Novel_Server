import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BaseCrudService } from 'src/common/services/base-crud.service';

@Injectable()
export class UserService extends BaseCrudService<User> {
    constructor(@InjectRepository(User) userRepo: Repository<User>) {
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
}
