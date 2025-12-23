import { useState, useEffect } from 'react';
import axios from '../api/axios';
import type { StoryDto } from '../types/app';

export const useStories = (
    statusFilter: string | undefined,
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

            if (statusFilter === 'pending') {
                url = '/api/v1/story/pending';
            } else if (statusFilter === 'deleted') {
                url = '/api/v1/story/deleted/all';
            } else if (statusFilter === 'public') {
                url = '/api/v1/story/public';
            }

            const res = await axios.get(url, {
                params: {
                    page: page,
                    limit: rowsPerPage,
                },
            });

            console.log(res);

            const items = res?.data?.data?.items ?? [];
            const total = res?.data?.data?.total ?? 0;

            setStories(Array.isArray(items) ? items : []);
            setTotalStories(Number(total) || 0);
        } catch (err) {
            console.error('Error fetching stories:', err);
            setStories([]);
            setTotalStories(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStories();
    }, [statusFilter, page, rowsPerPage]);

    return { stories, totalStories, loading, setStories, fetchStories };
};
