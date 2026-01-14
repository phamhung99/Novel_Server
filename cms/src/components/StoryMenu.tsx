import { Menu, MenuItem } from '@mui/material';
import type { StoryDto } from '../types/app';

interface StoryMenuProps {
    anchorEl: HTMLElement | null;
    open: boolean;
    onClose: () => void;
    story: StoryDto | null;
    actions: {
        viewDetails: (id: string) => void;
        deleteStory: (id: string) => void;
        restoreStory: (id: string) => void;
        approveStory: (id: string) => void;
        rejectStory: (id: string) => void;
        unpublishStory: (id: string) => void;
        generateChapter: (id: string) => void;
        copyStoryId: (id: string) => void;
    };
    user: any;
}

export const StoryMenu = ({
    anchorEl,
    open,
    onClose,
    story,
    actions,
    user,
}: StoryMenuProps) => {
    if (!story) return null;

    const handleCopyId = () => {
        navigator.clipboard.writeText(story.id);
        onClose();
    };

    const isAdmin = user.role === 'admin';

    return (
        <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
            <MenuItem onClick={() => actions.viewDetails(story.id)}>
                View Details
            </MenuItem>
            <MenuItem onClick={handleCopyId}>Copy Story ID</MenuItem>
            {story.deletedAt === null && (
                <MenuItem
                    onClick={() => {
                        actions.generateChapter(story.id);
                    }}
                >
                    Generate Chapter
                </MenuItem>
            )}
            {story.deletedAt === null ? (
                <MenuItem
                    onClick={() => {
                        onClose();
                        actions.deleteStory(story.id);
                    }}
                >
                    Delete
                </MenuItem>
            ) : (
                <MenuItem
                    onClick={() => {
                        onClose();
                        actions.restoreStory(story.id);
                    }}
                >
                    Restore
                </MenuItem>
            )}

            {isAdmin &&
                (story.status === 'pending' || story.status === 'draft') && (
                    <MenuItem
                        onClick={() => {
                            onClose();
                            actions.approveStory(story.id);
                        }}
                    >
                        Approve
                    </MenuItem>
                )}

            {story.status === 'pending' && isAdmin && (
                <MenuItem
                    onClick={() => {
                        onClose();
                        actions.rejectStory(story.id);
                    }}
                >
                    Reject
                </MenuItem>
            )}

            {story.status === 'published' && (
                <MenuItem
                    onClick={() => {
                        onClose();
                        actions.unpublishStory(story.id);
                    }}
                >
                    Unpublish
                </MenuItem>
            )}
        </Menu>
    );
};
