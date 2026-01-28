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
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
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
    const [tempTags, setTempTags] = useState<string[]>([]);
    const [newTagInput, setNewTagInput] = useState('');

    const availableModels = [
        'imagen-4.0-generate-001',
        'imagen-4.0-ultra-generate-001',
        'imagen-4.0-fast-generate-001',
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
    ] as const;

    type ModelType = (typeof availableModels)[number];

    const [selectedModel, setSelectedModel] = useState<ModelType>(
        'imagen-4.0-fast-generate-001',
    );

    const handleAddChapter = () => {
        navigate(`${ROUTES.MANUAL_CREATION}/${storyId}`);
    };

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
                setOpenGenerateDialog(false);
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

    const handleGenerateCover = async () => {
        if (!storyId || !userId) return;

        setGeneratingCover(true);
        try {
            const payload: any = {
                model: selectedModel,
            };

            if (coverPrompt.trim()) {
                payload.prompt = coverPrompt.trim();
            }

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

            const newCoverUrl = res.data?.data?.coverImageUrl;

            console.log(newCoverUrl, res.data);

            if (newCoverUrl) {
                setStory((prev) =>
                    prev
                        ? {
                              ...prev,
                              coverImageUrl: newCoverUrl,
                          }
                        : prev,
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

    useEffect(() => {
        fetchStory();
    }, [storyId]);

    const handleChange = (field: keyof StoryDto, value: any) => {
        setStory((prev) => prev && { ...prev, [field]: value });
    };

    const handleUpdateStory = async () => {
        try {
            if (!story) {
                throw new Error('No story to update');
            }

            await axios.put(
                `/api/v1/story/${storyId}`,
                {
                    title: story.title,
                    synopsis: story.synopsis,
                    freeChaptersCount: story.freeChaptersCount,
                    isFullyFree: story.isFullyFree,
                    tags: tempTags,
                },
                {
                    headers: { 'x-user-id': userId },
                },
            );

            await fetchStory();

            setEditMode(false);
        } catch (err) {
            console.error('Failed to update story:', err);
        }
    };

    useEffect(() => {
        if (editMode && story) {
            setTempTags(story.tags || []);
        }
    }, [editMode, story]);

    // Add new tag
    const handleAddTag = () => {
        if (!newTagInput.trim()) return;
        const tag = newTagInput.trim().toLowerCase();
        if (tag && !tempTags.includes(tag)) {
            setTempTags((prev) => [...prev, tag]);
        }
        setNewTagInput('');
    };

    // Remove tag
    const handleRemoveTag = (tagToRemove: string) => {
        setTempTags((prev) => prev.filter((t) => t !== tagToRemove));
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
                        disabled={uploadingCover || generatingCover}
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
                            onClick={handleUpdateStory}
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

                            {/* ── NEW: Free chapters & fully free toggles ── */}
                            {editMode ? (
                                <Grid
                                    container
                                    spacing={3}
                                    sx={{ mt: 2, mb: 3 }}
                                >
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth
                                            type="number"
                                            label="Free Chapters Count"
                                            value={
                                                story.freeChaptersCount ?? ''
                                            }
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                handleChange(
                                                    'freeChaptersCount',
                                                    val === ''
                                                        ? undefined
                                                        : Number(val),
                                                );
                                            }}
                                            placeholder="e.g. 3 (first 3 chapters free)"
                                            helperText="Leave empty or 0 = no free chapters"
                                            InputProps={{
                                                inputProps: {
                                                    min: 0,
                                                    max:
                                                        story.chapters.length ||
                                                        999,
                                                },
                                            }}
                                            sx={{ mb: 1 }}
                                        />
                                    </Grid>

                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <FormControl fullWidth>
                                            <InputLabel>
                                                Access Model
                                            </InputLabel>
                                            <Select
                                                value={
                                                    story.isFullyFree
                                                        ? 'fully-free'
                                                        : 'freemium'
                                                }
                                                label="Access Model"
                                                onChange={(e) => {
                                                    handleChange(
                                                        'isFullyFree',
                                                        e.target.value ===
                                                            'fully-free',
                                                    );
                                                    // Optional: reset freeChaptersCount when switching to fully free
                                                    if (
                                                        e.target.value ===
                                                        'fully-free'
                                                    ) {
                                                        handleChange(
                                                            'freeChaptersCount',
                                                            undefined,
                                                        );
                                                    }
                                                }}
                                            >
                                                <MenuItem value="freemium">
                                                    Freemium (some chapters
                                                    paid)
                                                </MenuItem>
                                                <MenuItem value="fully-free">
                                                    Fully Free
                                                </MenuItem>
                                            </Select>
                                            <FormHelperText>
                                                {story.isFullyFree
                                                    ? 'All chapters are accessible without payment'
                                                    : 'Only first N chapters are free'}
                                            </FormHelperText>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            ) : (
                                // ── Display mode ─────────────────────────────────────────────
                                <Box sx={{ mt: 2, mb: 3 }}>
                                    {story.isFullyFree ? (
                                        <Chip
                                            label="Fully Free"
                                            color="success"
                                            variant="filled"
                                            sx={{ fontWeight: 'medium' }}
                                        />
                                    ) : story.freeChaptersCount &&
                                      story.freeChaptersCount > 0 ? (
                                        <Chip
                                            label={`First ${story.freeChaptersCount} chapter${
                                                story.freeChaptersCount > 1
                                                    ? 's'
                                                    : ''
                                            } free`}
                                            color="primary"
                                            variant="outlined"
                                        />
                                    ) : (
                                        <Chip
                                            label="All chapters paid"
                                            color="default"
                                            variant="outlined"
                                        />
                                    )}
                                </Box>
                            )}

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

                            <Typography
                                variant="body1"
                                gutterBottom
                                sx={{ mt: 3 }}
                            >
                                <strong>Tags:</strong>
                                {editMode ? (
                                    <Box sx={{ mt: 1 }}>
                                        {/* Edit mode: removable chips + add input */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: 1,
                                                mb: 2,
                                            }}
                                        >
                                            {tempTags.length > 0 ? (
                                                tempTags.map((tag) => (
                                                    <Chip
                                                        key={tag}
                                                        label={tag}
                                                        onDelete={() =>
                                                            handleRemoveTag(tag)
                                                        }
                                                        color="primary"
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                ))
                                            ) : (
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ ml: 1 }}
                                                >
                                                    No tags yet
                                                </Typography>
                                            )}
                                        </Box>

                                        <Box
                                            sx={{
                                                display: 'flex',
                                                gap: 1,
                                                alignItems: 'center',
                                            }}
                                        >
                                            <TextField
                                                size="small"
                                                label="Add tag (press Enter)"
                                                value={newTagInput}
                                                onChange={(e) =>
                                                    setNewTagInput(
                                                        e.target.value,
                                                    )
                                                }
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddTag();
                                                    }
                                                }}
                                                sx={{ flex: 1, maxWidth: 300 }}
                                                placeholder="e.g. mystery, slow-burn, historical"
                                            />
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={handleAddTag}
                                                disabled={!newTagInput.trim()}
                                            >
                                                Add
                                            </Button>
                                        </Box>

                                        <FormHelperText sx={{ mt: 1 }}>
                                            Tags help readers find your story.
                                            Press Enter or click Add.
                                        </FormHelperText>
                                    </Box>
                                ) : (
                                    // ── View mode ── make it look exactly like Categories ───────────────────────
                                    <Box
                                        component="span"
                                        sx={{
                                            ml: 1,
                                            display: 'inline-flex',
                                            flexWrap: 'wrap',
                                            gap: 0.8, // same as categories
                                            alignItems: 'center',
                                            mt: 0.5,
                                        }}
                                    >
                                        {story.tags && story.tags.length > 0 ? (
                                            story.tags.map((tag: string) => (
                                                <Chip
                                                    key={tag}
                                                    label={tag}
                                                    size="small"
                                                    variant="outlined"
                                                    // Optional: make tags look less prominent than main category
                                                    color="default"
                                                    sx={{
                                                        fontWeight: 'normal',
                                                        // If you want tags slightly smaller or lighter than categories
                                                        // '& .MuiChip-label': { px: 1.2, py: 0.4 },
                                                    }}
                                                />
                                            ))
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
                            <Box
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h5">
                                    Chapters ({story.chapters.length})
                                </Typography>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<AutoAwesomeIcon />}
                                    onClick={handleAddChapter}
                                    disabled={editMode || loading}
                                >
                                    Add Chapter
                                </Button>
                            </Box>

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

                    {/* Model selection */}
                    <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
                        <InputLabel id="cover-model-label">AI Model</InputLabel>
                        <Select
                            labelId="cover-model-label"
                            value={selectedModel}
                            label="AI Model"
                            onChange={(e) =>
                                setSelectedModel(e.target.value as ModelType)
                            }
                            disabled={generatingCover}
                        >
                            {availableModels.map((model) => (
                                <MenuItem key={model} value={model}>
                                    {model}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Cover image prompt"
                        value={coverPrompt}
                        onChange={(e) => setCoverPrompt(e.target.value)}
                        placeholder="Example: A mysterious dark fantasy forest with glowing runes, epic book cover style, cinematic lighting"
                        disabled={generatingCover}
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
                        onClick={() => {
                            setOpenGenerateDialog(false);
                            // Optional: reset model to default when closing
                            // setSelectedModel('imagen-4.0-generate-001');
                        }}
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
                        onClick={handleGenerateCover}
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
