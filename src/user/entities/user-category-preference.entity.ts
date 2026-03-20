import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Category } from 'src/story/entities/categories.entity';

@Entity('user_category_preferences')
export class UserCategoryPreference {
    @PrimaryColumn({ name: 'user_id', type: 'uuid' })
    userId: string;

    @PrimaryColumn({ name: 'category_id', type: 'uuid' })
    categoryId: string;

    @ManyToOne(() => User, (user) => user.userCategoryPreferences)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Category, (category) => category.userCategoryPreferences)
    @JoinColumn({ name: 'category_id' })
    category: Category;
}
