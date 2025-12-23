import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    IconButton,
    Chip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { StoryDto } from '../types/app';

interface StoryTableProps {
    stories: StoryDto[];
    onMenuOpen: (
        event: React.MouseEvent<HTMLButtonElement>,
        storyId: string,
    ) => void;
}

export const StoryTable = ({ stories, onMenuOpen }: StoryTableProps) => {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Title</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Genres</TableCell>
                    <TableCell>Views</TableCell>
                    <TableCell>Likes</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell>Updated At</TableCell>
                    <TableCell>Actions</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {stories.map((story) => (
                    <TableRow key={story.id}>
                        <TableCell>{story.title}</TableCell>
                        <TableCell>
                            {story.author
                                ? `${story.author.firstName || ''} ${story.author.lastName || ''}`.trim() ||
                                  story.author.username
                                : 'N/A'}
                        </TableCell>
                        <TableCell>{story.type}</TableCell>
                        <TableCell>
                            {story?.mainCategory?.name ? (
                                <Chip label={story?.mainCategory?.name} />
                            ) : (
                                'N/A'
                            )}
                        </TableCell>
                        <TableCell>{story.viewsCount || 0}</TableCell>
                        <TableCell>
                            <strong>{story.likesCount || 0}</strong>{' '}
                            {/* Giả sử field là likes hoặc likes */}
                        </TableCell>
                        <TableCell>{story.rating ?? 'N/A'}</TableCell>
                        <TableCell>{story.status}</TableCell>
                        <TableCell>
                            {new Date(story.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            {new Date(story.updatedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                            <IconButton
                                onClick={(e) => onMenuOpen(e, story.id)}
                            >
                                <MoreVertIcon />
                            </IconButton>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};
