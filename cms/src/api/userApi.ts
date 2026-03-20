import axios from './axios';

export interface User {
    id: string;
    firstName: string;
    lastName: string;
    country: string;
    ipCountryCode: string;
    username: string;
    email: string;
    profileImage: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const fetchUsers = async ({
    page,
    pageSize,
    field,
    sort,
}: {
    page: number;
    pageSize: number;
    field?: string;
    sort?: 'asc' | 'desc';
}): Promise<{
    users: User[];
    total: number;
}> => {
    const res = await axios.get('/api/v1/users', {
        params: {
            page,
            limit: pageSize,
            sort: field && sort ? `${field}:${sort}` : undefined,
        },
    });
    return res.data.data;
};
