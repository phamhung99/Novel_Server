import { useState, useEffect } from 'react';
import axios from '../api/axios';
import type { StoryDto } from '../types/app';

export const useStories = (
    statusFilter: string,
    page: number,
    rowsPerPage: number,
) => {
    const [stories, setStories] = useState<StoryDto[]>([]);
    const [totalStories, setTotalStories] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchStories = async () => {
        setLoading(true);
        try {
            let url = '/api/v1/story';
            if (statusFilter === 'pending') url = '/api/v1/story/pending';
            else if (statusFilter === 'deleted')
                url = '/api/v1/story/deleted/all';
            else if (statusFilter === 'public') url = '/api/v1/story/public';

            const res = await axios.get(url, {
                params: { page: page + 1, limit: rowsPerPage },
            });

            setStories(res.data.data);
            setTotalStories(res.data.total || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchStories();
    }, [statusFilter, page, rowsPerPage]);

    return { stories, totalStories, loading, setStories, fetchStories };
};
