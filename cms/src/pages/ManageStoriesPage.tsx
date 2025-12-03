import { useState, useMemo } from 'react';
import {
    Box,
    Container,
    FormControl,
    Select,
    MenuItem,
    CircularProgress,
    Typography,
    Paper,
    TablePagination,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/app.constants';
import { useStories } from '../hooks/useStories';
import { useStoryActions } from '../hooks/useStoryActions';
import { StoryTable } from '../components/StoryTable';
import { StoryMenu } from '../components/StoryMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import ConfirmDialogWithInput from '../components/ConfirmDialogWithInput';

const ManageStories = () => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const openMenu = Boolean(anchorEl);

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
        onConfirm: (_value: string) => {},
    });

    const navigate = useNavigate();

    const userId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || '';
        } catch {
            return '';
        }
    }, []);

    const { stories, totalStories, loading, fetchStories } = useStories(
        statusFilter,
        page,
        rowsPerPage,
    );

    const {
        deleteStory,
        restoreStory,
        approveStory,
        rejectStory,
        unpublishStory,
    } = useStoryActions(userId, fetchStories);

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

    const selectedStory = stories.find((s) => s.id === selectedStoryId) || null;

    return (
        <Container>
            <Box my={4}>
                <Typography variant="h4" mb={2}>
                    Manage Stories
                </Typography>

                <FormControl sx={{ mb: 2, minWidth: 200 }}>
                    <Select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(0);
                        }}
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
                        No stories
                    </Typography>
                ) : (
                    <Paper>
                        <StoryTable
                            stories={stories}
                            onMenuOpen={handleMenuOpen}
                        />
                        <TablePagination
                            component="div"
                            count={totalStories}
                            page={page}
                            onPageChange={(_e, newPage) => setPage(newPage)}
                            rowsPerPage={rowsPerPage}
                            onRowsPerPageChange={(e) => {
                                setRowsPerPage(parseInt(e.target.value, 10));
                                setPage(0);
                            }}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                        />
                    </Paper>
                )}
            </Box>

            <StoryMenu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                story={selectedStory}
                actions={{
                    viewDetails: (id) => {
                        handleMenuClose();
                        navigate(`${ROUTES.STORY_DETAILS}/${id}`);
                    },
                    deleteStory: (id) =>
                        setConfirmDialog({
                            open: true,
                            title: 'Delete story?',
                            content: 'Are you sure?',
                            onConfirm: async () => {
                                await deleteStory(id);
                                setConfirmDialog((prev) => ({
                                    ...prev,
                                    open: false,
                                }));
                            },
                        }),
                    restoreStory: (id) => restoreStory(id),
                    approveStory: (id) =>
                        setInputDialog({
                            open: true,
                            title: 'Approve story?',
                            content: 'Optional note',
                            inputLabel: 'Note',
                            onConfirm: async (note) => {
                                await approveStory(id, note);
                                setInputDialog((prev) => ({
                                    ...prev,
                                    open: false,
                                }));
                            },
                        }),
                    rejectStory: (id) =>
                        setInputDialog({
                            open: true,
                            title: 'Reject story?',
                            content: 'Enter reason',
                            inputLabel: 'Reason',
                            onConfirm: async (reason) => {
                                if (!reason.trim())
                                    return alert('Reason required');
                                await rejectStory(id, reason);
                                setInputDialog((prev) => ({
                                    ...prev,
                                    open: false,
                                }));
                            },
                        }),
                    unpublishStory: (id) => unpublishStory(id),
                }}
            />

            <ConfirmDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                onConfirm={confirmDialog.onConfirm}
                onClose={() =>
                    setConfirmDialog((prev) => ({ ...prev, open: false }))
                }
            />

            <ConfirmDialogWithInput
                open={inputDialog.open}
                title={inputDialog.title}
                content={inputDialog.content}
                inputLabel={inputDialog.inputLabel}
                onConfirm={inputDialog.onConfirm}
                onClose={() =>
                    setInputDialog((prev) => ({ ...prev, open: false }))
                }
            />
        </Container>
    );
};

export default ManageStories;
