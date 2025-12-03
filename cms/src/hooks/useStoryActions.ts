import axios from '../api/axios';

export const useStoryActions = (userId: string, refetch: () => void) => {
    const deleteStory = async (id: string) => {
        await axios.delete(`/api/v1/story/${id}`);
        refetch();
    };

    const restoreStory = async (id: string) => {
        await axios.patch(`/api/v1/story/${id}/restore`);
        refetch();
    };

    const approveStory = async (id: string, note?: string) => {
        await axios.post(
            `/api/v1/story/${id}/approve`,
            { note: note || null },
            { headers: { 'x-user-id': userId } },
        );
        refetch();
    };

    const rejectStory = async (id: string, reason: string) => {
        await axios.post(
            `/api/v1/story/${id}/reject`,
            { reason },
            { headers: { 'x-user-id': userId } },
        );
        refetch();
    };

    const unpublishStory = async (id: string) => {
        await axios.post(`/api/v1/story/${id}/unpublish`);
        refetch();
    };

    return {
        deleteStory,
        restoreStory,
        approveStory,
        rejectStory,
        unpublishStory,
    };
};
