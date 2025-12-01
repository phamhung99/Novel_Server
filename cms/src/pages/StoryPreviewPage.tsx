import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Paper,
    TextField,
    Typography,
    CircularProgress,
} from '@mui/material';
import { ROUTES } from '../constants/app.constants';
import axios from '../api/axios';

type InitializeStoryResponseDto = {
    story: {
        storyId: string;
        title: string;
        synopsis: string;
        genres: string[];
        mainCharacter: string;
        subCharacters: string;
        antagonist?: string;
        motif?: string;
        tone?: string;
        plotLogic?: string;
        setting?: string;
        hiddenTheme?: string;
        writingStyle?: string;
        numberOfChapters: number;
        outline?: string;
    };
    chapter: {
        id: string;
        index: number;
        title: string;
        content?: string;
        summary?: string;
        imagePrompt?: string;
        directions?: string[];
    };
    message: string;
};

const BASE_URL = `/api/v1/story`;

const StoryPreviewPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const initStoryData: InitializeStoryResponseDto = location.state?.storyData;

    const [storyData, setStoryData] =
        useState<InitializeStoryResponseDto>(initStoryData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!storyData) {
        return (
            <Container>
                <Typography>
                    No story data found. Please create a story first.
                </Typography>
                <Button
                    onClick={() => navigate(ROUTES.STORY_UPLOAD)}
                    sx={{ mt: 2 }}
                >
                    Back to Upload
                </Button>
            </Container>
        );
    }

    const updateStory = async () => {
        try {
            setLoading(true);
            setError(null);
            await axios.put(
                `${BASE_URL}/${storyData.story.storyId}`,
                storyData.story,
            );
            alert('Story updated successfully');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm" sx={{ py: 4 }}>
            <Button
                onClick={() => navigate(ROUTES.STORY_UPLOAD)}
                sx={{ mb: 2 }}
            >
                ← Back
            </Button>

            {error && (
                <Typography color="error" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
                <Typography variant="h6" gutterBottom>
                    Story Preview (Editable)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Title"
                        value={storyData.story.title}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: { ...prev.story, title: e.target.value },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Synopsis"
                        value={storyData.story.synopsis}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    synopsis: e.target.value,
                                },
                            }))
                        }
                        multiline
                        fullWidth
                    />
                    <TextField
                        label="Genres (comma separated)"
                        value={storyData.story.genres.join(', ')}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    genres: e.target.value
                                        .split(',')
                                        .map((s) => s.trim()),
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Main Character"
                        value={storyData.story.mainCharacter}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    mainCharacter: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Sub Characters"
                        value={storyData.story.subCharacters}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    subCharacters: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Antagonist"
                        value={storyData.story.antagonist || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    antagonist: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Motif"
                        value={storyData.story.motif || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: { ...prev.story, motif: e.target.value },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Tone"
                        value={storyData.story.tone || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: { ...prev.story, tone: e.target.value },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Plot Logic"
                        value={storyData.story.plotLogic || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    plotLogic: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Setting"
                        value={storyData.story.setting || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    setting: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Hidden Theme"
                        value={storyData.story.hiddenTheme || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    hiddenTheme: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Writing Style"
                        value={storyData.story.writingStyle || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    writingStyle: e.target.value,
                                },
                            }))
                        }
                        fullWidth
                    />
                    <TextField
                        label="Outline"
                        value={storyData.story.outline || ''}
                        onChange={(e) =>
                            setStoryData((prev) => ({
                                ...prev,
                                story: {
                                    ...prev.story,
                                    outline: e.target.value,
                                },
                            }))
                        }
                        multiline
                        fullWidth
                    />
                    <Button
                        variant="contained"
                        onClick={updateStory}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            'Update Story'
                        )}
                    </Button>
                </Box>
            </Paper>

            <Button
                variant="contained"
                onClick={async () => {
                    navigate(ROUTES.CHAPTER_GENERATOR, {
                        state: {
                            storyId: storyData.story.storyId,
                        },
                    });
                }}
                sx={{ mt: 2 }}
                fullWidth
            >
                Generate Chapter
            </Button>
        </Container>
    );
};

export default StoryPreviewPage;
