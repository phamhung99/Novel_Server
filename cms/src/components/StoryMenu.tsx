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
    };
}

export const StoryMenu = ({
    anchorEl,
    open,
    onClose,
    story,
    actions,
}: StoryMenuProps) => {
    if (!story) return null;

    return (
        <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
            <MenuItem onClick={() => actions.viewDetails(story.id)}>
                View Details
            </MenuItem>
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
            {story.status === 'pending' && (
                <>
                    <MenuItem
                        onClick={() => {
                            onClose();
                            actions.approveStory(story.id);
                        }}
                    >
                        Approve
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            onClose();
                            actions.rejectStory(story.id);
                        }}
                    >
                        Reject
                    </MenuItem>
                </>
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
