import { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    CircularProgress,
    Card,
    CardContent,
    TextField,
    Grid,
    Divider,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import type { ChapterDto, StoryDto } from '../types/app';

const StoryDetailPage = () => {
    const { storyId } = useParams();
    const navigate = useNavigate();
    const [story, setStory] = useState<StoryDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const fetchStory = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/v1/story/${storyId}`);
                console.log(res.data.data);

                setStory(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStory();
    }, [storyId]);

    if (loading) return <CircularProgress />;
    if (!story) return <Typography>Story not found</Typography>;

    const handleChange = (field: keyof StoryDto, value: any) => {
        setStory((prev) => prev && { ...prev, [field]: value });
    };

    const handleChapterChange = (
        idx: number,
        field: keyof ChapterDto,
        value: string,
    ) => {
        if (!story) return;
        const updatedChapters = story.chapters.map((ch, i) =>
            i === idx ? { ...ch, [field]: value } : ch,
        );
        setStory({ ...story, chapters: updatedChapters });
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box display="flex" justifyContent="space-between" mb={3}>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                    Back
                </Button>
                <Button
                    variant="contained"
                    color={editMode ? 'secondary' : 'primary'}
                    onClick={() => setEditMode((prev) => !prev)}
                >
                    {editMode ? 'Cancel Edit' : 'Edit'}
                </Button>
            </Box>

            {/* Story Info + Generation */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h5" gutterBottom>
                        Story Info
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
                        ID: {story.id}
                    </Typography>

                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                        <Grid size={8}>
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    label="Title"
                                    value={story.title}
                                    onChange={(e) =>
                                        handleChange('title', e.target.value)
                                    }
                                />
                            ) : (
                                <Typography variant="h6">
                                    {story.title}
                                </Typography>
                            )}
                        </Grid>
                        <Grid size={4}>
                            <Typography>Type: {story.type}</Typography>
                        </Grid>
                        <Grid size={12}>
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    label="Synopsis"
                                    value={story.synopsis}
                                    onChange={(e) =>
                                        handleChange('synopsis', e.target.value)
                                    }
                                />
                            ) : (
                                <Typography>{story.synopsis}</Typography>
                            )}
                        </Grid>

                        {/* Generation */}
                        {story.generation && (
                            <>
                                {Object.entries(story.generation).map(
                                    ([key, value]) => (
                                        <Grid size={12} key={key}>
                                            <Typography variant="body1">
                                                <strong>
                                                    {key
                                                        .charAt(0)
                                                        .toUpperCase() +
                                                        key.slice(1)}
                                                    :
                                                </strong>{' '}
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value)
                                                    : value}
                                            </Typography>
                                        </Grid>
                                    ),
                                )}
                            </>
                        )}
                    </Grid>
                </CardContent>
            </Card>

            {/* Chapters */}
            {story.chapters.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h5" gutterBottom>
                            Chapters
                        </Typography>
                        {story.chapters.map((ch, idx) => (
                            <Box key={ch.id} sx={{ mb: 2 }}>
                                <Typography variant="subtitle1">
                                    Chapter {ch.index}: {ch.title}
                                </Typography>
                                {editMode ? (
                                    <Grid container spacing={2}>
                                        <Grid size={12}>
                                            <TextField
                                                fullWidth
                                                label="Title"
                                                value={ch.title}
                                                onChange={(e) =>
                                                    handleChapterChange(
                                                        idx,
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Grid>
                                        <Grid size={12}>
                                            <TextField
                                                fullWidth
                                                multiline
                                                minRows={4}
                                                label="Content"
                                                value={ch.content}
                                                onChange={(e) =>
                                                    handleChapterChange(
                                                        idx,
                                                        'content',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Grid>
                                    </Grid>
                                ) : (
                                    <Typography>{ch.content}</Typography>
                                )}
                            </Box>
                        ))}
                    </CardContent>
                </Card>
            )}

            {editMode && (
                <Box mt={3}>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => console.log('Save', story)}
                    >
                        Save Changes
                    </Button>
                </Box>
            )}
        </Container>
    );
};

export default StoryDetailPage;
