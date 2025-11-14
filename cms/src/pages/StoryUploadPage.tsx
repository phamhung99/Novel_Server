import { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    OutlinedInput,
    Checkbox,
    ListItemText,
} from '@mui/material';
import axios from '../api/axios';

const StoryType = {
    NOVEL: 'novel',
    SHORT_STORY: 'short_story',
    FANFICTION: 'fanfiction',
    POETRY: 'poetry',
    COMIC: 'comic',
} as const;

type StoryType = (typeof StoryType)[keyof typeof StoryType];

const StoryVisibility = {
    PUBLIC: 'public',
    PRIVATE: 'private',
    UNLISTED: 'unlisted',
} as const;

type StoryVisibility = (typeof StoryVisibility)[keyof typeof StoryVisibility];

const GENRES = ['Action', 'Romance', 'Fantasy', 'Sci-Fi', 'Horror', 'Comedy'];

interface CreateStoryForm {
    title: string;
    synopsis?: string;
    type: StoryType;
    genres: string[];
    visibility: StoryVisibility;
    coverImage?: File;
}

export default function StoryUploadPage() {
    const [form, setForm] = useState<CreateStoryForm>({
        title: '',
        synopsis: '',
        type: StoryType.NOVEL,
        genres: [],
        visibility: StoryVisibility.PUBLIC,
    });
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setForm({ ...form, coverImage: e.target.files[0] });
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.type || !form.visibility) {
            setErrorMsg('Please fill all required fields');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title);
        if (form.synopsis) formData.append('synopsis', form.synopsis);
        formData.append('type', form.type);
        formData.append('visibility', form.visibility);
        form.genres.forEach((g) => formData.append('genres[]', g));
        if (form.coverImage) formData.append('coverImage', form.coverImage);

        try {
            setUploading(true);
            setErrorMsg('');
            setSuccessMsg('');

            await axios.post('/api/v1/story', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSuccessMsg('Story created successfully!');
            setForm({
                title: '',
                synopsis: '',
                type: StoryType.NOVEL,
                genres: [],
                visibility: StoryVisibility.PUBLIC,
            });
        } catch (err: any) {
            console.log(err?.response?.data?.message);

            setErrorMsg(err?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box
            p={4}
            maxWidth={600}
            mx="auto"
            display="flex"
            flexDirection="column"
            gap={2}
        >
            <Typography variant="h5" mb={2}>
                Create New Story
            </Typography>

            <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                fullWidth
            />

            <TextField
                label="Synopsis"
                value={form.synopsis}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
                multiline
                rows={4}
                fullWidth
            />

            <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                    value={form.type}
                    onChange={(e) =>
                        setForm({ ...form, type: e.target.value as StoryType })
                    }
                    label="Type"
                >
                    {Object.values(StoryType).map((t) => (
                        <MenuItem key={t} value={t}>
                            {t.charAt(0).toUpperCase() + t.slice(1)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Genres</InputLabel>
                <Select
                    multiple
                    value={form.genres}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            genres:
                                typeof e.target.value === 'string'
                                    ? e.target.value.split(',')
                                    : e.target.value,
                        })
                    }
                    input={<OutlinedInput label="Genres" />}
                    renderValue={(selected) => selected.join(', ')}
                >
                    {GENRES.map((genre) => (
                        <MenuItem key={genre} value={genre}>
                            <Checkbox checked={form.genres.includes(genre)} />
                            <ListItemText primary={genre} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControl fullWidth>
                <InputLabel>Visibility</InputLabel>
                <Select
                    value={form.visibility}
                    onChange={(e) =>
                        setForm({
                            ...form,
                            visibility: e.target.value as StoryVisibility,
                        })
                    }
                    label="Visibility"
                >
                    {Object.values(StoryVisibility).map((v) => (
                        <MenuItem key={v} value={v}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <Button variant="contained" component="label">
                Upload Cover Image
                <input type="file" hidden onChange={handleFileChange} />
            </Button>
            {form.coverImage && (
                <Typography>Selected: {form.coverImage.name}</Typography>
            )}

            {uploading ? (
                <CircularProgress />
            ) : (
                <Button variant="contained" onClick={handleSubmit}>
                    Create Story
                </Button>
            )}

            {successMsg && (
                <Typography color="success.main">{successMsg}</Typography>
            )}
            {errorMsg && <Typography color="error.main">{errorMsg}</Typography>}
        </Box>
    );
}
