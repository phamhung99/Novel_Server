import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api/userApi';

export const useUsers = (
    page: number,
    pageSize: number,
    field?: string,
    sort?: 'asc' | 'desc',
) => {
    const usersQuery = useQuery({
        queryKey: ['users', page, pageSize, field, sort],
        queryFn: () => fetchUsers({ page: page + 1, pageSize, field, sort }),
    });

    return {
        usersQuery,
    };
};
