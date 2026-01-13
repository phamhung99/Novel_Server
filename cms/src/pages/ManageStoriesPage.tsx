import { useState, useMemo, useEffect } from 'react';
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
    Button,
    TextField,
    InputAdornment,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/app.constants';
import { useStories } from '../hooks/useStories';
import { useStoryActions } from '../hooks/useStoryActions';
import { StoryTable } from '../components/StoryTable';
import { StoryMenu } from '../components/StoryMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import ConfirmDialogWithInput from '../components/ConfirmDialogWithInput';
import SearchIcon from '@mui/icons-material/Search';
import { useDebounce } from '../hooks/useDebounce';

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

    const [aiFilter, setAiFilter] = useState<'all' | 'manual' | 'ai'>('all');
    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const navigate = useNavigate();

    const userId = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.id || '';
        } catch {
            return '';
        }
    }, []);

    const debouncedKeyword = useDebounce(searchKeyword, 500);

    const { stories, totalStories, loading, fetchStories } = useStories(
        statusFilter === 'all' ? undefined : statusFilter,
        page + 1,
        rowsPerPage,
        debouncedKeyword,
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

    const selectedStory = Array.isArray(stories)
        ? stories.find((s) => s.id === selectedStoryId) || null
        : null;

    const handleBulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Xóa ${selectedIds.length} truyện?`)) return;

        await Promise.all(selectedIds.map((id) => deleteStory(id)));
        setSelectedIds([]);
        fetchStories();
    };

    const handleBulkApprove = async () => {
        if (!selectedIds.length) return;
        await Promise.all(selectedIds.map((id) => approveStory(id)));
        setSelectedIds([]);
        fetchStories();
    };

    useEffect(() => {
        setPage(0);
    }, [debouncedKeyword]);

    useEffect(() => {
        setSelectedIds([]);
    }, [statusFilter, aiFilter, searchKeyword, page, rowsPerPage]);

    return (
        <Container>
            <Box my={4}>
                <Typography variant="h4" mb={2}>
                    Manage Stories
                </Typography>

                <Box display="flex" gap={2} flexWrap="wrap" mb={3}>
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

                    {/* AI / Manual filter */}
                    <FormControl sx={{ minWidth: 140 }}>
                        <Select
                            value={aiFilter}
                            onChange={(e) => {
                                setAiFilter(
                                    e.target.value as 'all' | 'manual' | 'ai',
                                );
                                setPage(0);
                            }}
                        >
                            <MenuItem value="all">All (AI + Manual)</MenuItem>
                            <MenuItem value="manual">Manual</MenuItem>
                            <MenuItem value="ai">AI Generated</MenuItem>
                        </Select>
                    </FormControl>

                    {/* Search */}
                    <TextField
                        placeholder="Tìm theo tên truyện..."
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        sx={{ minWidth: 280 }}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                    />

                    {/* Bulk actions */}
                    {selectedIds.length > 0 && (
                        <Box
                            ml="auto"
                            display="flex"
                            gap={1}
                            alignItems="center"
                        >
                            <Typography variant="body2" color="text.secondary">
                                Đã chọn: {selectedIds.length}
                            </Typography>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={handleBulkDelete}
                            >
                                Xóa
                            </Button>
                            {statusFilter === 'pending' && (
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={handleBulkApprove}
                                >
                                    Duyệt tất cả
                                </Button>
                            )}
                        </Box>
                    )}
                </Box>

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
                            selectedIds={selectedIds}
                            onSelectChange={setSelectedIds}
                            showAiColumn={true} // hoặc false nếu muốn ẩn cột Type
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
                            rowsPerPageOptions={[5, 10, 25, 50, 100]}
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
                        navigate(`${ROUTES.STORY_OVERVIEW}/${id}`);
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
                    approveStory: (id) => {
                        approveStory(id);

                        handleMenuClose();
                    },
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
                    generateChapter: (id) => {
                        handleMenuClose();
                        navigate(ROUTES.CHAPTER_GENERATOR, {
                            state: { storyId: id },
                        });
                    },
                    copyStoryId: (id) => {
                        navigator.clipboard.writeText(id);
                        handleMenuClose();
                    },
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
