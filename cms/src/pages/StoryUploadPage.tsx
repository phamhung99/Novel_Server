import React, { useState } from 'react';
import {
    Box,
    Button,
    TextField,
    Typography,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    CircularProgress,
    Paper,
} from '@mui/material';
import axios from '../api/axios'; // cấu hình axios với baseURL của bạn

const genresList = ['Ngôn Tình', 'Hệ Thống', 'Nữ Cường', 'Hài Hước', 'Kinh Dị'];

const userId = 'thieptrinh01156789';

const StoryUploadPage: React.FC = () => {
    // Step management
    const [step, setStep] = useState<1 | 2>(1);

    // Story creation state
    const [storyPrompt, setStoryPrompt] = useState('');
    const [genres, setGenres] = useState<string[]>([]);
    const [numberOfChapters, setNumberOfChapters] = useState<number>(1);
    const [aiProvider, setAiProvider] = useState<'grok' | 'gpt'>('grok');

    const [storyResponse, setStoryResponse] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    // Chapter creation state
    const [chapterNumber, setChapterNumber] = useState(1);
    const [wordCount, setWordCount] = useState<number>(1300);
    const [chapterResponse, setChapterResponse] = useState<any>(null);

    // Handlers
    const handleInitializeStory = async () => {
        if (!storyPrompt || genres.length === 0) {
            alert('Vui lòng nhập prompt và chọn ít nhất 1 genre');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(
                '/generate/initialize',
                {
                    storyPrompt,
                    genres,
                    numberOfChapters,
                    aiProvider,
                },
                {
                    headers: {
                        'x-user-id': userId,
                    },
                },
            );
            setStoryResponse(res.data);
            setStep(2);
        } catch (err: any) {
            console.error(err);
            alert('Lỗi khi tạo story');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateChapter = async () => {
        if (!storyResponse) return;

        setLoading(true);
        try {
            const res = await axios.post(
                `/${storyResponse.storyId}/generate/chapter-on-demand`,
                {
                    chapterNumber,
                    wordCount,
                    aiProvider,
                },
            );
            setChapterResponse(res.data);
        } catch (err: any) {
            console.error(err);
            alert('Lỗi khi tạo chapter');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p={4}>
            <Typography variant="h4" mb={3}>
                {step === 1 ? 'Tạo Story' : 'Tạo Chapter'}
            </Typography>

            {step === 1 && (
                <Paper
                    sx={{
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <TextField
                        label="Story Prompt"
                        value={storyPrompt}
                        onChange={(e) => setStoryPrompt(e.target.value)}
                        fullWidth
                    />

                    <FormControl fullWidth>
                        <InputLabel>Genres</InputLabel>
                        <Select
                            multiple
                            value={genres}
                            onChange={(e) =>
                                setGenres(
                                    typeof e.target.value === 'string'
                                        ? e.target.value.split(',')
                                        : e.target.value,
                                )
                            }
                            renderValue={(selected) =>
                                (selected as string[]).join(', ')
                            }
                        >
                            {genresList.map((g) => (
                                <MenuItem key={g} value={g}>
                                    {g}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        label="Number of Chapters"
                        type="number"
                        inputProps={{ min: 1, max: 10 }}
                        value={numberOfChapters}
                        onChange={(e) =>
                            setNumberOfChapters(Number(e.target.value))
                        }
                    />

                    <FormControl fullWidth>
                        <InputLabel>AI Provider</InputLabel>
                        <Select
                            value={aiProvider}
                            onChange={(e) =>
                                setAiProvider(e.target.value as 'grok' | 'gpt')
                            }
                        >
                            <MenuItem value="grok">Grok</MenuItem>
                            <MenuItem value="gpt">GPT</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="contained"
                        onClick={handleInitializeStory}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Tạo Story'}
                    </Button>
                </Paper>
            )}

            {step === 2 && storyResponse && (
                <Paper
                    sx={{
                        p: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <Typography variant="h6">Story Created:</Typography>
                    <Typography>Title: {storyResponse.title}</Typography>
                    <Typography>Synopsis: {storyResponse.synopsis}</Typography>
                    <Typography>
                        Genres: {storyResponse.genres.join(', ')}
                    </Typography>
                    <Typography>
                        Number of Chapters: {storyResponse.numberOfChapters}
                    </Typography>

                    <TextField
                        label="Chapter Number"
                        type="number"
                        inputProps={{
                            min: 1,
                            max: storyResponse.numberOfChapters,
                        }}
                        value={chapterNumber}
                        onChange={(e) =>
                            setChapterNumber(Number(e.target.value))
                        }
                    />
                    <TextField
                        label="Word Count"
                        type="number"
                        value={wordCount}
                        onChange={(e) => setWordCount(Number(e.target.value))}
                    />
                    <FormControl fullWidth>
                        <InputLabel>AI Provider</InputLabel>
                        <Select
                            value={aiProvider}
                            onChange={(e) =>
                                setAiProvider(e.target.value as 'grok' | 'gpt')
                            }
                        >
                            <MenuItem value="grok">Grok</MenuItem>
                            <MenuItem value="gpt">GPT</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="contained"
                        onClick={handleGenerateChapter}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            'Tạo Chapter'
                        )}
                    </Button>

                    {chapterResponse && (
                        <Box mt={3}>
                            <Typography variant="h6">
                                Chapter Generated:
                            </Typography>
                            <Typography>
                                Title: {chapterResponse.title}
                            </Typography>
                            <Typography>
                                Content: {chapterResponse.content}
                            </Typography>
                            <Typography>
                                Summary: {chapterResponse.summary}
                            </Typography>
                            <Typography>
                                Image Prompt: {chapterResponse.imagePrompt}
                            </Typography>
                        </Box>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default StoryUploadPage;
