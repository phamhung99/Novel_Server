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

// Assuming backend returns something like this
type Category = {
    id: string;
    name: string;
    // isMain?: boolean;     // optional — depending on your actual API
    // parentId?: string;    // optional — if hierarchical
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

    const [mode, setMode] = useState<'new' | 'existing'>(
        storyIdFromUrl ? 'existing' : 'new',
    );

    // ── Existing mode ───────────────────────────────────────
    const [storyIdInput, setStoryIdInput] = useState(storyIdFromUrl || '');
    const [storyId, setStoryId] = useState(storyIdFromUrl || '');
    const [story, setStory] = useState<StoryLite | null>(null);

    // ── New mode ────────────────────────────────────────────
    const [newStoryTitle, setNewStoryTitle] = useState('');
    const [newStorySynopsis, setNewStorySynopsis] = useState('');
    const [newStoryType, setNewStoryType] = useState('novel');
    const [newStoryVisibility, setNewStoryVisibility] = useState('public');

    // Categories
    const [categories, setCategories] = useState<Category[]>([]);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [categoriesError, setCategoriesError] = useState<string | null>(null);

    const [mainCategoryId, setMainCategoryId] = useState<string>('');
    const [subCategoryIds, setSubCategoryIds] = useState<string[]>([]);

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

    // ── Load existing story ─────────────────────────────────
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

                const used = new Set(s.chapters?.map((c) => c.index) ?? []);
                let nextIndex = 1;
                while (used.has(nextIndex)) nextIndex++;
                setDrafts([{ index: nextIndex, title: '', content: '' }]);
            } catch (e: any) {
                setError(e?.response?.data?.message || 'Failed to load story');
                setStory(null);
            } finally {
                setLoading(false);
            }
        };
        fetchStory();
    }, [storyId, userId, mode]);

    // ── Load categories once ────────────────────────────────
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                setLoadingCategories(true);
                const res = await axios.get('/api/v1/story/categories', {
                    headers: { 'x-user-id': userId },
                });
                // Adjust according to your real response shape
                const cats = (res.data.data || []).sort(
                    (a: any, b: any) =>
                        (a.displayOrder || 0) - (b.displayOrder || 0),
                );
                setCategories(cats);
            } catch (err: any) {
                setCategoriesError('Failed to load categories');
                console.error(err);
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [userId]);

    const loadExistingStory = () => {
        const id = storyIdInput.trim();
        if (!id) {
            setError('Please enter a Story ID');
            return;
        }
        setStoryId(id);
        if (id !== storyIdFromUrl) {
            navigate(`${ROUTES.MANUAL_CREATION}/${id}`, { replace: true });
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
            // 1. Create story — shape matches your backend DTO
            const storyPayload = {
                title: newStoryTitle.trim(),
                synopsis: newStorySynopsis.trim() || undefined,
                type: newStoryType,
                visibility: newStoryVisibility,
                mainCategoryId,
                subCategoryIds:
                    subCategoryIds.length > 0 ? subCategoryIds : undefined,
            };

            const storyRes = await axios.post('/api/v1/story', storyPayload, {
                headers: { 'x-user-id': userId },
            });

            const newId = storyRes.data.data.id;

            // 2. Bulk create chapters
            await axios.post(`/api/v1/story/${newId}/chapter/bulk`, drafts, {
                headers: { 'x-user-id': userId },
            });

            navigate(`${ROUTES.STORY_OVERVIEW}/${newId}`);
        } catch (e: any) {
            setError(
                e?.response?.data?.message || 'Failed to create story/chapters',
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
            setError(e?.response?.data?.message || 'Failed to save chapters');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => {
        if (mode === 'new') createNewStoryAndChapters();
        else saveToExistingStory();
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
            if (!newStoryVisibility) return 'Visibility is required';
            if (!mainCategoryId) return 'Main category is required';
            if (subCategoryIds.length === 0)
                return 'At least one sub-category is recommended';
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
                return `Index ${d.index} is already used by an existing chapter`;
        }

        return null;
    };

    // ── RENDER ────────────────────────────────────────────────────────────────
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

            {/* ── New Story Info ── */}
            {mode === 'new' && (
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
                                useFlexGap // ← helps with consistent gaps when wrapping
                                sx={{
                                    flexWrap: 'wrap', // ← allows items to wrap to next line instead of overflowing
                                    alignItems: 'flex-start', // or 'center' – prevents stretching weirdness
                                }}
                            >
                                {/* Story Type */}
                                <FormControl
                                    sx={{ minWidth: 160, flex: '1 1 160px' }}
                                >
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
                                                {t.replace('_', ' ')}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                {/* Main Category */}
                                <FormControl
                                    sx={{ minWidth: 200, flex: '1 1 220px' }}
                                    error={!!categoriesError}
                                >
                                    <InputLabel>Main Category</InputLabel>
                                    <Select
                                        value={mainCategoryId}
                                        label="Main Category"
                                        onChange={(e) => {
                                            setMainCategoryId(
                                                e.target.value as string,
                                            );
                                            setSubCategoryIds([]);
                                        }}
                                        disabled={
                                            loadingCategories ||
                                            !!categoriesError
                                        }
                                    >
                                        <MenuItem value="" disabled>
                                            Select main category
                                        </MenuItem>
                                        {categories.map((cat) => (
                                            <MenuItem
                                                key={cat.id}
                                                value={cat.id}
                                            >
                                                {cat.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {categoriesError && (
                                        <Typography
                                            variant="caption"
                                            color="error"
                                            sx={{ mt: 0.5 }}
                                        >
                                            {categoriesError}
                                        </Typography>
                                    )}
                                </FormControl>

                                {/* Sub Categories */}
                                <FormControl
                                    sx={{ minWidth: 260, flex: '1 1 300px' }}
                                >
                                    <InputLabel>Sub Categories</InputLabel>
                                    <Select
                                        multiple
                                        value={subCategoryIds}
                                        label="Sub Categories"
                                        onChange={(e) =>
                                            setSubCategoryIds(
                                                e.target.value as string[],
                                            )
                                        }
                                        renderValue={(selected) =>
                                            selected.length === 0
                                                ? 'Optional — select sub-categories'
                                                : selected
                                                      .map(
                                                          (id) =>
                                                              categories.find(
                                                                  (c) =>
                                                                      c.id ===
                                                                      id,
                                                              )?.name ?? id,
                                                      )
                                                      .join(', ')
                                        }
                                        disabled={
                                            loadingCategories ||
                                            !!categoriesError ||
                                            !mainCategoryId
                                        }
                                        MenuProps={{
                                            PaperProps: {
                                                sx: { maxHeight: 320 },
                                            },
                                        }}
                                    >
                                        {categories
                                            .filter(
                                                (c) =>
                                                    !mainCategoryId ||
                                                    c.id !== mainCategoryId,
                                            )
                                            .map((cat) => (
                                                <MenuItem
                                                    key={cat.id}
                                                    value={cat.id}
                                                >
                                                    {cat.name}
                                                </MenuItem>
                                            ))}
                                    </Select>
                                </FormControl>

                                {/* Visibility */}
                                <FormControl
                                    sx={{ minWidth: 160, flex: '1 1 160px' }}
                                >
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
            )}

            {/* ── Existing Story ID Input ── */}
            {mode === 'existing' && !story && (
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
            )}

            {mode === 'existing' && story && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6">Story: {story.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                        ID: {story.id} • {story.chapters?.length || 0} chapters
                        already exist
                    </Typography>
                </Box>
            )}

            {/* ── Chapters Section ── */}
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
