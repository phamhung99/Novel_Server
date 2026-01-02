import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Container,
    Divider,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../api/axios';
import { ROUTES } from '../constants/app.constants';

type ChapterDraft = {
    index: number;
    title: string;
    content: string;
};

type StoryLite = {
    id: string;
    title: string;
    chapters: { id: string; index: number; title: string }[];
};

const STORY_TYPES = [
    'novel',
    'short_story',
    'fanfiction',
    'poetry',
    'comic',
] as const;

const VISIBILITIES = ['public', 'private', 'unlisted'] as const;

const ManualChaptersPage = () => {
    const { storyId: storyIdFromUrl } = useParams<{ storyId?: string }>();
    const navigate = useNavigate();

    // Mode: 'new' or 'existing'
    const [mode, setMode] = useState<'new' | 'existing'>(
        storyIdFromUrl ? 'existing' : 'new',
    );

    // ── For existing mode ──
    const [storyIdInput, setStoryIdInput] = useState(storyIdFromUrl || '');
    const [storyId, setStoryId] = useState(storyIdFromUrl || '');
    const [story, setStory] = useState<StoryLite | null>(null);

    // ── For new mode ──
    const [newStoryTitle, setNewStoryTitle] = useState('');
    const [newStorySynopsis, setNewStorySynopsis] = useState('');
    const [newStoryType, setNewStoryType] = useState('novel');
    const [newStoryVisibility, setNewStoryVisibility] = useState('public');

    // Thay thế AVAILABLE_GENRES hard-code
    const [genresList, setGenresList] = useState<string[]>([]);
    const [loadingGenres, setLoadingGenres] = useState(true);
    const [genresError, setGenresError] = useState<string | null>(null);

    // (giữ nguyên) state cho genres đã chọn
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

    const userId = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}').id || '';
        } catch {
            return '';
        }
    }, []);

    const [loading, setLoading] = useState(!!storyIdFromUrl);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [drafts, setDrafts] = useState<ChapterDraft[]>([
        { index: 1, title: '', content: '' },
    ]);

    // Load story when storyId changes (only in existing mode)
    useEffect(() => {
        if (mode === 'new' || !storyId) {
            setStory(null);
            setLoading(false);
            return;
        }

        const fetchStory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/v1/story/${storyId}`, {
                    headers: { 'x-user-id': userId },
                });
                const s = res.data.data as StoryLite;
                setStory(s);

                // Find next available index
                const used = new Set(s.chapters?.map((c) => c.index) ?? []);
                let nextIndex = 1;
                while (used.has(nextIndex)) nextIndex++;
                setDrafts([{ index: nextIndex, title: '', content: '' }]);
            } catch (e: any) {
                setError(
                    e?.response?.data?.message ||
                        e?.message ||
                        'Failed to load story information',
                );
                setStory(null);
            } finally {
                setLoading(false);
            }
        };

        fetchStory();
    }, [storyId, userId, mode]);

    const loadExistingStory = () => {
        if (!storyIdInput.trim()) {
            setError('Please enter a Story ID');
            return;
        }
        setStoryId(storyIdInput.trim());
        if (storyIdInput.trim() !== storyIdFromUrl) {
            navigate(`${ROUTES.MANUAL_CREATION}/${storyIdInput.trim()}`, {
                replace: true,
            });
        }
    };

    const createNewStoryAndChapters = async () => {
        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // 1. Create new story
            const storyPayload = {
                title: newStoryTitle.trim(),
                synopsis: newStorySynopsis.trim() || undefined,
                type: newStoryType,
                visibility: newStoryVisibility,
                genres: [], // you can add genres input later
            };

            const storyRes = await axios.post('/api/v1/story', storyPayload, {
                headers: { 'x-user-id': userId },
            });

            const newId = storyRes.data.data.id; // assuming response shape { data: { id, ... } }

            // 2. Bulk create chapters
            await axios.post(`/api/v1/story/${newId}/chapter/bulk`, drafts, {
                headers: { 'x-user-id': userId },
            });

            // Redirect to story detail page
            navigate(`${ROUTES.STORY_OVERVIEW}/${newId}`);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    'Failed to create story/chapters',
            );
        } finally {
            setSaving(false);
        }
    };

    const saveToExistingStory = async () => {
        const msg = validate();
        if (msg) {
            setError(msg);
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await axios.post(`/api/v1/story/${storyId}/chapter/bulk`, drafts, {
                headers: { 'x-user-id': userId },
            });
            navigate(`${ROUTES.STORY_OVERVIEW}/${storyId}`);
        } catch (e: any) {
            setError(
                e?.response?.data?.message ||
                    e?.message ||
                    'Failed to create chapters',
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (mode === 'new') {
            createNewStoryAndChapters();
        } else {
            saveToExistingStory();
        }
    };

    const addRow = () => {
        const used = new Set([
            ...(story?.chapters?.map((c) => c.index) ?? []),
            ...drafts.map((d) => d.index),
        ]);
        let next = 1;
        while (used.has(next)) next++;
        setDrafts((prev) => [...prev, { index: next, title: '', content: '' }]);
    };

    const removeRow = (i: number) => {
        setDrafts((prev) => prev.filter((_, idx) => idx !== i));
    };

    const updateRow = (i: number, patch: Partial<ChapterDraft>) => {
        setDrafts((prev) =>
            prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)),
        );
    };

    const validate = (): string | null => {
        if (!userId) return 'User information not found';

        if (mode === 'new') {
            if (!newStoryTitle.trim()) return 'Story title is required';
            if (!newStoryType) return 'Story type is required';
            if (!newStoryVisibility) return 'Story visibility is required';
            if (genresList.length > 0 && selectedGenres.length === 0)
                return 'At least one genre must be selected';
        } else {
            if (!storyId) return 'Story ID is required';
            if (!story && !loading) return 'Story not found';
        }

        if (drafts.length === 0) return 'At least one chapter is required';
        const indexes = drafts.map((d) => d.index);
        if (new Set(indexes).size !== indexes.length)
            return 'Duplicate chapter indexes found';

        const usedExisting = new Set(
            story?.chapters?.map((c) => c.index) ?? [],
        );
        for (const d of drafts) {
            if (!d.title.trim()) return 'Chapter title is required';
            if (!d.content.trim()) return 'Chapter content is required';
            if (d.index < 1) return 'Chapter index must be ≥ 1';
            if (usedExisting.has(d.index))
                return `Index ${d.index} is already used`;
        }

        return null;
    };

    useEffect(() => {
        const fetchGenres = async () => {
            try {
                setLoadingGenres(true);
                const response = await axios.get(`/api/v1/story/categories`);
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
            } finally {
                setLoadingGenres(false);
            }
        };

        fetchGenres();
    }, []);

    if (loading) {
        return (
            <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Loading...</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Stack
                direction="row"
                alignItems="center"
                spacing={2}
                sx={{ mb: 4 }}
            >
                <Button
                    startIcon={<ArrowBackIcon />}
                    variant="outlined"
                    onClick={() => navigate(-1)}
                >
                    Back
                </Button>
                <Typography variant="h5" sx={{ flex: 1 }}>
                    Create Story & Chapters Manually
                </Typography>
            </Stack>

            <Card sx={{ mb: 4 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Select Mode
                    </Typography>
                    <RadioGroup
                        row
                        value={mode}
                        onChange={(e) =>
                            setMode(e.target.value as 'new' | 'existing')
                        }
                    >
                        <FormControlLabel
                            value="new"
                            control={<Radio />}
                            label="Create new story + add chapters"
                        />
                        <FormControlLabel
                            value="existing"
                            control={<Radio />}
                            label="Add chapters to existing story"
                        />
                    </RadioGroup>
                </CardContent>
            </Card>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* ── Story info section ── */}
            {mode === 'new' ? (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            New Story Information
                        </Typography>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                required
                                label="Story Title"
                                value={newStoryTitle}
                                onChange={(e) =>
                                    setNewStoryTitle(e.target.value)
                                }
                            />
                            <TextField
                                fullWidth
                                multiline
                                minRows={2}
                                label="Synopsis"
                                value={newStorySynopsis}
                                onChange={(e) =>
                                    setNewStorySynopsis(e.target.value)
                                }
                            />
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                            >
                                <FormControl sx={{ minWidth: 160 }}>
                                    <InputLabel>Story Type</InputLabel>
                                    <Select
                                        value={newStoryType}
                                        label="Story Type"
                                        onChange={(e) =>
                                            setNewStoryType(e.target.value)
                                        }
                                    >
                                        {STORY_TYPES.map((t) => (
                                            <MenuItem key={t} value={t}>
                                                {t}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControl fullWidth error={!!genresError}>
                                    <InputLabel id="genres-label">
                                        Genres
                                        {loadingGenres && ' (loading...)'}
                                    </InputLabel>

                                    <Select
                                        labelId="genres-label"
                                        multiple
                                        value={selectedGenres}
                                        onChange={(e) =>
                                            setSelectedGenres(
                                                e.target.value as string[],
                                            )
                                        }
                                        label="Genres"
                                        disabled={loadingGenres}
                                        renderValue={(selected) =>
                                            selected.length === 0
                                                ? 'Select genres'
                                                : selected.join(', ')
                                        }
                                        MenuProps={{
                                            PaperProps: {
                                                sx: { maxHeight: 300 },
                                            },
                                        }}
                                    >
                                        {genresList.map((genre) => (
                                            <MenuItem key={genre} value={genre}>
                                                {genre}
                                            </MenuItem>
                                        ))}
                                    </Select>

                                    {genresError && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                            sx={{ mt: 0.5 }}
                                        >
                                            {genresError}
                                        </Typography>
                                    )}
                                </FormControl>

                                <FormControl sx={{ minWidth: 160 }}>
                                    <InputLabel>Visibility</InputLabel>
                                    <Select
                                        value={newStoryVisibility}
                                        label="Visibility"
                                        onChange={(e) =>
                                            setNewStoryVisibility(
                                                e.target.value,
                                            )
                                        }
                                    >
                                        {VISIBILITIES.map((v) => (
                                            <MenuItem key={v} value={v}>
                                                {v}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
            ) : (
                !story && (
                    <Card sx={{ mb: 4 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Enter Existing Story ID
                            </Typography>
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                sx={{ mt: 2 }}
                            >
                                <TextField
                                    fullWidth
                                    label="Story ID"
                                    value={storyIdInput}
                                    onChange={(e) =>
                                        setStoryIdInput(e.target.value)
                                    }
                                    placeholder="e.g. 64f8a2b9c3d4e5f678901234"
                                />
                                <Button
                                    variant="contained"
                                    onClick={loadExistingStory}
                                    disabled={!storyIdInput.trim()}
                                >
                                    Load Story
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>
                )
            )}

            {/* Loaded story info (existing mode) */}
            {mode === 'existing' && story && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6">Story: {story.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        ID: {story.id} • {story.chapters?.length || 0} chapters
                        already exist
                    </Typography>
                </Box>
            )}

            {/* Chapters input (common for both modes) */}
            {(mode === 'new' || (mode === 'existing' && story)) && (
                <Card>
                    <CardContent>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 2 }}
                        >
                            <Typography variant="h6">Chapters</Typography>
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                size="small"
                                onClick={addRow}
                            >
                                Add Chapter
                            </Button>
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        <Stack spacing={3}>
                            {drafts.map((d, i) => (
                                <Box
                                    key={`${d.index}-${i}`}
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        p: 3,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Stack
                                        direction={{ xs: 'column', sm: 'row' }}
                                        spacing={2}
                                        alignItems={{ sm: 'center' }}
                                        sx={{ mb: 2 }}
                                    >
                                        <TextField
                                            type="number"
                                            label="Chapter Index"
                                            value={d.index}
                                            onChange={(e) =>
                                                updateRow(i, {
                                                    index: Number(
                                                        e.target.value,
                                                    ),
                                                })
                                            }
                                            sx={{ width: { sm: 140 } }}
                                            slotProps={{
                                                htmlInput: { min: 1 },
                                            }}
                                        />
                                        <TextField
                                            fullWidth
                                            required
                                            label="Chapter Title"
                                            value={d.title}
                                            onChange={(e) =>
                                                updateRow(i, {
                                                    title: e.target.value,
                                                })
                                            }
                                        />
                                        <IconButton
                                            color="error"
                                            onClick={() => removeRow(i)}
                                            disabled={drafts.length === 1}
                                        >
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    </Stack>
                                    <TextField
                                        fullWidth
                                        required
                                        label="Chapter Content"
                                        value={d.content}
                                        onChange={(e) =>
                                            updateRow(i, {
                                                content: e.target.value,
                                            })
                                        }
                                        multiline
                                        minRows={10}
                                        maxRows={14}
                                    />
                                </Box>
                            ))}
                        </Stack>

                        <Divider sx={{ my: 4 }} />

                        <Button
                            variant="contained"
                            color="success"
                            startIcon={<SaveIcon />}
                            fullWidth
                            size="large"
                            onClick={handleSave}
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving...'
                                : mode === 'new'
                                  ? 'Create Story & Save All Chapters'
                                  : 'Save All New Chapters'}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Container>
    );
};

export default ManualChaptersPage;
