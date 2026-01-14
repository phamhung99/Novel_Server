// hooks/useStoryActions.ts
import { axiosPrivate } from '../api/axios';
import { AxiosError } from 'axios';

export const useStoryActions = (userId: string, refetch: () => void) => {
    const handleError = (error: unknown): string => {
        if (error instanceof AxiosError) {
            return (
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                'Connection error or unknown error'
            );
        }
        return 'Connection error or unknown error';
    };

    const deleteStory = async (id: string) => {
        try {
            await axiosPrivate.delete(`/api/v1/story/${id}`);
            refetch();
        } catch (err) {
            throw handleError(err); // ném lỗi ra ngoài để component xử lý
        }
    };

    const bulkDeleteStories = async (ids: string[]) => {
        try {
            await Promise.all(
                ids.map((id) => axiosPrivate.delete(`/api/v1/story/${id}`)),
            );
            refetch();
        } catch (err) {
            throw handleError(err);
        }
    };

    const restoreStory = async (id: string) => {
        try {
            await axiosPrivate.patch(`/api/v1/story/${id}/restore`);
            refetch();
        } catch (err) {
            throw handleError(err);
        }
    };

    const approveStory = async (id: string, note?: string) => {
        try {
            console.log(id);
            
            await axiosPrivate.post(
                `/api/v1/story/${id}/approve`,
                { note: note || null },
                { headers: { 'x-user-id': userId } },
            );
            refetch();
        } catch (err) {
            throw handleError(err);
        }
    };

    const rejectStory = async (id: string, reason: string) => {
        try {
            await axiosPrivate.post(
                `/api/v1/story/${id}/reject`,
                { reason },
                { headers: { 'x-user-id': userId } },
            );
            refetch();
        } catch (err) {
            throw handleError(err);
        }
    };

    const unpublishStory = async (id: string) => {
        try {
            await axiosPrivate.post(`/api/v1/story/${id}/unpublish`);
            refetch();
        } catch (err) {
            throw handleError(err);
        }
    };

    return {
        deleteStory,
        restoreStory,
        approveStory,
        rejectStory,
        unpublishStory,
        bulkDeleteStories,
    };
};
