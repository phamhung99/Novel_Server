import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import axios from '../api/axios';

type Structure = {
    summary: string;
    directions: string[];
    writingStyle: string;
    tone: string;
    plotLogic: string;
    emotionalMotif: string;
    mainCharacterArc: string;
    subCharacterArc: string;
    antagonistAction: string;
    emotionChart: string;
    philosophicalSubtheme: string;
};

type GenerateChapterResponseDto = {
    chapterId: string;
    index: number;
    title: string;
    content: string;
    structure: Structure;
    message: string;
};

const BASE_URL = `/api/v1/story`;

const ChapterGeneratorPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const storyId = location.state?.storyId as string;
    const initialChapter = location.state?.chapterData;

    const [chapters, setChapters] = useState<GenerateChapterResponseDto[]>(
        initialChapter ? [initialChapter] : [],
    );
    const [expanded, setExpanded] = useState<boolean[]>(
        Array(chapters.length).fill(false),
    );
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [chapterDirection, setChapterDirection] = useState<string>('');

    const toggleChapter = (idx: number) => {
        setExpanded((prev) => {
            const newExp = [...prev];
            newExp[idx] = !newExp[idx];
            return newExp;
        });
    };

    const handleChapterChange = (
        idx: number,
        field: keyof GenerateChapterResponseDto,
        value: string,
    ) => {
        setChapters((prev) => {
            const newChaps = [...prev];
            newChaps[idx] = { ...newChaps[idx], [field]: value };
            return newChaps;
        });
    };

    const handleStructureChange = (
        idx: number,
        field: keyof Structure,
        value: string,
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

    const generateChapter = async () => {
        const lastChapter = chapters[chapters.length - 1];
        const direction =
            chapterDirection.trim() || lastChapter?.structure?.directions?.[0];

        if (!direction) {
            setError('Please select chapter direction');
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const res = await axios.post(
                `${BASE_URL}/${storyId}/generate/chapter`,
                { direction },
            );
            const data = res.data.data as GenerateChapterResponseDto;
            setChapters((prev) => [...prev, data]);
            setChapterDirection('');
            return data;
        } catch (err: any) {
            setError(err.response?.data?.message || 'Error generating chapter');
        } finally {
            setLoading(false);
        }
    };

    const updateChapter = async (chapter: GenerateChapterResponseDto) => {
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

    useEffect(() => {
        const fetchChapters = async () => {
            try {
                const res = await axios.get(`${BASE_URL}/${storyId}/chapter`);

                setChapters(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (storyId) {
            fetchChapters();
        }
    }, [storyId]);

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {chapters.map((chap, idx) => (
                <Paper key={chap.chapterId} sx={{ mb: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            p: 2,
                            backgroundColor: 'grey.100',
                        }}
                    >
                        <Typography variant="h6">{chap.title}</Typography>
                        <IconButton onClick={() => toggleChapter(idx)}>
                            {expanded[idx] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </Box>

                    <Collapse in={expanded[idx]}>
                        <Box sx={{ p: 2 }}>
                            {/* Editable fields */}
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
                                minRows={4}
                                value={chap.content}
                                onChange={(e) =>
                                    handleChapterChange(
                                        idx,
                                        'content',
                                        e.target.value,
                                    )
                                }
                                sx={{ mb: 2 }}
                            />

                            {Object.entries(chap.structure).map(
                                ([key, value]) => {
                                    if (key === 'directions') {
                                        const isLast =
                                            idx === chapters.length - 1;
                                        if (!isLast) return null;

                                        return (
                                            <FormControl
                                                fullWidth
                                                sx={{ mb: 2 }}
                                                key={key}
                                            >
                                                <InputLabel
                                                    id={`direction-select-${idx}`}
                                                >
                                                    Directions
                                                </InputLabel>
                                                <Select
                                                    labelId={`direction-select-${idx}`}
                                                    multiple
                                                    value={value as string[]}
                                                    onChange={(e) =>
                                                        handleStructureChange(
                                                            idx,
                                                            key as keyof Structure,
                                                            e.target
                                                                .value as string,
                                                        )
                                                    }
                                                >
                                                    {(value as string[]).map(
                                                        (dir, i) => (
                                                            <MenuItem
                                                                key={i}
                                                                value={dir}
                                                            >
                                                                {dir}
                                                            </MenuItem>
                                                        ),
                                                    )}
                                                </Select>
                                            </FormControl>
                                        );
                                    } else {
                                        return (
                                            <TextField
                                                key={key}
                                                fullWidth
                                                label={key
                                                    .replace(/([A-Z])/g, ' $1')
                                                    .replace(/^./, (str) =>
                                                        str.toUpperCase(),
                                                    )}
                                                value={value as string}
                                                onChange={(e) =>
                                                    handleStructureChange(
                                                        idx,
                                                        key as keyof Structure,
                                                        e.target.value,
                                                    )
                                                }
                                                sx={{ mb: 2 }}
                                            />
                                        );
                                    }
                                },
                            )}

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={() => updateChapter(chap)}
                                disabled={loading}
                                sx={{
                                    display: 'block',
                                    mx: 'auto',
                                    mt: 2,
                                }}
                            >
                                {loading ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    'Update Chapter'
                                )}
                            </Button>
                        </Box>
                    </Collapse>
                </Paper>
            ))}

            <Box
                sx={{
                    mt: 5,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <FormControl sx={{ minWidth: 320 }}>
                    <InputLabel id="chapter-direction-label">
                        Chapter Direction
                    </InputLabel>
                    <Select
                        labelId="chapter-direction-label"
                        value={chapterDirection}
                        label="Chapter Direction"
                        onChange={(e) => setChapterDirection(e.target.value)}
                    >
                        {chapters[
                            chapters.length - 1
                        ]?.structure?.directions?.map(
                            (dir: string, i: number) => (
                                <MenuItem key={i} value={dir}>
                                    {dir}
                                </MenuItem>
                            ),
                        )}
                    </Select>
                </FormControl>

                <Button
                    variant="contained"
                    onClick={generateChapter}
                    disabled={loading}
                    sx={{ width: 320 }}
                >
                    {loading ? (
                        <CircularProgress size={24} />
                    ) : (
                        'Generate Chapter'
                    )}
                </Button>
            </Box>
        </Container>
    );
};

export default ChapterGeneratorPage;
