import { useState, useEffect } from 'react';
import axios from '../api/axios';
import type { StoryDto } from '../types/app';

export const useStories = (
    statusFilter: string | undefined,
    page: number,
    rowsPerPage: number,
    keyword: string = '',
    sourceFilter: string | undefined,
) => {
    const [stories, setStories] = useState<StoryDto[]>([]);
    const [totalStories, setTotalStories] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchStories = async () => {
        setLoading(true);
        try {
            let url = '/api/v1/story';
            let params: Record<string, any> = {
                page,
                limit: rowsPerPage,
            };

            if (keyword.trim()) {
                params.keyword = keyword.trim().toLowerCase();
            }

            console.log(sourceFilter);

            if (sourceFilter) {
                params.source = sourceFilter;
            }

            if (statusFilter === 'pending') {
                url = '/api/v1/story/pending';
            } else if (statusFilter === 'deleted') {
                url = '/api/v1/story/deleted/all';
            } else if (statusFilter === 'public') {
                url = '/api/v1/story/public';
            }

            const res = await axios.get(url, { params });

            const items = res?.data?.data?.items ?? [];
            const total = res?.data?.data?.total ?? 0;

            console.log('items', items);

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
    }, [statusFilter, page, rowsPerPage, keyword, sourceFilter]);

    return { stories, totalStories, loading, setStories, fetchStories };
};
