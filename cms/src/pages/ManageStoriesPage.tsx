import React, { useEffect, useState } from 'react';
import axios from '../api/axios';
import {
    Box,
    Button,
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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/app.constants';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import { IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import type { StoryDto } from '../types/app';

const ManageStories = () => {
    const [stories, setStories] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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

    const formatAuthor = (author) => {
        if (!author) return 'N/A';
        return author.firstName || author.lastName
            ? `${author.firstName || ''} ${author.lastName || ''}`.trim()
            : author.username || 'N/A';
    };

    const formatGenres = (genres) => {
        if (!genres || genres.length === 0) return 'N/A';
        return genres.map((g) => (
            <Chip key={g} label={g} size="small" sx={{ mr: 0.5 }} />
        ));
    };

    const deleteStory = async (id) => {
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

    const restoreStory = async (id) => {
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
                                                color="primary"
                                                onClick={() =>
                                                    navigate(
                                                        `${ROUTES.STORY_DETAILS}/${story.id}`,
                                                    )
                                                }
                                            >
                                                <VisibilityIcon />
                                            </IconButton>

                                            {story.deletedAt !== null ? (
                                                <IconButton
                                                    color="success"
                                                    onClick={() =>
                                                        restoreStory(story.id)
                                                    }
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: 'bold',
                                                        }}
                                                    >
                                                        <RestoreIcon />
                                                    </span>
                                                </IconButton>
                                            ) : (
                                                <IconButton
                                                    color="error"
                                                    onClick={() =>
                                                        deleteStory(story.id)
                                                    }
                                                >
                                                    <DeleteIcon />
                                                </IconButton>
                                            )}
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
