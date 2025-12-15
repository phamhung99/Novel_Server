import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToMany,
} from 'typeorm';
import { Story } from './story.entity';
import { UserCategoryPreference } from 'src/user/entities/user-category-preference.entity';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', nullable: false })
    name: string;

    @ManyToOne(() => Category, (category) => category.children, {
        nullable: true,
    })
    parent: Category;

    @OneToMany(() => Category, (category) => category.parent)
    children: Category[];

    @Column({ type: 'int', default: 0, name: 'display_order' })
    displayOrder: number;

    @Column({ type: 'boolean', default: true, name: 'is_active' })
    isActive: boolean;

    @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
    updatedAt: Date;

    @ManyToMany(() => Story, (story) => story.categories)
    stories: Story[];

    @OneToMany(
        () => UserCategoryPreference,
        (userCategoryPreference) => userCategoryPreference.category,
    )
    userCategoryPreferences: UserCategoryPreference[];
}
