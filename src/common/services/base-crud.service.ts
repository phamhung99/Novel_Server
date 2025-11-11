import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import {
    Repository,
    DeepPartial,
    FindManyOptions,
    Like,
    FindOptionsWhere,
    FindOptionsOrder,
} from 'typeorm';

@Injectable()
export abstract class BaseCrudService<T> {
    constructor(protected repository: Repository<T>) {}

    protected abstract getEntityName(): string;
    protected abstract getUniqueField(): keyof T;

    async create(createDto: DeepPartial<T>): Promise<T> {
        const uniqueField = this.getUniqueField();
        const uniqueValue = (createDto as any)[uniqueField];

        if (uniqueValue) {
            const existing = await this.repository.findOne({
                where: { [uniqueField]: uniqueValue } as any,
            });

            if (existing) {
                throw new ConflictException(
                    `${this.getEntityName()} with this ${String(uniqueField)} already exists`,
                );
            }
        }

        const entity = this.repository.create(createDto);
        return await this.repository.save(entity);
    }

    async findById(id: string, throwIfNotFound = true): Promise<T> {
        const entity = await this.repository.findOne({ where: { id } as any });

        if (!entity && throwIfNotFound) {
            throw new NotFoundException(`${this.getEntityName()} not found`);
        }

        return entity;
    }

    async findByUniqueField(value: any): Promise<T | null> {
        const uniqueField = this.getUniqueField();

        return await this.repository.findOne({
            where: { [uniqueField]: value } as any,
        });
    }

    async update(id: string, updateDto: DeepPartial<T>): Promise<T> {
        const entity = await this.repository.findOne({ where: { id } as any });

        if (!entity) {
            throw new NotFoundException(`${this.getEntityName()} not found`);
        }

        await this.repository.update(id, updateDto as any);
        return await this.repository.findOne({ where: { id } as any });
    }

    async delete(id: string): Promise<void> {
        const entity = await this.repository.findOne({ where: { id } as any });

        if (!entity) {
            throw new NotFoundException(`${this.getEntityName()} not found`);
        }

        await this.repository.delete(id);
    }

    async findAll(options?: {
        filter?: Record<string, any>;
        sort?: string;
        fields?: (keyof T)[];
        page?: number;
        limit?: number;
        search?: { field: keyof T; value: string };
    }): Promise<T[]> {
        const findOptions: FindManyOptions<T> = {};

        if (options?.filter) {
            findOptions.where = options.filter;
        }

        if (options?.search) {
            findOptions.where = {
                ...(findOptions.where as object),
                [options.search.field]: Like(`${options.search.value}%`),
            } as FindOptionsWhere<T>;
        }

        if (options?.sort) {
            const [field, order] = options.sort.split(':');
            findOptions.order = {
                [field]: order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
            } as FindOptionsOrder<T>;
        }

        if (options?.limit) {
            const page = options.page ?? 1;
            findOptions.skip = (page - 1) * options.limit;
            findOptions.take = options.limit;
        }

        if (options?.fields && options.fields.length > 0) {
            findOptions.select = options.fields;
        }

        return await this.repository.find(findOptions);
    }

    async findAndCount(options?: {
        filter?: Record<string, any>;
        sort?: string;
        fields?: (keyof T)[];
        page?: number;
        limit?: number;
        search?: { field: keyof T; value: string };
    }): Promise<{ data: T[]; total: number }> {
        const findOptions: FindManyOptions<T> = {};

        if (options?.filter) {
            findOptions.where = options.filter;
        }

        if (options?.search) {
            findOptions.where = {
                ...(findOptions.where as object),
                [options.search.field]: Like(`${options.search.value}%`),
            } as FindOptionsWhere<T>;
        }

        if (options?.sort) {
            const [field, order] = options.sort.split(':');
            findOptions.order = {
                [field]: order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
            } as FindOptionsOrder<T>;
        }

        if (options?.limit) {
            const page = options.page ?? 1;
            findOptions.skip = (page - 1) * options.limit;
            findOptions.take = options.limit;
        }

        if (options?.fields?.length) {
            findOptions.select = options.fields;
        }

        const [data, total] = await this.repository.findAndCount(findOptions);
        return { data, total };
    }
}
