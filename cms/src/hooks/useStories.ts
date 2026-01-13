import { useState, useEffect } from 'react';
import { axiosPrivate } from '../api/axios';
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
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const userId = user?.id || '';

            let url = '/api/v1/story';
            let params: Record<string, any> = {
                page,
                limit: rowsPerPage,
            };

            if (keyword.trim()) {
                params.keyword = keyword.trim().toLowerCase();
            }

            if (sourceFilter) {
                params.source = sourceFilter;
            }

            if (statusFilter === 'pending') {
                url = '/api/v1/story/pending';
            } else if (statusFilter === 'deleted') {
                url = '/api/v1/story/deleted/all';
            } else if (statusFilter === 'public') {
                url = '/api/v1/story/public';
            } else if (statusFilter === 'me') {
                url = '/api/v1/story/library?type=created';
            }

            const res = await axiosPrivate.get(url, {
                params,
                headers: {
                    'x-user-id': userId,
                },
            });

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
    }, [statusFilter, page, rowsPerPage, keyword, sourceFilter]);

    return { stories, totalStories, loading, setStories, fetchStories };
};
