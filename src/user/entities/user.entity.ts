import {
    Entity,
    Column,
    PrimaryColumn,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
    @PrimaryColumn()
    id: string;

    @Column({ name: 'first_name', nullable: true, default: '' })
    firstName: string;

    @Column({ name: 'last_name', nullable: true, default: '' })
    lastName: string;

    @Column({ nullable: true })
    ptokens: string;

    @Column({ nullable: true })
    country: string;

    @Column({ name: 'ip_country_code', nullable: true })
    ipCountryCode: string;

    @Column({ name: 'package_name', nullable: true })
    packageName: string;

    @Column({ nullable: true, type: 'int' })
    version: number;

    @Column({ name: 'remaining_sub_gen', nullable: true, type: 'int' })
    remainingSubGen: number;

    @Column({ name: 'remaining_onetime_gen', nullable: true, type: 'int' })
    remainingOnetimeGen: number;

    @Column({ name: 'sub_gen_reset_at', nullable: true, type: 'timestamp' })
    subGenResetAt: Date;

    @Column({ name: 'total_accesses', nullable: true, type: 'int' })
    totalAccesses: number;

    @Column({ nullable: true })
    username: string;

    @Column({ name: 'profile_image', nullable: true })
    profileImage: string;

    @Column({ name: 'device_token', nullable: true })
    deviceToken: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    isNewIapPlan(): boolean {
        return (
            this.remainingSubGen === null || this.remainingSubGen === undefined
        );
    }

    getRemainingSubGen(): number {
        if (this.remainingSubGen == null) {
            return 0;
        }
        return this.remainingSubGen;
    }

    getRemainingOnetimeGen(): number {
        if (this.remainingOnetimeGen == null) {
            return 0;
        }
        return this.remainingOnetimeGen;
    }
}
