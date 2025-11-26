import React, { useState } from 'react';
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
import { ROUTES } from '../constants/app.constants';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

const genresList = [
    'Fantasy',
    'Science Fiction',
    'Romance',
    'Action',
    'Adventure',
    'Mystery',
    'Thriller',
    'Horror',
    'Comedy',
    'Drama',
    'Slice of Life',
    'Isekai',
    'Historical',
    'Supernatural',
    'Psychological',
    'Martial Arts',
    'Cyberpunk',
    'Post-Apocalyptic',
    'Steampunk',
    'Crime',
];

const userId = 'thieptrinh01156789';
const BASE_URL = `/api/v1/story`;

const StoryUploadPage: React.FC = () => {
    const [mode, setMode] = useState<'create' | 'load'>('create');

    // create params
    const [storyPrompt, setStoryPrompt] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [numChapters, setNumChapters] = useState(1);
    const [aiProvider, setAiProvider] = useState<'grok' | 'gpt'>('grok');

    // load params
    const [storyIdToLoad, setStoryIdToLoad] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const initializeStory = async () => {
        try {
            setIsLoading(true); // bật loading

            const res = await axios.post(
                `${BASE_URL}/generate/initialize`,
                {
                    storyPrompt,
                    genres: selectedGenres,
                    numberOfChapters: numChapters,
                    aiProvider,
                },
                { headers: { 'x-user-id': userId } },
            );

            navigate(ROUTES.STORY_DETAILS, {
                state: { storyData: res.data.data },
            });
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Error initializing story');
        } finally {
            setIsLoading(false);
        }
    };

    const loadExistingStory = async () => {
        try {
            if (!storyIdToLoad) {
                alert('Please enter a Story ID');
                return;
            }

            navigate(ROUTES.CHAPTER_GENERATOR, {
                state: { storyId: storyIdToLoad },
            });
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.message || 'Story not found');
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
                    <MenuItem value="create">Tạo mới</MenuItem>
                    <MenuItem value="load">Tải story có sẵn</MenuItem>
                </TextField>

                {mode === 'load' && (
                    <>
                        <TextField
                            label="Story ID"
                            value={storyIdToLoad}
                            onChange={(e) => setStoryIdToLoad(e.target.value)}
                            fullWidth
                            margin="normal"
                        />
                        <Button
                            variant="contained"
                            fullWidth
                            sx={{ mt: 2 }}
                            size="large"
                            onClick={loadExistingStory}
                        >
                            Load Story
                        </Button>
                    </>
                )}

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
                            >
                                {genresList.map((genre) => (
                                    <MenuItem key={genre} value={genre}>
                                        {genre}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            type="number"
                            label="Number of Chapters"
                            value={numChapters}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                if (value >= 1 && value <= 12) {
                                    setNumChapters(value);
                                }
                            }}
                            slotProps={{
                                htmlInput: {
                                    min: 1,
                                    max: 12,
                                },
                            }}
                            fullWidth
                            margin="normal"
                            helperText="Must be between 1 and 12"
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
