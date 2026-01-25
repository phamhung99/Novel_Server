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
import {
    ROUTES,
    STORY_SOURCE,
    USER_ROLES,
    type StorySource,
} from '../constants/app.constants';
import { useStories } from '../hooks/useStories';
import { useStoryActions } from '../hooks/useStoryActions';
import { StoryTable } from '../components/StoryTable';
import { StoryMenu } from '../components/StoryMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import ConfirmDialogWithInput from '../components/ConfirmDialogWithInput';
import SearchIcon from '@mui/icons-material/Search';
import { useDebounce } from '../hooks/useDebounce';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { openInNewTab } from '../utils/openInNewTab';

const ManageStories = () => {
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

    const [bulkActionLoading, setBulkActionLoading] = useState(false);
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

    const [aiFilter, setAiFilter] = useState<StorySource>(STORY_SOURCE.ALL);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [sort, setSort] = useState<string>('createdAt');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const [bulkRequestResult, setBulkRequestResult] = useState<{
        open: boolean;
        message: string;
        requestedCount: number;
        failedCount: number;
        failedDetails?: Record<string, string>;
    } | null>(null);

    const navigate = useNavigate();

    const user = useMemo(() => {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user;
        } catch {
            return {};
        }
    }, []);

    const debouncedKeyword = useDebounce(searchKeyword, 500);

    const { stories, totalStories, loading, fetchStories } = useStories(
        statusFilter === 'all' ? undefined : statusFilter,
        page + 1,
        rowsPerPage,
        debouncedKeyword,
        aiFilter === STORY_SOURCE.ALL ? undefined : aiFilter,
        sort,
    );

    const selectedStory = useMemo(
        () => stories?.find((s) => s.id === selectedStoryId) ?? null,
        [stories, selectedStoryId],
    );

    const {
        deleteStory,
        restoreStory,
        approveStory,
        rejectStory,
        unpublishStory,
        bulkDeleteStories,
        bulkApproveStories,
        bulkRequestPublication,
    } = useStoryActions(user.id, fetchStories);

    const handleBulkRequestPublication = () => {
        if (!selectedIds.length) return;

        setConfirmDialog({
            open: true,
            title: `Request publication for ${selectedIds.length} stories?`,
            content:
                'This will send a publication request to admins/moderators.',
            onConfirm: async () => {
                setBulkActionLoading(true);

                try {
                    const result = await bulkRequestPublication(selectedIds);

                    setBulkRequestResult({
                        open: true,
                        message: result.message,
                        requestedCount: result.requestedCount,
                        failedCount: result.failedCount,
                        failedDetails: result.failedDetails,
                    });

                    setSelectedIds([]);
                } catch (err: any) {
                    setErrorMessage(
                        err?.message || 'Bulk request publication failed',
                    );
                } finally {
                    setBulkActionLoading(false);
                    setConfirmDialog((prev) => ({ ...prev, open: false }));
                }
            },
        });
    };

    const handleBulkApprove = () => {
        if (!selectedIds.length) return;

        setConfirmDialog({
            open: true,
            title: `Approve ${selectedIds.length} stories?`,
            content: 'This action will make them publicly visible.',
            onConfirm: async () => {
                setBulkActionLoading(true);
                try {
                    await bulkApproveStories(selectedIds);
                    setSelectedIds([]);
                    setConfirmDialog((p) => ({ ...p, open: false }));
                } catch (err: any) {
                    setErrorMessage(err?.message || 'Bulk approve failed');
                } finally {
                    setBulkActionLoading(false);
                }
            },
        });
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

    const withErrorHandling = async (action: () => Promise<void>) => {
        try {
            await action();
            setErrorMessage(null);
        } catch (err: any) {
            setErrorMessage(
                err?.message || 'Connection error or unknown error',
            );
        }
    };

    const handleBulkDelete = () =>
        withErrorHandling(async () => {
            if (!selectedIds.length) return;
            if (!window.confirm(`Delete ${selectedIds.length} stories?`))
                return;
            await bulkDeleteStories(selectedIds);
            setSelectedIds([]);
        });

    const handleAiFilterChange = (e: any) => {
        setAiFilter(e.target.value as StorySource);
        setPage(0);
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
                            <MenuItem value="me">My Stories</MenuItem>
                            <MenuItem value="public">Public</MenuItem>
                            <MenuItem value="pending">Pending</MenuItem>
                            <MenuItem value="deleted">Deleted</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl
                        sx={{ minWidth: 180 }}
                        disabled={statusFilter !== 'all'}
                    >
                        <Select
                            value={aiFilter}
                            onChange={handleAiFilterChange}
                        >
                            <MenuItem value={STORY_SOURCE.ALL}>
                                All (AI + Manual)
                            </MenuItem>
                            <MenuItem value={STORY_SOURCE.MANUAL}>
                                Manual
                            </MenuItem>
                            <MenuItem value={STORY_SOURCE.AI}>
                                AI Generated
                            </MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        placeholder="Search by story title..."
                        value={searchKeyword}
                        disabled={statusFilter !== 'all'}
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

                    {selectedIds.length > 0 && (
                        <Box
                            ml="auto"
                            display="flex"
                            gap={1}
                            alignItems="center"
                        >
                            <Typography variant="body2" color="text.secondary">
                                Selected: {selectedIds.length}
                            </Typography>

                            {(statusFilter === 'pending' ||
                                statusFilter === 'me') &&
                                user.role === USER_ROLES.ADMIN && (
                                    <Button
                                        variant="contained"
                                        color="success"
                                        size="small"
                                        onClick={handleBulkApprove}
                                        disabled={bulkActionLoading}
                                    >
                                        Approve Selected
                                    </Button>
                                )}

                            {statusFilter === 'me' &&
                                user.role === USER_ROLES.EDITOR && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="small"
                                        onClick={handleBulkRequestPublication}
                                        disabled={bulkActionLoading}
                                    >
                                        Request Publication
                                    </Button>
                                )}

                            {statusFilter !== 'deleted' && (
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={handleBulkDelete}
                                    disabled={
                                        bulkActionLoading ||
                                        statusFilter === 'deleted'
                                    }
                                >
                                    Delete
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
                        No stories found
                    </Typography>
                ) : (
                    <Paper>
                        <StoryTable
                            stories={stories}
                            onMenuOpen={handleMenuOpen}
                            selectedIds={selectedIds}
                            onSelectChange={setSelectedIds}
                            showAiColumn={true}
                            sort={sort}
                            onSortChange={setSort}
                            onRowDoubleClick={(storyId) => {
                                openInNewTab(
                                    `${ROUTES.STORY_OVERVIEW}/${storyId}`,
                                );
                            }}
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
                            rowsPerPageOptions={[20, 50, 100, 200]}
                        />
                    </Paper>
                )}
            </Box>
            <StoryMenu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
                story={selectedStory}
                user={user}
                actions={{
                    viewDetails: (id) => {
                        handleMenuClose();
                        navigate(`${ROUTES.STORY_OVERVIEW}/${id}`);
                    },
                    deleteStory: (id: string) =>
                        setConfirmDialog({
                            open: true,
                            title: 'Delete Story?',
                            content: 'This action cannot be undone.',
                            onConfirm: () =>
                                withErrorHandling(async () => {
                                    await deleteStory(id);
                                    setConfirmDialog((p) => ({
                                        ...p,
                                        open: false,
                                    }));
                                }),
                        }),
                    restoreStory: (id) => restoreStory(id),
                    approveStory: (id: string) =>
                        withErrorHandling(async () => {
                            await approveStory(id);
                            handleMenuClose();
                        }),
                    rejectStory: (id: string) =>
                        setInputDialog({
                            open: true,
                            title: 'Reject Story?',
                            content: 'Please enter the reason for rejection',
                            inputLabel: 'Reason',
                            onConfirm: (reason: string) =>
                                withErrorHandling(async () => {
                                    if (!reason.trim()) {
                                        alert('Please enter a reason');
                                        return;
                                    }
                                    await rejectStory(id, reason);
                                    setInputDialog((p) => ({
                                        ...p,
                                        open: false,
                                    }));
                                }),
                        }),
                    unpublishStory: (id: string) =>
                        withErrorHandling(async () => {
                            await unpublishStory(id);
                            handleMenuClose();
                        }),
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
            <Snackbar
                open={!!errorMessage}
                autoHideDuration={6000}
                onClose={() => setErrorMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setErrorMessage(null)}
                    severity="error"
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {errorMessage}
                </Alert>
            </Snackbar>

            <Snackbar
                open={bulkRequestResult?.open ?? false}
                autoHideDuration={8000}
                onClose={() => setBulkRequestResult(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setBulkRequestResult(null)}
                    severity={
                        bulkRequestResult?.failedCount ? 'warning' : 'success'
                    }
                    sx={{ width: '100%' }}
                    variant="filled"
                    action={
                        bulkRequestResult?.failedCount ? (
                            <Button
                                color="inherit"
                                size="small"
                                onClick={() => {
                                    console.log(
                                        bulkRequestResult.failedDetails,
                                    );
                                }}
                            >
                                Details
                            </Button>
                        ) : undefined
                    }
                >
                    {bulkRequestResult && (
                        <>
                            {bulkRequestResult.message}
                            {bulkRequestResult.failedCount > 0 &&
                                ` (${bulkRequestResult.failedCount} failed)`}
                        </>
                    )}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ManageStories;
