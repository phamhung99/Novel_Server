import { useEffect, useMemo, useState } from 'react';
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
    List,
    ListItemButton,
    ListItemText,
    Paper,
    Chip,
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import type { StoryDto } from '../types/app';
import { ROUTES } from '../constants/app.constants';

const StoryOverviewPage = () => {
    const userId = useMemo(
        () => JSON.parse(localStorage.getItem('user') || '{}').id || '',
        [],
    );
    const { storyId } = useParams<{ storyId: string }>();
    const navigate = useNavigate();
    const [story, setStory] = useState<StoryDto | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const fetchStory = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`/api/v1/story/${storyId}`, {
                    headers: { 'x-user-id': userId },
                });
                setStory(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStory();
    }, [storyId]);

    const handleChange = (field: keyof StoryDto, value: any) => {
        setStory((prev) => prev && { ...prev, [field]: value });
    };

    if (loading)
        return (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 8 }} />
        );
    if (!story) return <Typography align="center">Story not found</Typography>;

    return (
        <Container maxWidth="xl" sx={{ py: 6 }}>
            <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{ mb: 4 }}
            >
                Back
            </Button>

            <Grid container spacing={6}>
                {/* Cover + Basic Info */}
                <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                    <Paper
                        elevation={8}
                        sx={{ borderRadius: 2, overflow: 'hidden', mb: 4 }}
                    >
                        {story.coverImageUrl ? (
                            <Box
                                component="img"
                                src={story.coverImageUrl}
                                alt={story.title}
                                sx={{
                                    width: '100%',
                                    height: 'auto',
                                    display: 'block',
                                }}
                            />
                        ) : (
                            <Box
                                sx={{
                                    width: '100%',
                                    height: 500,
                                    bgcolor: 'grey.300',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Typography variant="h6" color="text.secondary">
                                    No Cover Image
                                </Typography>
                            </Box>
                        )}
                    </Paper>

                    <Button
                        fullWidth
                        variant="contained"
                        color={editMode ? 'secondary' : 'primary'}
                        onClick={() => setEditMode(!editMode)}
                        sx={{ mb: 2 }}
                    >
                        {editMode ? 'Cancel' : 'Edit Story Info'}
                    </Button>

                    {editMode && (
                        <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            onClick={async () => {
                                try {
                                    await axios.put(
                                        `/api/v1/story/${storyId}`,
                                        {
                                            title: story.title,
                                            synopsis: story.synopsis,
                                        },
                                        {
                                            headers: { 'x-user-id': userId },
                                        },
                                    );

                                    setEditMode(false);
                                } catch (err) {
                                    console.error(
                                        'Failed to update story:',
                                        err,
                                    );
                                }
                            }}
                            sx={{ mb: 2 }}
                        >
                            Save Story Info
                        </Button>
                    )}
                </Grid>

                {/* Info + Chapters List */}
                <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                    {/* Title & Synopsis */}
                    <Card sx={{ mb: 4 }}>
                        <CardContent>
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    label="Title"
                                    value={story.title}
                                    onChange={(e) =>
                                        handleChange('title', e.target.value)
                                    }
                                    sx={{ mb: 3 }}
                                />
                            ) : (
                                <Typography variant="h3" gutterBottom>
                                    {story.title}
                                </Typography>
                            )}

                            <Typography variant="body1" gutterBottom>
                                <strong>Type:</strong> {story.type} |{' '}
                                <strong>Status:</strong> {story.status}
                            </Typography>

                            {/* Categories (Main Category được highlight) */}
                            <Typography
                                variant="body1"
                                gutterBottom
                                sx={{ mt: 2 }}
                            >
                                <strong>Categories:</strong>
                                {editMode ? (
                                    // --- EDIT MODE: Hiển thị từng TextField nhưng vẫn giữ nguyên ID ---
                                    <Box
                                        sx={{
                                            mt: 1,
                                            display: 'flex',
                                            flexWrap: 'wrap',
                                            gap: 1,
                                        }}
                                    >
                                        {story.categories &&
                                        story.categories.length > 0 ? (
                                            story.categories.map((cat) => {
                                                const isMain =
                                                    story.mainCategory?.id ===
                                                    cat.id;
                                                return (
                                                    <TextField
                                                        key={cat.id}
                                                        size="small"
                                                        label={
                                                            isMain
                                                                ? 'Main Category'
                                                                : undefined
                                                        }
                                                        value={cat.name}
                                                        onChange={(e) => {
                                                            const newCats =
                                                                story.categories.map(
                                                                    (c) =>
                                                                        c.id ===
                                                                        cat.id
                                                                            ? {
                                                                                  ...c,
                                                                                  name: e
                                                                                      .target
                                                                                      .value,
                                                                              }
                                                                            : c,
                                                                );
                                                            handleChange(
                                                                'categories',
                                                                newCats,
                                                            );

                                                            // Nếu đây là main category → cập nhật luôn mainCategory name
                                                            if (isMain) {
                                                                handleChange(
                                                                    'mainCategory',
                                                                    {
                                                                        ...story.mainCategory,
                                                                        name: e
                                                                            .target
                                                                            .value,
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                        sx={{
                                                            width: 180,
                                                            ...(isMain && {
                                                                '& .MuiOutlinedInput-root':
                                                                    {
                                                                        fontWeight:
                                                                            'bold',
                                                                        borderColor:
                                                                            'primary.main',
                                                                    },
                                                            }),
                                                        }}
                                                        InputProps={{
                                                            endAdornment:
                                                                isMain && (
                                                                    <Chip
                                                                        label="MAIN"
                                                                        size="small"
                                                                        color="primary"
                                                                    />
                                                                ),
                                                        }}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <Typography
                                                component="span"
                                                color="text.secondary"
                                                sx={{ ml: 1 }}
                                            >
                                                None
                                            </Typography>
                                        )}
                                    </Box>
                                ) : (
                                    // --- VIEW MODE: Chip thường + Main Category highlight ---
                                    <Box
                                        component="span"
                                        sx={{
                                            ml: 1,
                                            display: 'inline-flex',
                                            flexWrap: 'wrap',
                                            gap: 0.5,
                                        }}
                                    >
                                        {story.categories &&
                                        story.categories.length > 0 ? (
                                            story.categories.map((cat) => {
                                                const isMain =
                                                    story.mainCategory?.id ===
                                                    cat.id;
                                                return (
                                                    <Chip
                                                        key={cat.id}
                                                        label={cat.name}
                                                        size="small"
                                                        color={
                                                            isMain
                                                                ? 'primary'
                                                                : 'default'
                                                        }
                                                        variant={
                                                            isMain
                                                                ? 'filled'
                                                                : 'outlined'
                                                        }
                                                        sx={{
                                                            fontWeight: isMain
                                                                ? 'bold'
                                                                : 'normal',
                                                        }}
                                                    />
                                                );
                                            })
                                        ) : (
                                            <Typography
                                                component="span"
                                                color="text.secondary"
                                            >
                                                None
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Typography>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="h6" gutterBottom>
                                Synopsis
                            </Typography>
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={6}
                                    value={story.synopsis}
                                    onChange={(e) =>
                                        handleChange('synopsis', e.target.value)
                                    }
                                />
                            ) : (
                                <Typography whiteSpace="pre-line" paragraph>
                                    {story.synopsis}
                                </Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Chapters List */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Chapters ({story.chapters.length})
                            </Typography>
                            <Divider sx={{ my: 2 }} />

                            {story.chapters.length === 0 ? (
                                <Typography color="text.secondary">
                                    No chapters yet.
                                </Typography>
                            ) : (
                                <List>
                                    {story.chapters.map((chapter) => (
                                        <ListItemButton
                                            key={chapter.id}
                                            onClick={() =>
                                                navigate(
                                                    `${ROUTES.STORY_OVERVIEW}/${storyId}/chapters/${chapter.index}`,
                                                    {
                                                        state: {
                                                            storyTitle:
                                                                story.title,
                                                            totalChapters:
                                                                story.chapters
                                                                    .length,
                                                            chapterIndexes:
                                                                story.chapters.map(
                                                                    (c) =>
                                                                        c.index,
                                                                ),
                                                        },
                                                    },
                                                )
                                            }
                                            sx={{ borderRadius: 1, mb: 1 }}
                                        >
                                            <ListItemText
                                                primary={`Chapter ${chapter.index}: ${chapter.title}`}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
};

export default StoryOverviewPage;
