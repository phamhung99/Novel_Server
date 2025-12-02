import { useState } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Paper,
} from '@mui/material';
import { ROUTES } from '../constants/app.constants';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await axios.post('/api/v1/auth/login', {
                email,
                password,
            });
            const { accessToken, user } = response.data.data;

            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('user', JSON.stringify(user));

            navigate(ROUTES.STORY_UPLOAD);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
                <Typography
                    variant="h4"
                    component="h1"
                    align="center"
                    gutterBottom
                >
                    Login
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Box
                    component="form"
                    onSubmit={handleLogin}
                    sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
                >
                    <TextField
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                    />
                    <TextField
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                    />

                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        fullWidth
                        disabled={loading}
                        startIcon={
                            loading ? <CircularProgress size={20} /> : null
                        }
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;
