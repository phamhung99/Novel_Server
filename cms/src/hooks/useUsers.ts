import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    type User,
} from '../api/userApi';

export const useUsers = () => {
    const queryClient = useQueryClient();

    const usersQuery = useQuery({
        queryKey: ['users'],
        queryFn: fetchUsers,
    });

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
            updateUser(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteUser,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
    });

    return {
        usersQuery,
        createMutation,
        updateMutation,
        deleteMutation,
    };
};
