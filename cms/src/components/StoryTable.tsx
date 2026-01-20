import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Chip,
    Checkbox,
    TableSortLabel,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { StoryDto } from '../types/app';
import { STORY_STATUS } from '../constants/app.constants';

interface StoryTableProps {
    stories: StoryDto[];
    onMenuOpen: (
        event: React.MouseEvent<HTMLButtonElement>,
        storyId: string,
    ) => void;
    selectedIds: string[];
    onSelectChange: (newSelected: string[]) => void;
    showAiColumn?: boolean;
    sort: string;
    onSortChange: (newSort: string) => void;
}

export const StoryTable = ({
    stories,
    onMenuOpen,
    selectedIds,
    onSelectChange,
    showAiColumn = true,
    sort,
    onSortChange,
}: StoryTableProps) => {
    const handleSelectAllClick = (
        event: React.ChangeEvent<HTMLInputElement>,
    ) => {
        if (event.target.checked) {
            const newSelected = stories.map((n) => n.id);
            onSelectChange(newSelected);
            return;
        }
        onSelectChange([]);
    };

    const handleClick = (id: string) => {
        const selectedIndex = selectedIds.indexOf(id);
        let newSelected: string[] = [];

        if (selectedIndex === -1) {
            newSelected = newSelected.concat(selectedIds, id);
        } else if (selectedIndex === 0) {
            newSelected = newSelected.concat(selectedIds.slice(1));
        } else if (selectedIndex === selectedIds.length - 1) {
            newSelected = newSelected.concat(selectedIds.slice(0, -1));
        } else if (selectedIndex > 0) {
            newSelected = newSelected.concat(
                selectedIds.slice(0, selectedIndex),
                selectedIds.slice(selectedIndex + 1),
            );
        }

        onSelectChange(newSelected);
    };

    const isSelected = (id: string) => selectedIds.indexOf(id) !== -1;

    const getTypeLabel = (story: StoryDto) => {
        if (story.sourceType === 'AI')
            return { label: 'AI', color: 'secondary' as const };
        if (story.sourceType === 'Manual')
            return { label: 'Manual', color: 'default' as const };
        return { label: 'Unknown', color: 'default' as const };
    };

    const createSortHandler = (property: string) => () => {
        if (sort === property) {
            onSortChange(`-${property}`);
        } else if (sort === `-${property}`) {
            onSortChange('');
        } else {
            onSortChange(property);
        }
    };

    const isActive = (property: string) =>
        sort === property || sort === `-${property}`;

    const getDirection = (property: string): 'asc' | 'desc' | undefined => {
        if (sort === property) return 'asc';
        if (sort === `-${property}`) return 'desc';
        return undefined;
    };

    return (
        <Table size="small" aria-label="stories table">
            <TableHead>
                <TableRow>
                    <TableCell padding="checkbox">
                        <Checkbox
                            color="primary"
                            indeterminate={
                                selectedIds.length > 0 &&
                                selectedIds.length < stories.length
                            }
                            checked={
                                stories.length > 0 &&
                                selectedIds.length === stories.length
                            }
                            onChange={handleSelectAllClick}
                            inputProps={{
                                'aria-label': 'select all stories',
                            }}
                        />
                    </TableCell>

                    <TableCell sortDirection={getDirection('title') ?? false}>
                        <TableSortLabel
                            active={isActive('title')}
                            direction={getDirection('title')}
                            onClick={createSortHandler('title')}
                        >
                            Title
                        </TableSortLabel>
                    </TableCell>

                    <TableCell
                        sortDirection={getDirection('authorUsername') ?? false}
                    >
                        <TableSortLabel
                            active={isActive('authorUsername')}
                            direction={getDirection('authorUsername')}
                            onClick={createSortHandler('authorUsername')}
                        >
                            Author
                        </TableSortLabel>
                    </TableCell>

                    {showAiColumn && (
                        <TableCell
                            sortDirection={getDirection('sourceType') ?? false}
                        >
                            <TableSortLabel
                                active={isActive('sourceType')}
                                direction={getDirection('sourceType')}
                                onClick={createSortHandler('sourceType')}
                            >
                                Type
                            </TableSortLabel>
                        </TableCell>
                    )}

                    <TableCell
                        sortDirection={
                            getDirection('mainCategory.name') ?? false
                        }
                    >
                        <TableSortLabel
                            active={isActive('mainCategory.name')}
                            direction={getDirection('mainCategory.name')}
                            onClick={createSortHandler('mainCategory.name')}
                        >
                            Genres
                        </TableSortLabel>
                    </TableCell>

                    <TableCell
                        sortDirection={getDirection('viewsCount') ?? false}
                    >
                        <TableSortLabel
                            active={isActive('viewsCount')}
                            direction={getDirection('viewsCount')}
                            onClick={createSortHandler('viewsCount')}
                        >
                            Views
                        </TableSortLabel>
                    </TableCell>

                    <TableCell
                        sortDirection={getDirection('likesCount') ?? false}
                    >
                        <TableSortLabel
                            active={isActive('likesCount')}
                            direction={getDirection('likesCount')}
                            onClick={createSortHandler('likesCount')}
                        >
                            Likes
                        </TableSortLabel>
                    </TableCell>

                    <TableCell sortDirection={getDirection('rating') ?? false}>
                        <TableSortLabel
                            active={isActive('rating')}
                            direction={getDirection('rating')}
                            onClick={createSortHandler('rating')}
                        >
                            Rating
                        </TableSortLabel>
                    </TableCell>

                    <TableCell sortDirection={getDirection('status') ?? false}>
                        <TableSortLabel
                            active={isActive('status')}
                            direction={getDirection('status')}
                            onClick={createSortHandler('status')}
                        >
                            Status
                        </TableSortLabel>
                    </TableCell>

                    <TableCell
                        sortDirection={getDirection('createdAt') ?? false}
                    >
                        <TableSortLabel
                            active={isActive('createdAt')}
                            direction={getDirection('createdAt')}
                            onClick={createSortHandler('createdAt')}
                        >
                            Created At
                        </TableSortLabel>
                    </TableCell>

                    <TableCell
                        sortDirection={getDirection('updatedAt') ?? false}
                    >
                        <TableSortLabel
                            active={isActive('updatedAt')}
                            direction={getDirection('updatedAt')}
                            onClick={createSortHandler('updatedAt')}
                        >
                            Updated At
                        </TableSortLabel>
                    </TableCell>

                    <TableCell align="right">Actions</TableCell>
                </TableRow>
            </TableHead>

            <TableBody>
                {stories.map((story) => {
                    const isItemSelected = isSelected(story.id);
                    const typeInfo = getTypeLabel(story);

                    return (
                        <TableRow
                            hover
                            role="checkbox"
                            aria-checked={isItemSelected}
                            tabIndex={-1}
                            key={story.id}
                            selected={isItemSelected}
                            sx={{ cursor: 'pointer' }}
                            onClick={() => handleClick(story.id)}
                        >
                            <TableCell padding="checkbox">
                                <Checkbox
                                    color="primary"
                                    checked={isItemSelected}
                                    inputProps={{
                                        'aria-labelledby': `story-checkbox-${story.id}`,
                                    }}
                                />
                            </TableCell>

                            <TableCell component="th" scope="row">
                                {story.title}
                            </TableCell>

                            <TableCell>
                                {story.authorUsername
                                    ? story.authorUsername
                                    : 'N/A'}
                            </TableCell>

                            {showAiColumn && (
                                <TableCell>
                                    <Chip
                                        label={typeInfo.label}
                                        color={typeInfo.color}
                                        size="small"
                                        variant="outlined"
                                    />
                                </TableCell>
                            )}

                            <TableCell>
                                {story?.mainCategory?.name ? (
                                    <Chip
                                        label={story.mainCategory.name}
                                        size="small"
                                    />
                                ) : (
                                    'N/A'
                                )}
                            </TableCell>

                            <TableCell>{story.viewsCount || 0}</TableCell>
                            <TableCell>
                                <strong>{story.likesCount || 0}</strong>
                            </TableCell>
                            <TableCell>{story.rating ?? 'N/A'}</TableCell>
                            <TableCell>
                                <Chip
                                    label={story.status || 'unknown'}
                                    color={
                                        story.status === STORY_STATUS.PUBLISHED
                                            ? 'success'
                                            : story.status ===
                                                STORY_STATUS.PENDING
                                              ? 'warning'
                                              : 'error'
                                    }
                                    size="small"
                                />
                            </TableCell>
                            <TableCell>
                                {story.createdAt
                                    ? new Date(
                                          story.createdAt,
                                      ).toLocaleDateString('vi-VN')
                                    : '—'}
                            </TableCell>
                            <TableCell>
                                {story.updatedAt
                                    ? new Date(
                                          story.updatedAt,
                                      ).toLocaleDateString('vi-VN')
                                    : '—'}
                            </TableCell>

                            <TableCell align="right" sx={{ pr: 2, pl: 1 }}>
                                <IconButton
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMenuOpen(e, story.id);
                                    }}
                                    size="small"
                                    sx={{
                                        padding: '10px',
                                        '&:hover': {
                                            backgroundColor: 'action.hover',
                                        },
                                    }}
                                >
                                    <MoreVertIcon fontSize="small" />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};
