import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Typography,
    CircularProgress,
    Card,
    CardMedia,
    Grid,
    Chip,
    Divider,
    Stack,
    TextField,
    IconButton,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { ROUTES } from '../constants/app.constants';
import axios from '../api/axios';

const BASE_URL = `/api/v1/story`;

const StoryPreviewPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const initialStoryData = (location.state as any)?.storyData;

    if (!initialStoryData) {
        return (
            <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="h5" color="error">
                    No story data found. Please upload a story first.
                </Typography>
                <Button
                    variant="contained"
                    sx={{ mt: 4 }}
                    onClick={() => navigate(ROUTES.STORY_UPLOAD)}
                >
                    Go to Story Upload
                </Button>
            </Container>
        );
    }

    // Dữ liệu gốc (không thay đổi khi edit)
    const [originalData] = useState(initialStoryData);

    // Dữ liệu đang edit (có thể thay đổi)
    const [editableStory, setEditableStory] = useState<any>(initialStoryData);

    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    console.log(editableStory.numberOfChapters);

    const startEditing = () => setIsEditing(true);

    const cancelEditing = () => {
        setEditableStory(originalData);
        setIsEditing(false);
        setError(null);
    };

    const updateStory = async () => {
        try {
            setLoading(true);
            setError(null);
            await axios.put(`${BASE_URL}/${editableStory.id}`, editableStory);
            alert('Story updated successfully');
            setIsEditing(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating story');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Button
                onClick={() => navigate(ROUTES.STORY_UPLOAD)}
                variant="text"
                sx={{ mb: 4 }}
            >
                ← Back to Story List
            </Button>

            {error && (
                <Typography color="error" sx={{ mb: 3, textAlign: 'center' }}>
                    {error}
                </Typography>
            )}

            {/* Hero Section: Cover + Info */}
            <Grid container spacing={6} sx={{ mb: 6 }}>
                {/* Cover Image */}
                <Grid size={{ xs: 12, sm: 6, md: 5 }}>
                    <Card
                        elevation={8}
                        sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            height: '100%',
                        }}
                    >
                        <CardMedia
                            component="img"
                            image={editableStory.coverImageUrl}
                            alt="Story Cover"
                            sx={{ height: '100%', objectFit: 'cover' }}
                        />
                    </Card>
                </Grid>

                {/* Info Section */}
                <Grid size={{ xs: 12, sm: 6, md: 7 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                        }}
                    >
                        {isEditing ? (
                            <TextField
                                value={editableStory.title}
                                onChange={(e) =>
                                    setEditableStory({
                                        ...editableStory,
                                        title: e.target.value,
                                    })
                                }
                                fullWidth
                                variant="outlined"
                                sx={{ mb: 3 }}
                                slotProps={{
                                    input: {
                                        style: {
                                            fontSize: '2.5rem',
                                            fontWeight: 'bold',
                                        },
                                    },
                                }}
                            />
                        ) : (
                            <Typography
                                variant="h3"
                                gutterBottom
                                fontWeight="bold"
                            >
                                {editableStory.title}
                            </Typography>
                        )}

                        {!isEditing && (
                            <IconButton onClick={startEditing} color="primary">
                                <EditIcon />
                            </IconButton>
                        )}
                    </Box>

                    {/* Categories */}
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}
                    >
                        {editableStory.categories.map((cat: any) => (
                            <Chip
                                label={cat.name}
                                color="primary"
                                key={cat.id}
                            />
                        ))}
                    </Stack>

                    {/* Synopsis */}
                    {isEditing ? (
                        <TextField
                            value={editableStory.synopsis}
                            onChange={(e) =>
                                setEditableStory({
                                    ...editableStory,
                                    synopsis: e.target.value,
                                })
                            }
                            multiline
                            rows={10}
                            fullWidth
                            variant="outlined"
                            sx={{ mb: 4 }}
                        />
                    ) : (
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ lineHeight: 1.8, mb: 4, fontSize: '1.1rem' }}
                        >
                            {editableStory.synopsis}
                        </Typography>
                    )}

                    {/* Total Chapters */}
                    {isEditing ? (
                        <TextField
                            label="Total Chapters Planned"
                            type="number"
                            value={editableStory.numberOfChapters}
                            onChange={(e) =>
                                setEditableStory({
                                    ...editableStory,
                                    numberOfChapters: Number(e.target.value) || 0,
                                })
                            }
                            sx={{ maxWidth: 300, mb: 4 }}
                            variant="outlined"
                        />
                    ) : (
                        <Typography variant="subtitle1" sx={{ mb: 4 }}>
                            <strong>Total Chapters Planned:</strong>{' '}
                            {editableStory.numberOfChapters}
                        </Typography>
                    )}

                    {/* Action Buttons when editing */}
                    {isEditing && (
                        <Stack
                            direction="row"
                            spacing={2}
                            justifyContent="center"
                        >
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={updateStory}
                                disabled={loading}
                            >
                                {loading ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                            <Button variant="outlined" onClick={cancelEditing}>
                                Cancel
                            </Button>
                        </Stack>
                    )}
                </Grid>
            </Grid>

            <Divider sx={{ my: 8 }} />

            {/* Proceed to Generate Chapters */}
            <Box sx={{ textAlign: 'center', mt: 8 }}>
                <Button
                    variant="contained"
                    color="success"
                    size="large"
                    onClick={() => {
                        navigate(ROUTES.CHAPTER_GENERATOR, {
                            state: { storyId: editableStory.id },
                        });
                    }}
                    sx={{ px: 8, py: 2, fontSize: '1.2rem' }}
                >
                    Proceed to Generate Chapters →
                </Button>
            </Box>
        </Container>
    );
};

export default StoryPreviewPage;
