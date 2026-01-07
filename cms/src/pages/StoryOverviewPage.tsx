import { useEffect, useMemo, useRef, useState } from 'react';
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
    IconButton,
    DialogTitle,
    Dialog,
    DialogContentText,
    DialogContent,
    DialogActions,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import type { StoryDto } from '../types/app';
import { ROUTES } from '../constants/app.constants';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

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
    const [uploadingCover, setUploadingCover] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [chapterToDelete, setChapterToDelete] = useState<{
        index: number;
        title?: string;
    } | null>(null);
    const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

    const [openGenerateDialog, setOpenGenerateDialog] = useState(false);
    const [coverPrompt, setCoverPrompt] = useState<string>('');
    const [generatingCover, setGeneratingCover] = useState(false);

    const handleUploadCover = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file || !story || !userId) return;

        setUploadingCover(true);

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await axios.post(
                `/api/v1/story/${storyId}/upload-cover`,
                formData,
                {
                    headers: {
                        'x-user-id': userId,
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );

            const newCoverUrl = res.data?.data?.coverImageUrl;

            if (newCoverUrl) {
                setStory((prev) =>
                    prev ? { ...prev, coverImageUrl: newCoverUrl } : prev,
                );
                alert('Cover image uploaded successfully!');
            }
        } catch (err) {
            console.error('Upload cover failed:', err);
            alert('Upload failed. Please try again.');
        } finally {
            setUploadingCover(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteChapter = async () => {
        if (!chapterToDelete || !storyId || !userId) return;

        const idx = chapterToDelete.index;
        setDeletingIndex(idx);

        try {
            await axios.delete(`/api/v1/story/${storyId}/chapter/${idx}`, {
                headers: { 'x-user-id': userId },
            });

            setStory((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    chapters: prev.chapters.filter((c) => c.index !== idx),
                };
            });

            setChapterToDelete(null);
        } catch (err) {
            console.error('Delete chapter failed:', err);
            alert('Failed to delete chapter. Please try again.');
        } finally {
            setDeletingIndex(null);
        }
    };

    useEffect(() => {
        if (story?.generation?.metadata && openGenerateDialog) {
            const defaultPrompt =
                (story.generation.metadata as any)?.coverImage || '';
            setCoverPrompt(defaultPrompt);
        }
    }, [story, openGenerateDialog]);

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
                onClick={() => navigate(ROUTES.MANAGE_STORIES)}
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

                        {/* Overlay while uploading */}
                        {uploadingCover && (
                            <Box
                                sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    bgcolor: 'rgba(0,0,0,0.4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <CircularProgress color="inherit" />
                            </Box>
                        )}
                    </Paper>

                    {/* Hidden input */}
                    <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleUploadCover}
                    />

                    <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<CloudUploadIcon />}
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingCover}
                        sx={{ mb: 2 }}
                    >
                        {uploadingCover ? 'Uploading...' : 'Change cover image'}
                    </Button>

                    <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<AutoAwesomeIcon />}
                        onClick={() => setOpenGenerateDialog(true)}
                        disabled={
                            uploadingCover ||
                            generatingCover ||
                            !story?.generation?.metadata ||
                            !(story.generation.metadata as any)?.coverImage
                        }
                        sx={{ mb: 2 }}
                    >
                        {generatingCover
                            ? 'Generating...'
                            : 'Regenerate cover image with AI'}
                    </Button>

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
                                <>
                                    <Typography variant="h3" gutterBottom>
                                        {story.title}
                                    </Typography>
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{
                                            display: 'block',
                                            mb: 2,
                                            fontFamily: 'monospace',
                                        }}
                                    >
                                        ID: {storyId}
                                    </Typography>
                                </>
                            )}

                            <Typography variant="body1" gutterBottom>
                                <strong>Type:</strong> {story.type} |{' '}
                                <strong>Status:</strong> {story.status}
                            </Typography>

                            {/* Categories (Main Category highlighted) */}
                            <Typography
                                variant="body1"
                                gutterBottom
                                sx={{ mt: 2 }}
                            >
                                <strong>Categories:</strong>
                                {editMode ? (
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

                            {/* Generation Info */}
                            <Typography
                                variant="h6"
                                gutterBottom
                                sx={{ mt: 4 }}
                            >
                                Generation Info
                            </Typography>

                            {story.generation ? (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="body1" gutterBottom>
                                        <strong>AI Provider:</strong>{' '}
                                        <Chip
                                            label={
                                                story.generation.aiProvider ||
                                                'N/A'
                                            }
                                            color="info"
                                            size="small"
                                            sx={{ ml: 1 }}
                                        />
                                    </Typography>

                                    <Typography variant="body1" gutterBottom>
                                        <strong>AI Model:</strong>{' '}
                                        <Chip
                                            label={
                                                story.generation.aiModel ||
                                                'N/A'
                                            }
                                            color="info"
                                            size="small"
                                            sx={{ ml: 1 }}
                                        />
                                    </Typography>

                                    {story.generation.prompt && (
                                        <>
                                            <Typography
                                                variant="body1"
                                                gutterBottom
                                                sx={{ mt: 2 }}
                                            >
                                                <strong>Prompt:</strong>
                                            </Typography>
                                            <Paper
                                                variant="outlined"
                                                sx={{
                                                    p: 2,
                                                    bgcolor: 'grey.50',
                                                    fontFamily: 'Monospace',
                                                    fontSize: '0.875rem',
                                                    overflowX: 'auto',
                                                    mt: 1,
                                                }}
                                            >
                                                <pre
                                                    style={{
                                                        margin: 0,
                                                        whiteSpace: 'pre-wrap',
                                                    }}
                                                >
                                                    {story.generation.prompt
                                                        .storyPrompt ||
                                                        'No story prompt'}
                                                </pre>
                                            </Paper>

                                            {story.generation.prompt
                                                .numberOfChapters && (
                                                <Typography
                                                    variant="body1"
                                                    sx={{ mt: 1 }}
                                                >
                                                    <strong>
                                                        Planned Chapters:
                                                    </strong>{' '}
                                                    {
                                                        story.generation.prompt
                                                            .numberOfChapters
                                                    }
                                                </Typography>
                                            )}
                                        </>
                                    )}

                                    {story.generation.metadata &&
                                        Object.keys(story.generation.metadata)
                                            .length > 0 && (
                                            <>
                                                <Typography
                                                    variant="h6"
                                                    gutterBottom
                                                    sx={{ mt: 3 }}
                                                >
                                                    Metadata
                                                </Typography>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: 'grey.50',
                                                        fontFamily: 'Monospace',
                                                        fontSize: '0.875rem',
                                                        overflowX: 'auto',
                                                    }}
                                                >
                                                    <pre
                                                        style={{
                                                            margin: 0,
                                                            whiteSpace:
                                                                'pre-wrap',
                                                        }}
                                                    >
                                                        {JSON.stringify(
                                                            story.generation
                                                                .metadata,
                                                            null,
                                                            2,
                                                        )}
                                                    </pre>
                                                </Paper>
                                            </>
                                        )}
                                </Box>
                            ) : (
                                <Typography color="text.secondary">
                                    No generation information available.
                                </Typography>
                            )}

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
                                        <Box
                                            key={chapter.id}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 1,
                                                mb: 1,
                                            }}
                                        >
                                            <ListItemButton
                                                onClick={() =>
                                                    navigate(
                                                        `${ROUTES.STORY_OVERVIEW}/${storyId}/chapters/${chapter.index}`,
                                                        {
                                                            state: {
                                                                storyTitle:
                                                                    story.title,
                                                                totalChapters:
                                                                    story
                                                                        .chapters
                                                                        .length,
                                                            },
                                                        },
                                                    )
                                                }
                                                sx={{
                                                    borderRadius: 1,
                                                    flex: 1,
                                                }}
                                                disabled={
                                                    deletingIndex ===
                                                    chapter.index
                                                }
                                            >
                                                <ListItemText
                                                    primary={`Chapter ${chapter.index}: ${chapter.title}`}
                                                />
                                            </ListItemButton>

                                            <IconButton
                                                aria-label="Delete chapter"
                                                color="error"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setChapterToDelete({
                                                        index: chapter.index,
                                                        title: chapter.title,
                                                    });
                                                }}
                                                disabled={
                                                    deletingIndex ===
                                                    chapter.index
                                                }
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </List>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Dialog
                open={!!chapterToDelete}
                onClose={() => {
                    if (deletingIndex !== null) return;
                    setChapterToDelete(null);
                }}
            >
                <DialogTitle>Delete chapter?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete{' '}
                        <strong>
                            Chapter {chapterToDelete?.index}
                            {chapterToDelete?.title
                                ? `: ${chapterToDelete.title}`
                                : ''}
                        </strong>
                        ? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setChapterToDelete(null)}
                        disabled={deletingIndex !== null}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDeleteChapter}
                        disabled={deletingIndex !== null}
                    >
                        {deletingIndex !== null ? 'Deleting...' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openGenerateDialog}
                onClose={() => {
                    if (!generatingCover) setOpenGenerateDialog(false);
                }}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Regenerate cover image with AI</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter a prompt for the AI to generate a new cover image.
                        If you leave it empty, the system will use the default
                        prompt from the original story generation.
                    </DialogContentText>

                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Cover image prompt"
                        value={coverPrompt}
                        onChange={(e) => setCoverPrompt(e.target.value)}
                        placeholder="Example: A mysterious dark fantasy forest with glowing runes, epic book cover style, cinematic lighting"
                        disabled={generatingCover}
                        sx={{ mt: 1 }}
                        variant="outlined"
                        InputProps={{
                            endAdornment: coverPrompt && (
                                <IconButton
                                    size="small"
                                    onClick={() => setCoverPrompt('')}
                                    disabled={generatingCover}
                                    aria-label="Clear prompt"
                                >
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            ),
                        }}
                    />

                    {story?.generation?.metadata &&
                        (story.generation.metadata as any).coverImage && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mt: 1, display: 'block' }}
                            >
                                Default prompt (from the initial generation):{' '}
                                {(
                                    story.generation.metadata as any
                                ).coverImage.substring(0, 120)}
                                {(story.generation.metadata as any).coverImage
                                    .length > 120
                                    ? '...'
                                    : ''}
                            </Typography>
                        )}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={() => setOpenGenerateDialog(false)}
                        disabled={generatingCover}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={
                            generatingCover ? (
                                <CircularProgress size={20} color="inherit" />
                            ) : (
                                <AutoAwesomeIcon />
                            )
                        }
                        onClick={async () => {
                            if (!storyId || !userId) return;

                            setGeneratingCover(true);
                            try {
                                const payload = coverPrompt.trim()
                                    ? { prompt: coverPrompt.trim() }
                                    : {};

                                const res = await axios.post(
                                    `/api/v1/story/${storyId}/generate/cover-image`,
                                    payload,
                                    {
                                        headers: {
                                            'x-user-id': userId,
                                            'Content-Type': 'application/json',
                                        },
                                    },
                                );

                                const newCoverUrl = res.data?.coverImageUrl;

                                if (newCoverUrl) {
                                    setStory((prev) =>
                                        prev
                                            ? {
                                                  ...prev,
                                                  coverImageUrl: newCoverUrl,
                                              }
                                            : prev,
                                    );
                                    alert(
                                        'Cover image was regenerated successfully!',
                                    );
                                    setOpenGenerateDialog(false);
                                }
                            } catch (err: any) {
                                console.error('Generate cover failed:', err);
                                alert(
                                    err.response?.data?.message ||
                                        'Generation failed. Please try again later.',
                                );
                            } finally {
                                setGeneratingCover(false);
                            }
                        }}
                        disabled={generatingCover}
                    >
                        {generatingCover
                            ? 'Generating...'
                            : 'Generate new image'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default StoryOverviewPage;
