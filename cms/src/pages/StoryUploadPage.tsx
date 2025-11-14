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

export default function StoryWizardPage() {
    const [step, setStep] = useState(1);

    // Step 1
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverUrl, setCoverUrl] = useState('');
    const [uploadingCover, setUploadingCover] = useState(false);

    // Step 2
    const [form, setForm] = useState({
        title: '',
        synopsis: '',
        type: StoryType.NOVEL as StoryType,
        genres: [] as string[],
        visibility: StoryVisibility.PUBLIC as StoryVisibility,
    });

    const [submitting, setSubmitting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    // ===== Step 1: Upload cover image =====
    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverFile(e.target.files[0]);
        }
    };

    const uploadCover = async () => {
        if (!coverFile) return;
        const data = new FormData();
        data.append('coverImage', coverFile);

        try {
            setUploadingCover(true);
            setErrorMsg('');
            setSuccessMsg('');

            // giả sử BE trả về { url: "https://..." }
            const res = await axios.post('/api/v1/story/upload-cover', data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setCoverUrl(res.data.url);
            setSuccessMsg('Cover uploaded successfully!');
            setStep(2);
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err?.response?.data?.message || 'Upload failed');
        } finally {
            setUploadingCover(false);
        }
    };

    // ===== Step 2: Submit story form =====
    const handleSubmitStory = async () => {
        if (!form.title || !form.type || !form.visibility) {
            setErrorMsg('Please fill all required fields');
            return;
        }

        try {
            setSubmitting(true);
            setErrorMsg('');
            setSuccessMsg('');

            await axios.post('/api/v1/story', {
                ...form,
                coverImage: coverUrl, // dùng url từ bước 1
            });

            setSuccessMsg('Story created successfully!');
            setForm({
                title: '',
                synopsis: '',
                type: StoryType.NOVEL,
                genres: [],
                visibility: StoryVisibility.PUBLIC,
            });
            setCoverFile(null);
            setCoverUrl('');
            setStep(1);
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err?.response?.data?.message || 'Submission failed');
        } finally {
            setSubmitting(false);
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
                {step === 1
                    ? 'Step 1: Upload Cover Image'
                    : 'Step 2: Fill Story Details'}
            </Typography>

            {step === 1 && (
                <>
                    <Button variant="contained" component="label">
                        Select Cover Image
                        <input
                            type="file"
                            hidden
                            onChange={handleCoverChange}
                        />
                    </Button>
                    {coverFile && (
                        <Typography>Selected: {coverFile.name}</Typography>
                    )}
                    {coverFile && (
                        <Box mt={2}>
                            {uploadingCover ? (
                                <CircularProgress />
                            ) : (
                                <Button
                                    variant="contained"
                                    onClick={uploadCover}
                                >
                                    Upload & Next
                                </Button>
                            )}
                        </Box>
                    )}
                </>
            )}

            {step === 2 && (
                <>
                    {coverUrl && (
                        <Box mb={2}>
                            <Typography>Cover Preview:</Typography>
                            <img
                                src={coverUrl}
                                alt="cover"
                                style={{
                                    width: '100%',
                                    maxHeight: 300,
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}

                    <TextField
                        label="Title"
                        value={form.title}
                        onChange={(e) =>
                            setForm({ ...form, title: e.target.value })
                        }
                        required
                        fullWidth
                    />
                    <TextField
                        label="Synopsis"
                        value={form.synopsis}
                        onChange={(e) =>
                            setForm({ ...form, synopsis: e.target.value })
                        }
                        multiline
                        rows={4}
                        fullWidth
                    />

                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Type</InputLabel>
                        <Select
                            value={form.type}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    type: e.target.value as StoryType,
                                })
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

                    <FormControl fullWidth sx={{ mt: 2 }}>
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
                                    <Checkbox
                                        checked={form.genres.includes(genre)}
                                    />
                                    <ListItemText primary={genre} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Visibility</InputLabel>
                        <Select
                            value={form.visibility}
                            onChange={(e) =>
                                setForm({
                                    ...form,
                                    visibility: e.target
                                        .value as StoryVisibility,
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

                    <Box mt={3} display="flex" gap={2}>
                        <Button variant="outlined" onClick={() => setStep(1)}>
                            Back
                        </Button>
                        {submitting ? (
                            <CircularProgress />
                        ) : (
                            <Button
                                variant="contained"
                                onClick={handleSubmitStory}
                            >
                                Submit Story
                            </Button>
                        )}
                    </Box>
                </>
            )}

            {successMsg && (
                <Typography color="success.main">{successMsg}</Typography>
            )}
            {errorMsg && <Typography color="error.main">{errorMsg}</Typography>}
        </Box>
    );
}
