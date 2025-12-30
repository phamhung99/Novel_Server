import { useEffect, useMemo, useState } from 'react';
import {
    Container,
    Typography,
    CircularProgress,
    TextField,
    Button,
    Divider,
    Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from '../api/axios';
import { ROUTES } from '../constants/app.constants';

interface FullChapterDto {
    id: string;
    index: number;
    title: string;
    content: string;
}

const ChapterReaderPage = () => {
    const userId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || '';
        } catch {
            return '';
        }
    }, []);
    const { storyId, index } = useParams<{ storyId: string; index: string }>();
    const location = useLocation();
    const navigate = useNavigate();

    const currentIndex = parseInt(index || '1');

    // Lấy từ state nếu có (ưu tiên cao nhất)
    const navState = location.state as {
        storyTitle?: string;
        totalChapters?: number;
        chapterIndexes?: number[];
    } | null;

    const [chapter, setChapter] = useState<FullChapterDto | null>(null);
    const [storyTitle, setStoryTitle] = useState<string>(
        navState?.storyTitle || '',
    );
    const [totalChapters, setTotalChapters] = useState<number>(
        navState?.totalChapters || 0,
    );
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        const fetchChapter = async () => {
            if (!storyId || !index) return;
            setLoading(true);
            try {
                const res = await axios.get(
                    `/api/v1/story/${storyId}/chapter/${index}`,
                    {
                        headers: {
                            'x-user-id': userId,
                        },
                    },
                );
                setChapter(res.data.data);

                // Nếu KHÔNG có state (ví dụ: user refresh trang hoặc mở link trực tiếp)
                if (!navState) {
                    const storyRes = await axios.get(
                        `/api/v1/story/${storyId}`,
                        {
                            headers: {
                                'x-user-id': userId,
                            },
                        },
                    );
                    const storyData = storyRes.data.data;
                    setStoryTitle(storyData.title);
                    setTotalChapters(storyData.chapters.length);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchChapter();
    }, [storyId, index, navState]);

    const isFirstChapter = currentIndex <= 1;
    const isLastChapter = currentIndex >= totalChapters;

    const goToChapter = (delta: number) => {
        const newIndex = currentIndex + delta;
        if (newIndex > 0 && newIndex <= totalChapters) {
            navigate(
                `${ROUTES.STORY_OVERVIEW}/${storyId}/chapters/${newIndex}`,
                {
                    state: {
                        storyTitle,
                        totalChapters,
                    },
                },
            );
        }
    };

    const handleChapterChange = (
        field: keyof FullChapterDto,
        value: string,
    ) => {
        if (!chapter) return;
        setChapter({ ...chapter, [field]: value });
    };

    if (loading)
        return (
            <CircularProgress sx={{ display: 'block', mx: 'auto', my: 8 }} />
        );
    if (!chapter)
        return <Typography align="center">Chapter not found</Typography>;

    return (
        <Container maxWidth="lg" sx={{ py: 6 }}>
            <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(`${ROUTES.STORY_OVERVIEW}/${storyId}`)}
            >
                Back to Story
            </Button>

            <Typography variant="h4" align="center" gutterBottom mt={4}>
                {storyTitle}
            </Typography>

            {editMode ? (
                <TextField
                    fullWidth
                    label="Chapter Title"
                    value={chapter.title}
                    onChange={(e) =>
                        handleChapterChange('title', e.target.value)
                    }
                    sx={{ mb: 3 }}
                />
            ) : (
                <Typography
                    variant="h5"
                    align="center"
                    gutterBottom
                    color="text.secondary"
                >
                    Chapter {chapter.index}: {chapter.title}
                </Typography>
            )}

            <Divider sx={{ my: 4 }} />

            {editMode ? (
                <>
                    <TextField
                        fullWidth
                        multiline
                        minRows={20}
                        value={chapter.content}
                        onChange={(e) =>
                            handleChapterChange('content', e.target.value)
                        }
                        sx={{ mb: 4 }}
                    />
                    <Stack direction="row" spacing={2} justifyContent="center">
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={() => setEditMode(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="contained"
                            color="success"
                            onClick={() => {
                                console.log('Save chapter:', chapter);
                                setEditMode(false);
                            }}
                        >
                            Save Chapter
                        </Button>
                    </Stack>
                </>
            ) : (
                <Typography
                    component="div"
                    variant="body1"
                    whiteSpace="pre-line"
                    sx={{
                        fontSize: '1.25rem',
                        lineHeight: 2.2,
                        maxWidth: '900px',
                        mx: 'auto',
                        textAlign: 'justify',
                    }}
                >
                    {chapter.content}
                </Typography>
            )}

            {/* Navigation - ĐÃ SỬA HOÀN CHỈNH */}
            {!editMode && (
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={8}
                >
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => goToChapter(-1)}
                        disabled={isFirstChapter}
                    >
                        Previous Chapter
                    </Button>

                    {/* Hiển thị vị trí hiện tại */}
                    <Typography
                        variant="body1"
                        color="text.primary"
                        fontWeight="medium"
                    >
                        Chapter {currentIndex} / {totalChapters}
                    </Typography>

                    <Button
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => goToChapter(1)}
                        disabled={isLastChapter}
                    >
                        Next Chapter
                    </Button>
                </Stack>
            )}

            {/* Thông báo khi đang ở chapter cuối */}
            {isLastChapter && !editMode && (
                <Typography align="center" color="text.secondary" mt={4}>
                    You're at the final chapter!
                </Typography>
            )}
        </Container>
    );
};

export default ChapterReaderPage;
