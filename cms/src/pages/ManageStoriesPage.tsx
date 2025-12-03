import { useEffect, useState } from 'react';
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

const ManageStories = () => {
    const [stories, setStories] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const handleMenuOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(e.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
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

    const deleteStory = async (id: string) => {
        const confirmDelete = window.confirm('Xóa story này?');
        if (!confirmDelete) return;

        try {
            await axios.delete(`/api/v1/story/${id}`);
            fetchStories();
        } catch (err) {
            console.error(err);
            alert('Xóa thất bại');
        }
    };

    const restoreStory = async (id: string) => {
        const confirmRestore = window.confirm('Khôi phục story này?');
        if (!confirmRestore) return;

        try {
            await axios.patch(`/api/v1/story/${id}/restore`);
            fetchStories();
        } catch (err) {
            console.error(err);
            alert('Khôi phục thất bại');
        }
    };

    const approveStory = async (id: string, note?: string) => {
        try {
            await axios.post(`/api/v1/story/${id}/approve`, {
                note: note || null,
            });
            fetchStories();
        } catch (err) {
            console.error(err);
            alert('Duyệt thất bại');
        }
    };

    const rejectStory = async (id: string) => {
        const reason = prompt('Nhập lý do từ chối:');
        if (!reason?.trim()) {
            alert('Phải nhập lý do từ chối');
            return;
        }

        try {
            await axios.post(`/api/v1/story/${id}/reject`, { reason });
            fetchStories();
        } catch (err) {
            console.error(err);
            alert('Từ chối thất bại');
        }
    };

    const unpublishStory = async (id: string) => {
        const confirmUnpublish = window.confirm('Bỏ xuất bản story này?');
        if (!confirmUnpublish) return;

        try {
            await axios.post(`/api/v1/story/${id}/unpublish`);
            fetchStories();
        } catch (err) {
            console.error(err);
            alert('Bỏ xuất bản thất bại');
        }
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
                                                onClick={handleMenuOpen}
                                            >
                                                <MoreVertIcon />
                                            </IconButton>

                                            <Menu
                                                anchorEl={anchorEl}
                                                open={open}
                                                onClose={handleMenuClose}
                                            >
                                                <MenuItem
                                                    onClick={() =>
                                                        navigate(
                                                            `${ROUTES.STORY_DETAILS}/${story.id}`,
                                                        )
                                                    }
                                                >
                                                    Xem chi tiết
                                                </MenuItem>

                                                {story.deletedAt === null ? (
                                                    <MenuItem
                                                        onClick={() =>
                                                            deleteStory(
                                                                story.id,
                                                            )
                                                        }
                                                    >
                                                        Xóa
                                                    </MenuItem>
                                                ) : (
                                                    <MenuItem
                                                        onClick={() =>
                                                            restoreStory(
                                                                story.id,
                                                            )
                                                        }
                                                    >
                                                        Khôi phục
                                                    </MenuItem>
                                                )}

                                                {story.status === 'pending' && (
                                                    <>
                                                        <MenuItem
                                                            onClick={() =>
                                                                approveStory(
                                                                    story.id,
                                                                )
                                                            }
                                                        >
                                                            Duyệt
                                                        </MenuItem>
                                                        <MenuItem
                                                            onClick={() =>
                                                                rejectStory(
                                                                    story.id,
                                                                )
                                                            }
                                                        >
                                                            Từ chối
                                                        </MenuItem>
                                                    </>
                                                )}

                                                {story.status === 'public' && (
                                                    <MenuItem
                                                        onClick={() =>
                                                            unpublishStory(
                                                                story.id,
                                                            )
                                                        }
                                                    >
                                                        Bỏ xuất bản
                                                    </MenuItem>
                                                )}
                                            </Menu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Container>
    );
};

export default ManageStories;
