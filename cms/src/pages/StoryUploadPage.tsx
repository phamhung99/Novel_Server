import { useState } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    TextField,
    Typography,
} from '@mui/material';
import axios from 'axios';

interface StoryForm {
    title: string;
    description: string;
    coverFile?: File;
}

export default function StoryUploadPage() {
    const [form, setForm] = useState<StoryForm>({ title: '', description: '' });
    const [uploading, setUploading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setForm({ ...form, coverFile: e.target.files[0] });
        }
    };

    const handleSubmit = async () => {
        if (!form.title || !form.description) {
            setErrorMsg('Title and description are required');
            return;
        }

        const formData = new FormData();
        formData.append('title', form.title);
        formData.append('description', form.description);
        if (form.coverFile) formData.append('cover', form.coverFile);

        try {
            setUploading(true);
            setErrorMsg('');
            setSuccessMsg('');
            await axios.post('/api/stories', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSuccessMsg('Story uploaded successfully!');
            setForm({ title: '', description: '' });
        } catch (err: any) {
            setErrorMsg(err?.response?.data?.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    return (
        <Box p={2} maxWidth={600} mx="auto">
            <Typography variant="h5" mb={2}>
                Upload New Story
            </Typography>

            <TextField
                label="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                fullWidth
                sx={{ mb: 2 }}
            />

            <TextField
                label="Description"
                value={form.description}
                onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                }
                multiline
                rows={4}
                fullWidth
                sx={{ mb: 2 }}
            />

            <Button variant="contained" component="label" sx={{ mb: 2 }}>
                Upload Cover
                <input type="file" hidden onChange={handleFileChange} />
            </Button>

            {form.coverFile && (
                <Typography mb={2}>Selected: {form.coverFile.name}</Typography>
            )}

            {uploading ? (
                <CircularProgress />
            ) : (
                <Button variant="contained" onClick={handleSubmit}>
                    Submit
                </Button>
            )}

            {successMsg && (
                <Typography color="success.main" mt={2}>
                    {successMsg}
                </Typography>
            )}
            {errorMsg && (
                <Typography color="error.main" mt={2}>
                    {errorMsg}
                </Typography>
            )}
        </Box>
    );
}
