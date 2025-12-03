import { useEffect, useMemo, useState } from 'react';
import axios from '../api/axios';
import {
    Box,
    Container,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Select,
    MenuItem,
    FormControl,
    CircularProgress,
    Chip,
    Menu,
    IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/app.constants';
import type { AuthorDto, StoryDto } from '../types/app';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ConfirmDialog from '../components/ConfirmDialog';
import ConfirmDialogWithInput from '../components/ConfirmDialogWithInput';

const ManageStories = () => {
    const [stories, setStories] = useState<StoryDto[]>([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        content: '',
        onConfirm: () => {},
    });

    const [inputDialog, setInputDialog] = useState({
        open: false,
        title: '',
        content: '',
        inputLabel: '',
        onConfirm: (value: string) => {},
    });

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const open = Boolean(anchorEl);

    const userId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || '';
        } catch {
            return '';
        }
    }, []);

    const openConfirm = ({
        title,
        content,
        onConfirm,
    }: {
        title: string;
        content: string;
        onConfirm: () => void | Promise<void>;
    }) => {
        setConfirmDialog({
            open: true,
            title,
            content,
            onConfirm: () => {
                onConfirm();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
            },
        });
    };

    const closeConfirm = () => {
        setConfirmDialog((prev) => ({ ...prev, open: false }));
    };

    const closeInputDialog = () => {
        setInputDialog((prev) => ({ ...prev, open: false }));
    };

    const handleMenuOpen = (
        e: React.MouseEvent<HTMLButtonElement>,
        storyId: string,
    ) => {
        setAnchorEl(e.currentTarget);
        setSelectedStoryId(storyId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedStoryId(null);
    };

    const fetchStories = async () => {
        setLoading(true);
        try {
            let url = '/api/v1/story';
            if (statusFilter === 'pending') url = '/api/v1/story/pending';
            else if (statusFilter === 'deleted')
                url = '/api/v1/story/deleted/all';
            else if (statusFilter === 'public') url = '/api/v1/story/public';

            const res = await axios.get(url);
            setStories(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const openInputDialog = ({
        title,
        content,
        inputLabel,
        onConfirm,
    }: {
        title: string;
        content: string;
        inputLabel: string;
        onConfirm: (value: string) => void | Promise<void>;
    }) => {
        setInputDialog({
            open: true,
            title,
            content,
            inputLabel,
            onConfirm: async (value: string) => {
                await onConfirm(value);
                setInputDialog((prev) => ({ ...prev, open: false }));
            },
        });
    };

    useEffect(() => {
        fetchStories();
    }, [statusFilter]);

    const formatAuthor = (author: AuthorDto) => {
        if (!author) return 'N/A';
        return author.firstName || author.lastName
            ? `${author.firstName || ''} ${author.lastName || ''}`.trim()
            : author.username || 'N/A';
    };

    const formatGenres = (genres: string[]) => {
        if (!genres || genres.length === 0) return 'N/A';
        return genres.map((g) => (
            <Chip key={g} label={g} size="small" sx={{ mr: 0.5 }} />
        ));
    };

    const deleteStory = (id: string) => {
        openConfirm({
            title: 'Xóa story?',
            content: 'Bạn có chắc chắn muốn xóa story này?',
            onConfirm: async () => {
                try {
                    await axios.delete(`/api/v1/story/${id}`);
                    fetchStories();
                } catch (err) {
                    console.error(err);
                    alert('Xóa thất bại');
                }
            },
        });
    };

    const restoreStory = (id: string) => {
        openConfirm({
            title: 'Khôi phục story?',
            content: 'Bạn có chắc muốn khôi phục story này?',
            onConfirm: async () => {
                try {
                    await axios.patch(`/api/v1/story/${id}/restore`);
                    fetchStories();
                } catch (err) {
                    console.error(err);
                    alert('Khôi phục thất bại');
                }
            },
        });
    };

    const approveStory = (id: string) => {
        openInputDialog({
            title: 'Duyệt story?',
            content: 'Bạn có thể thêm ghi chú (tùy chọn).',
            inputLabel: 'Ghi chú',
            onConfirm: async (note) => {
                try {
                    await axios.post(
                        `/api/v1/story/${id}/approve`,
                        { note: note || null },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'x-user-id': userId,
                            },
                        },
                    );
                    fetchStories();
                } catch (err) {
                    console.error(err);
                    alert('Duyệt thất bại');
                }
            },
        });
    };

    const rejectStory = (id: string) => {
        openInputDialog({
            title: 'Từ chối story?',
            content: 'Nhập lý do từ chối.',
            inputLabel: 'Lý do từ chối',
            onConfirm: async (reason) => {
                if (!reason?.trim()) {
                    alert('Phải nhập lý do từ chối');
                    return;
                }
                try {
                    await axios.post(
                        `/api/v1/story/${id}/reject`,
                        { reason },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                                'x-user-id': userId,
                            },
                        },
                    );
                    fetchStories();
                } catch (err) {
                    console.error(err);
                    alert('Từ chối thất bại');
                }
            },
        });
    };

    const unpublishStory = (id: string) => {
        openConfirm({
            title: 'Bỏ xuất bản?',
            content: 'Story sẽ trở về trạng thái nháp.',
            onConfirm: async () => {
                try {
                    await axios.post(`/api/v1/story/${id}/unpublish`);
                    fetchStories();
                } catch (err) {
                    console.error(err);
                    alert('Bỏ xuất bản thất bại');
                }
            },
        });
    };

    return (
        <Container>
            <Box my={4}>
                <Typography variant="h4" mb={2}>
                    Manage Stories
                </Typography>

                <FormControl sx={{ mb: 2, minWidth: 200 }}>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <MenuItem value="all">All Stories</MenuItem>
                        <MenuItem value="public">Public</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="deleted">Deleted</MenuItem>
                    </Select>
                </FormControl>

                {loading ? (
                    <CircularProgress />
                ) : stories.length === 0 ? (
                    <Typography
                        variant="body1"
                        sx={{ mt: 2, color: 'text.secondary' }}
                    >
                        Không có stories
                    </Typography>
                ) : (
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Id</TableCell>
                                    <TableCell>Title</TableCell>
                                    <TableCell>Author</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Genres</TableCell>
                                    <TableCell>Views</TableCell>
                                    <TableCell>Rating</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created At</TableCell>
                                    <TableCell>Updated At</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stories.map((story: StoryDto) => (
                                    <TableRow key={story.id}>
                                        <TableCell>{story.id}</TableCell>
                                        <TableCell>{story.title}</TableCell>
                                        <TableCell>
                                            {formatAuthor(story.author)}
                                        </TableCell>
                                        <TableCell>{story.type}</TableCell>
                                        <TableCell>
                                            {formatGenres(story.genres)}
                                        </TableCell>
                                        <TableCell>{story.views}</TableCell>
                                        <TableCell>
                                            {story.rating ?? 'N/A'}
                                        </TableCell>
                                        <TableCell>{story.status}</TableCell>
                                        <TableCell>
                                            {new Date(
                                                story.createdAt,
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                story.updatedAt,
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                onClick={(e) =>
                                                    handleMenuOpen(e, story.id)
                                                }
                                            >
                                                <MoreVertIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>

            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                {selectedStoryId &&
                    (() => {
                        if (!stories || stories.length === 0) return null;

                        const story = stories.find(
                            (s: StoryDto) => s.id === selectedStoryId,
                        );

                        if (!story) return null;

                        const menuItems = [
                            <MenuItem
                                key="view-details"
                                onClick={() => {
                                    handleMenuClose();
                                    navigate(
                                        `${ROUTES.STORY_DETAILS}/${selectedStoryId}`,
                                    );
                                }}
                            >
                                Xem chi tiết
                            </MenuItem>,
                        ];

                        if (story.deletedAt === null) {
                            menuItems.push(
                                <MenuItem
                                    key="delete"
                                    onClick={() => {
                                        handleMenuClose();
                                        deleteStory(selectedStoryId);
                                    }}
                                >
                                    Xóa
                                </MenuItem>,
                            );
                        } else {
                            menuItems.push(
                                <MenuItem
                                    key="restore"
                                    onClick={() => {
                                        handleMenuClose();
                                        restoreStory(selectedStoryId);
                                    }}
                                >
                                    Khôi phục
                                </MenuItem>,
                            );
                        }

                        if (story.status === 'pending') {
                            menuItems.push(
                                <MenuItem
                                    key="approve"
                                    onClick={() => {
                                        handleMenuClose();
                                        approveStory(selectedStoryId);
                                    }}
                                >
                                    Duyệt
                                </MenuItem>,
                                <MenuItem
                                    key="reject"
                                    onClick={() => {
                                        handleMenuClose();
                                        rejectStory(selectedStoryId);
                                    }}
                                >
                                    Từ chối
                                </MenuItem>,
                            );
                        }

                        if (story.status === 'published') {
                            menuItems.push(
                                <MenuItem
                                    key="unpublish"
                                    onClick={() => {
                                        handleMenuClose();
                                        unpublishStory(selectedStoryId);
                                    }}
                                >
                                    Bỏ xuất bản
                                </MenuItem>,
                            );
                        }

                        return menuItems;
                    })()}
            </Menu>

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                onConfirm={confirmDialog.onConfirm}
                onClose={closeConfirm}
            />

            <ConfirmDialogWithInput
                open={inputDialog.open}
                title={inputDialog.title}
                content={inputDialog.content}
                inputLabel={inputDialog.inputLabel}
                onConfirm={inputDialog.onConfirm}
                onClose={closeInputDialog}
            />
        </Container>
    );
};

export default ManageStories;
