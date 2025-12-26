import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Box,
    Button,
    Container,
    Paper,
    Typography,
    TextField,
    Alert,
    CircularProgress,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Collapse,
    IconButton,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from '../api/axios';
import { v4 as uuidv4 } from 'uuid';
import {
    POLL_INITIALIZATION_DELAY,
    POLL_INTERVAL,
} from '../constants/app.constants';

type NextOption = {
    label: string;
    immediateRisk: string;
    immediateSafety: string;
    longTermPotential: string;
    longTermCost: string;
};

type ContinuityCheckpoints = {
    toneConsistency: string;
    characterConsistency: string;
    worldRulesMaintained: string;
    foreshadowingPlanted: string;
};

type CharacterStatus = {
    protagonist: string;
    keyRelationships: string;
    inventoryChanges: string;
};

type ChapterStructure = {
    chapterNumber: number;
    chapterSummary: string;
    characterStatus: CharacterStatus;
    plotAdvancements: string[];
    nextOptions: NextOption[];
    continuityCheckpoints: ContinuityCheckpoints;
};

type ChapterData = {
    chapterId: string;
    index: number;
    title: string;
    content: string;
    structure: ChapterStructure;
};

const BASE_URL = `/api/v1/story`;

const ChapterGeneratorPage: React.FC = () => {
    const location = useLocation();
    const storyId = location.state?.storyId as string;

    const [chapters, setChapters] = useState<ChapterData[]>([]);
    const [expanded, setExpanded] = useState<boolean[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [directionMode, setDirectionMode] = useState<'select' | 'custom'>(
        'select',
    );
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | ''>(
        '',
    );
    const [customDirection, setCustomDirection] = useState<string>('');

    const toggleChapter = (idx: number) => {
        setExpanded((prev) => {
            const newExp = [...prev];
            newExp[idx] = !newExp[idx];
            return newExp;
        });
    };

    const handleChapterChange = (
        idx: number,
        field: keyof ChapterData,
        value: any,
    ) => {
        setChapters((prev) => {
            const newChaps = [...prev];
            newChaps[idx] = { ...newChaps[idx], [field]: value };
            return newChaps;
        });
    };

    const handleStructureChange = (
        idx: number,
        field: keyof ChapterStructure,
        value: any,
    ) => {
        setChapters((prev) => {
            const newChaps = [...prev];
            newChaps[idx] = {
                ...newChaps[idx],
                structure: { ...newChaps[idx].structure, [field]: value },
            };
            return newChaps;
        });
    };

    const pollChapterResult = async (
        requestId: string,
    ): Promise<ChapterData> => {
        await new Promise((r) => setTimeout(r, POLL_INITIALIZATION_DELAY));
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30;
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const res = await axios.get(
                        `${BASE_URL}/generate/chapter/result`,
                        { headers: { 'x-request-id': requestId } },
                    );
                    if (res.data?.data) {
                        clearInterval(interval);
                        resolve(res.data.data);
                    }
                } catch (err: any) {
                    if (err.response?.status !== 202) {
                        clearInterval(interval);
                        reject(err);
                    }
                }
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Timeout waiting for chapter generation'));
                }
            }, POLL_INTERVAL);
        });
    };

    const generateFirstChapter = async () => {
        const requestId = uuidv4();
        try {
            setLoading(true);
            setError(null);

            axios.post(`${BASE_URL}/${storyId}/generate/chapter`, null, {
                headers: { 'x-request-id': requestId },
            });

            const newChapter = await pollChapterResult(requestId);
            setChapters([newChapter]);
            setExpanded([false]);
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                    err.message ||
                    'Error generating Chapter 1',
            );
        } finally {
            setLoading(false);
        }
    };

    const generateChapter = async () => {
        if (chapters.length === 0) {
            setError('No chapters available to continue from');
            return;
        }
        let direction: string = '';
        if (directionMode === 'custom') {
            if (!customDirection.trim()) {
                setError('Please enter a custom direction');
                return;
            }
            direction = customDirection.trim();
        } else {
            if (selectedOptionIndex === '') {
                setError('Please select a direction option');
                return;
            }
            const lastChapter = chapters[chapters.length - 1];
            direction =
                lastChapter.structure.nextOptions[selectedOptionIndex].label;
        }

        const requestId = uuidv4();
        try {
            setLoading(true);
            setError(null);

            axios.post(
                `${BASE_URL}/${storyId}/generate/chapter`,
                { direction },
                { headers: { 'x-request-id': requestId } },
            );

            const newChapter = await pollChapterResult(requestId);
            setChapters((prev) => [...prev, newChapter]);
            setExpanded((prev) => [...prev, false]);
            setSelectedOptionIndex('');
            setCustomDirection('');
            setDirectionMode('select');
        } catch (err: any) {
            setError(
                err.response?.data?.message ||
                    err.message ||
                    'Error generating chapter',
            );
        } finally {
            setLoading(false);
        }
    };

    const updateChapter = async (chapter: ChapterData) => {
        try {
            setLoading(true);
            setError(null);
            await axios.put(
                `${BASE_URL}/${storyId}/chapter/${chapter.index}`,
                chapter,
            );
            alert(`Chapter ${chapter.index} updated successfully`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error updating chapter');
        } finally {
            setLoading(false);
        }
    };

    const requestPublication = async () => {
        try {
            setLoading(true);
            setError(null);
            await axios.post(`${BASE_URL}/${storyId}/request-publication`);
            alert('Publication request sent successfully!');
        } catch (err: any) {
            setError(
                err.response?.data?.message || 'Error requesting publication',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchChapters = async () => {
            if (!storyId) return;
            try {
                setLoading(true);
                const res = await axios.get(`${BASE_URL}/${storyId}/chapter`);
                // Fix: extract the array from res.data.data
                const fetched = Array.isArray(res.data.data)
                    ? res.data.data
                    : [];
                setChapters(fetched);
                setExpanded(Array(fetched.length).fill(false));
            } catch (err) {
                console.error(err);
                setError('Failed to load chapters');
            } finally {
                setLoading(false);
            }
        };
        fetchChapters();
    }, [storyId]);

    const lastChapter = chapters[chapters.length - 1];

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {loading && chapters.length === 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
                    <CircularProgress />
                </Box>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {chapters.length === 0 && !loading && (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        mt: 8,
                    }}
                >
                    <Typography variant="h5" gutterBottom align="center">
                        Start Your Story
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        align="center"
                        sx={{ mb: 4, maxWidth: 600 }}
                    >
                        No chapters have been generated yet. Click the button
                        below to generate the first chapter automatically.
                    </Typography>
                    <Button
                        variant="contained"
                        size="large"
                        color="primary"
                        onClick={generateFirstChapter}
                        disabled={loading}
                        sx={{ minWidth: 300, py: 2 }}
                    >
                        {loading ? (
                            <CircularProgress size={28} />
                        ) : (
                            'Generate First Chapter'
                        )}
                    </Button>
                </Box>
            )}

            {/* Danh sách các chapter */}
            {chapters.map((chap, idx) => (
                <Paper key={chap.chapterId} sx={{ mb: 4 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            bgcolor: 'grey.100',
                            cursor: 'pointer',
                        }}
                        onClick={() => toggleChapter(idx)}
                    >
                        <Typography variant="h6">
                            Chapter {chap.index}: {chap.title}
                        </Typography>
                        <IconButton>
                            {expanded[idx] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </Box>

                    <Collapse in={expanded[idx]}>
                        <Box sx={{ p: 3 }}>
                            <TextField
                                fullWidth
                                label="Title"
                                value={chap.title}
                                onChange={(e) =>
                                    handleChapterChange(
                                        idx,
                                        'title',
                                        e.target.value,
                                    )
                                }
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                fullWidth
                                label="Content"
                                multiline
                                minRows={10}
                                value={chap.content}
                                onChange={(e) =>
                                    handleChapterChange(
                                        idx,
                                        'content',
                                        e.target.value,
                                    )
                                }
                                sx={{ mb: 3 }}
                            />

                            <Typography variant="subtitle1" gutterBottom>
                                Structure Details
                            </Typography>

                            <TextField
                                fullWidth
                                label="Chapter Summary"
                                multiline
                                minRows={2}
                                value={chap.structure?.chapterSummary ?? ''}
                                onChange={(e) =>
                                    handleStructureChange(
                                        idx,
                                        'chapterSummary',
                                        e.target.value,
                                    )
                                }
                                sx={{ mb: 2 }}
                            />

                            {/* You can add more structure fields here later if needed */}

                            <Box
                                sx={{
                                    mt: 3,
                                    display: 'flex',
                                    justifyContent: 'center',
                                }}
                            >
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => updateChapter(chap)}
                                    disabled={loading}
                                    size="large"
                                >
                                    {loading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        'Update Chapter'
                                    )}
                                </Button>
                            </Box>
                        </Box>
                    </Collapse>
                </Paper>
            ))}

            {/* Phần chọn direction cho chapter tiếp theo */}
            {lastChapter &&
                lastChapter.structure &&
                lastChapter.structure.nextOptions &&
                lastChapter.structure.nextOptions.length > 0 && (
                    <Paper sx={{ p: 4, mt: 5 }}>
                        <Typography variant="h6" gutterBottom>
                            Generate Next Chapter
                        </Typography>

                        <FormControl component="fieldset" sx={{ mb: 3 }}>
                            <FormLabel component="legend">
                                Direction Mode
                            </FormLabel>
                            <RadioGroup
                                row
                                value={directionMode}
                                onChange={(e) =>
                                    setDirectionMode(
                                        e.target.value as 'select' | 'custom',
                                    )
                                }
                            >
                                <FormControlLabel
                                    value="select"
                                    control={<Radio />}
                                    label="Choose from suggested options"
                                />
                                <FormControlLabel
                                    value="custom"
                                    control={<Radio />}
                                    label="Write custom direction"
                                />
                            </RadioGroup>
                        </FormControl>

                        {directionMode === 'select' ? (
                            <FormControl fullWidth>
                                <InputLabel id="next-option-label">
                                    Suggested Next Direction
                                </InputLabel>
                                <Select
                                    labelId="next-option-label"
                                    value={selectedOptionIndex}
                                    label="Suggested Next Direction"
                                    onChange={(e) =>
                                        setSelectedOptionIndex(
                                            Number(e.target.value),
                                        )
                                    }
                                >
                                    {lastChapter.structure.nextOptions.map(
                                        (opt, i) => (
                                            <MenuItem key={i} value={i}>
                                                <Box>
                                                    <strong>{opt.label}</strong>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Risk:{' '}
                                                        {opt.immediateRisk} |
                                                        Safety:{' '}
                                                        {opt.immediateSafety}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color="text.secondary"
                                                    >
                                                        Long-term:{' '}
                                                        {opt.longTermPotential}{' '}
                                                        / Cost:{' '}
                                                        {opt.longTermCost}
                                                    </Typography>
                                                </Box>
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>
                        ) : (
                            <TextField
                                fullWidth
                                label="Custom Direction"
                                multiline
                                minRows={4}
                                value={customDirection}
                                onChange={(e) =>
                                    setCustomDirection(e.target.value)
                                }
                                placeholder="Describe what should happen in the next chapter..."
                            />
                        )}

                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={generateChapter}
                                disabled={loading}
                                sx={{ minWidth: 250 }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    'Generate Next Chapter'
                                )}
                            </Button>
                        </Box>
                    </Paper>
                )}

            {/* Optional: Show a message when there are chapters but no next options yet */}
            {lastChapter &&
                (!lastChapter.structure ||
                    !lastChapter.structure.nextOptions ||
                    lastChapter.structure.nextOptions.length === 0) && (
                    <Paper sx={{ p: 4, mt: 5 }}>
                        <Typography variant="h6" gutterBottom>
                            Generate Next Chapter
                        </Typography>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 3 }}
                        >
                            No suggested directions available yet. You can still
                            write a custom direction.
                        </Typography>

                        <TextField
                            fullWidth
                            label="Custom Direction (Required)"
                            multiline
                            minRows={4}
                            value={customDirection}
                            onChange={(e) => setCustomDirection(e.target.value)}
                            placeholder="Describe what should happen in the next chapter..."
                        />

                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <Button
                                variant="contained"
                                size="large"
                                onClick={generateChapter}
                                disabled={loading || !customDirection.trim()}
                                sx={{ minWidth: 250 }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    'Generate Next Chapter'
                                )}
                            </Button>
                        </Box>
                    </Paper>
                )}

            {/* Request Publication */}
            {chapters.length > 0 && (
                <Box sx={{ mt: 6, textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={requestPublication}
                        disabled={loading}
                    >
                        {loading ? (
                            <CircularProgress size={24} />
                        ) : (
                            'Request Publication'
                        )}
                    </Button>
                </Box>
            )}
        </Container>
    );
};

export default ChapterGeneratorPage;
