import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    Typography,
} from '@mui/material';
import {
    POLL_INITIALIZATION_DELAY,
    POLL_INTERVAL,
    ROUTES,
} from '../constants/app.constants';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const BASE_URL = `/api/v1/story`;

const StoryUploadPage: React.FC = () => {
    const userId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || '';
        } catch {
            return '';
        }
    }, []);

    const [mode, setMode] = useState<'create' | 'load'>('create');

    // create params
    const [storyPrompt, setStoryPrompt] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [numChapters, setNumChapters] = useState(1);
    const [aiProvider, setAiProvider] = useState<'grok' | 'gpt'>('grok');

    // load params
    const [isLoading, setIsLoading] = useState(false);

    // genres from API
    const [genresList, setGenresList] = useState<string[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(true);
    const [genresError, setGenresError] = useState<string | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                setLoadingGenres(true);
                const response = await axios.get(`${BASE_URL}/categories`);
                const genres = response.data.data
                    .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                    .map((item: any) => item.name);

                setGenresList(genres);
            } catch (err: any) {
                console.error('Failed to fetch genres:', err);
                setGenresError(
                    err.response?.data?.message ||
                        'Failed to load genres. Using fallback list.',
                );
                // Optional: fallback to hard-coded list if API fails
                // setGenresList(['Fantasy', 'Science Fiction', ...]);
            } finally {
                setLoadingGenres(false);
            }
        };

        fetchGenres();
    }, []);

    const pollInitializationResult = async (
        requestId: string,
        skipImage: boolean = false,
    ): Promise<any> => {
        await new Promise((r) => setTimeout(r, POLL_INITIALIZATION_DELAY));

        const maxAttempts = 15;
        let attempt = 0;

        while (attempt < maxAttempts) {
            try {
                const res = await axios.get(
                    `${BASE_URL}/generate/initialize/result`,
                    {
                        headers: {
                            'x-request-id': requestId,
                            'x-skip-image': skipImage,
                        },
                    },
                );

                if (res.data.data) {
                    return res.data.data;
                }
            } catch (error: any) {
                if (error.response && error.response.status !== 202) {
                    throw error;
                }
            }

            attempt++;
            await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        }

        throw new Error('Timeout waiting for initialization result');
    };

    const initializeStory = async () => {
        try {
            if (!storyPrompt.trim()) {
                alert('Please enter a story prompt');
                return;
            }

            if (selectedGenres.length === 0) {
                alert('Please select at least one genre');
                return;
            }

            setIsLoading(true);

            const requestId = uuidv4();

            axios.post(
                `${BASE_URL}/generate/initialize`,
                {
                    storyPrompt,
                    genres: selectedGenres,
                    numberOfChapters: numChapters,
                    aiProvider,
                },
                {
                    headers: {
                        'x-user-id': userId,
                        'x-request-id': requestId,
                        'x-skip-image': true,
                    },
                },
            );

            const storyData = await pollInitializationResult(requestId, true);

            console.log('Initialized story data:', storyData);

            navigate(ROUTES.STORY_PREVIEW, { state: { storyData } });
        } catch (err: any) {
            console.error(err);
            alert(
                err.response?.data?.message ||
                    err.message ||
                    'Error initializing story',
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom>
                Story Creator
            </Typography>

            <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
                <TextField
                    select
                    label="Mode"
                    value={mode}
                    onChange={(e) =>
                        setMode(e.target.value as 'create' | 'load')
                    }
                    fullWidth
                    margin="normal"
                >
                    <MenuItem value="create">Create new</MenuItem>
                </TextField>

                {mode === 'create' && (
                    <>
                        <TextField
                            label="Story Prompt"
                            value={storyPrompt}
                            onChange={(e) => setStoryPrompt(e.target.value)}
                            fullWidth
                            multiline
                            rows={3}
                            margin="normal"
                        />

                        <FormControl fullWidth margin="normal">
                            <InputLabel id="genres-label">Genres</InputLabel>
                            <Select
                                labelId="genres-label"
                                multiple
                                value={selectedGenres}
                                label="Genres"
                                onChange={(e) =>
                                    setSelectedGenres(
                                        typeof e.target.value === 'string'
                                            ? e.target.value.split(',')
                                            : e.target.value,
                                    )
                                }
                                renderValue={(selected) => selected.join(', ')}
                                disabled={loadingGenres}
                            >
                                {loadingGenres ? (
                                    <MenuItem disabled>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                            }}
                                        >
                                            <CircularProgress size={20} />
                                            Loading genres...
                                        </Box>
                                    </MenuItem>
                                ) : genresList.length === 0 ? (
                                    <MenuItem disabled>
                                        No genres available
                                    </MenuItem>
                                ) : (
                                    genresList.map((genre) => (
                                        <MenuItem key={genre} value={genre}>
                                            {genre.charAt(0).toUpperCase() +
                                                genre.slice(1)}
                                        </MenuItem>
                                    ))
                                )}
                            </Select>
                            {genresError && (
                                <Typography
                                    variant="caption"
                                    color="error"
                                    sx={{ mt: 1, display: 'block' }}
                                >
                                    {genresError}
                                </Typography>
                            )}
                        </FormControl>

                        <TextField
                            type="number"
                            label="Number of Chapters"
                            value={numChapters}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 1 && value <= 10000) {
                                    setNumChapters(value);
                                }
                            }}
                            slotProps={{
                                htmlInput: {
                                    min: 1,
                                    max: 10000,
                                },
                            }}
                            fullWidth
                            margin="normal"
                            helperText="Must be between 1 and 10000"
                        />

                        <TextField
                            select
                            label="AI Provider"
                            value={aiProvider}
                            onChange={(e) =>
                                setAiProvider(e.target.value as 'grok' | 'gpt')
                            }
                            fullWidth
                            margin="normal"
                        >
                            <MenuItem value="grok">Grok</MenuItem>
                            <MenuItem value="gpt">GPT</MenuItem>
                        </TextField>

                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                            size="large"
                            onClick={initializeStory}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <CircularProgress size={24} />
                            ) : (
                                'Initialize Story'
                            )}
                        </Button>
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default StoryUploadPage;
