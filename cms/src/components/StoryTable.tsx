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
                {stories.map((story) => (
                    <TableRow key={story.id}>
                        <TableCell>{story.id}</TableCell>
                        <TableCell>{story.title}</TableCell>
                        <TableCell>
                            {story.author
                                ? `${story.author.firstName || ''} ${story.author.lastName || ''}`.trim() ||
                                  story.author.username
                                : 'N/A'}
                        </TableCell>
                        <TableCell>{story.type}</TableCell>
                        <TableCell>
                            {story.genres?.length
                                ? story.genres.map((g) => (
                                      <Chip
                                          key={g}
                                          label={g}
                                          size="small"
                                          sx={{ mr: 0.5 }}
                                      />
                                  ))
                                : 'N/A'}
                        </TableCell>
                        <TableCell>{story.views}</TableCell>
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
