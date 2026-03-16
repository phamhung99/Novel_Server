// src/pages/AiChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Paper,
    TextField,
    IconButton,
    Typography,
    CircularProgress,
    Avatar,
    Divider,
    useTheme,
    Drawer,
    List,
    ListItem,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Slider,
    Tooltip,
    AppBar,
    Toolbar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import axios from '../api/axios';
import { POLL_INTERVAL } from '../constants/app.constants';
import { v4 as uuidv4 } from 'uuid';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

type AiProvider = 'grok' | 'gpt' | 'gemini';

interface AiSettings {
    systemPrompt: string;
    aiProvider: AiProvider;
    model: string;
    maxTokens: number;
}

const DEFAULT_SETTINGS: AiSettings = {
    systemPrompt: 'You are a helpful AI assistant.',
    aiProvider: 'gemini',
    model: 'gemini-2.5-flash',
    maxTokens: 2048,
};

const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string }[]> = {
    gemini: [
        {
            value: 'gemini-3.1-pro-preview',
            label: 'Gemini 3.1 Pro (latest flagship)',
        },
        {
            value: 'gemini-3.1-flash-lite-preview',
            label: 'Gemini 3.1 Flash Lite (fast, cost-efficient)',
        },
        {
            value: 'gemini-2.5-pro',
            label: 'Gemini 2.5 Pro (older flagship)',
        },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (older stable)' },
    ],
    gpt: [
        { value: 'gpt-5-nano', label: 'GPT-5 nano (fastest & cheapest)' },
        {
            value: 'gpt-5.2',
            label: 'GPT-5.2 (latest frontier, best for coding & agentic)',
        },
        { value: 'gpt-5-mini', label: 'GPT-5 mini (faster, cost-efficient)' },
    ],
    grok: [
        {
            value: 'grok-4-1-fast-reasoning',
            label: 'Grok 4.1 Fast (latest, reasoning + agentic)',
        },
        {
            value: 'grok-4-1-fast-non-reasoning',
            label: 'Grok 4.1 Fast Non-Reasoning (faster variant)',
        },
        { value: 'grok-4', label: 'Grok 4 (previous flagship)' },
        { value: 'grok-4-fast', label: 'Grok 4 Fast (optimized speed)' },
    ],
};

export default function AiChat() {
    const theme = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Settings ────────────────────────────────────────────────
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<AiSettings>(() => {
        const saved = localStorage.getItem('aiChatSettings');
        return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    });

    useEffect(() => {
        localStorage.setItem('aiChatSettings', JSON.stringify(settings));
    }, [settings]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const pollResult = async (
        requestId: string,
    ): Promise<{ content: string }> => {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 30;
            const interval = setInterval(async () => {
                attempts++;
                try {
                    const res = await axios.get(
                        `/api/v1/ai/generate/result?requestId=${requestId}`,
                    );
                    if (res.data?.data) {
                        clearInterval(interval);
                        resolve(res.data.data);
                    }
                } catch (err: any) {
                    if (err.response?.status !== 202) {
                        clearInterval(interval);
                        reject(err);
                    }
                }
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    reject(new Error('Timeout waiting for AI response'));
                }
            }, POLL_INTERVAL);
        });
    };

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMessage: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const payload = {
                prompt: userMessage.content,
                systemPrompt: settings.systemPrompt,
                aiProvider: settings.aiProvider,
                maxTokens: settings.maxTokens,
            };

            const requestId = uuidv4();

            axios.post(`/api/v1/ai/generate?requestId=${requestId}`, payload, {
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await pollResult(requestId);

            const content = data.content;

            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: content,
                    timestamp: new Date(),
                },
            ]);
        } catch (error) {
            console.error('AI request failed:', error);
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        'Sorry, something went wrong. Please try again later. 😔',
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: theme.palette.mode === 'dark' ? '#0f0f11' : '#f8fafc',
                position: 'relative',
            }}
        >
            {/* Header with settings button */}
            <AppBar position="static" elevation={2}>
                <Toolbar sx={{ justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SmartToyOutlinedIcon fontSize="large" />
                        <Typography variant="h6" fontWeight={600}>
                            AI Assistant
                        </Typography>
                    </Box>

                    <Tooltip title="Settings">
                        <IconButton
                            color="inherit"
                            onClick={() => setSettingsOpen(true)}
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </Toolbar>
            </AppBar>

            {/* Messages Area */}
            <Box
                sx={{
                    flex: 1,
                    overflowY: 'auto',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                }}
            >
                {messages.length === 0 && !loading && (
                    <Box
                        sx={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Typography variant="body1" align="center">
                            Start a conversation by typing a message below...
                        </Typography>
                    </Box>
                )}

                {messages.map((msg, index) => (
                    <Box
                        key={index}
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            flexDirection:
                                msg.role === 'user' ? 'row-reverse' : 'row',
                            gap: 2,
                            maxWidth: '85%',
                            alignSelf:
                                msg.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                    >
                        <Avatar
                            sx={{
                                bgcolor:
                                    msg.role === 'user'
                                        ? 'primary.main'
                                        : 'secondary.main',
                                width: 38,
                                height: 38,
                            }}
                        >
                            {msg.role === 'user' ? (
                                <PersonOutlineIcon />
                            ) : (
                                <SmartToyOutlinedIcon />
                            )}
                        </Avatar>

                        <Paper
                            elevation={1}
                            sx={{
                                p: 2.5,
                                borderRadius: 3,
                                borderTopRightRadius:
                                    msg.role === 'user' ? 0 : 12,
                                borderTopLeftRadius:
                                    msg.role === 'assistant' ? 0 : 12,
                                bgcolor:
                                    msg.role === 'user'
                                        ? 'primary.main'
                                        : 'background.paper',
                                color:
                                    msg.role === 'user'
                                        ? 'primary.contrastText'
                                        : 'text.primary',
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{
                                    whiteSpace: 'pre-wrap', // ← keep this
                                    wordBreak: 'break-word', // modern & good default
                                    overflowWrap: 'break-word', // fallback + helps some browsers
                                    hyphens: 'auto', // optional: adds soft hyphens in supported languages
                                    lineHeight: 1.6,
                                }}
                            >
                                {msg.content}
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{
                                    mt: 1.5,
                                    display: 'block',
                                    opacity: 0.7,
                                    textAlign:
                                        msg.role === 'user' ? 'right' : 'left',
                                }}
                            >
                                {msg.timestamp.toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </Typography>
                        </Paper>
                    </Box>
                ))}

                {loading && (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            pl: 6,
                        }}
                    >
                        <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <SmartToyOutlinedIcon />
                        </Avatar>
                        <CircularProgress size={24} />
                    </Box>
                )}

                <div ref={messagesEndRef} />
            </Box>

            {/* Input Area – unchanged */}
            <Paper
                elevation={3}
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderTop: `1px solid ${theme.palette.divider}`,
                }}
            >
                <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                    variant="outlined"
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 4,
                            bgcolor: 'background.paper',
                        },
                    }}
                />
                <IconButton
                    color="primary"
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    sx={{
                        width: 48,
                        height: 48,
                        bgcolor:
                            input.trim() && !loading
                                ? 'primary.main'
                                : 'action.hover',
                        color:
                            input.trim() && !loading
                                ? 'white'
                                : 'text.secondary',
                        '&:hover': { bgcolor: 'primary.dark' },
                    }}
                >
                    <SendIcon />
                </IconButton>
            </Paper>

            {/* ── Settings Drawer ──────────────────────────────────────── */}
            <Drawer
                anchor="right"
                open={settingsOpen}
                onClose={() => setSettingsOpen(false)}
                PaperProps={{
                    sx: {
                        width: { xs: '85%', sm: 420 },
                        p: 3,
                        bgcolor: 'background.default',
                    },
                }}
            >
                <Typography variant="h6" gutterBottom>
                    AI Settings
                </Typography>
                <Divider sx={{ my: 2 }} />

                <List disablePadding>
                    {/* AI Provider */}
                    <ListItem disableGutters sx={{ mt: 1 }}>
                        <FormControl fullWidth size="small">
                            <InputLabel>AI Provider</InputLabel>
                            <Select
                                value={settings.aiProvider}
                                label="AI Provider"
                                onChange={(e) => {
                                    const newProvider = e.target
                                        .value as AiProvider;
                                    // Reset model to a valid default when provider changes
                                    const defaultModel =
                                        MODEL_OPTIONS[newProvider][0]?.value ||
                                        '';
                                    setSettings((prev) => ({
                                        ...prev,
                                        aiProvider: newProvider,
                                        model: defaultModel,
                                    }));
                                }}
                            >
                                <MenuItem value="gemini">Gemini</MenuItem>
                                <MenuItem value="gpt">
                                    ChatGPT (OpenAI)
                                </MenuItem>
                                <MenuItem value="grok">Grok (xAI)</MenuItem>
                            </Select>
                        </FormControl>
                    </ListItem>

                    {/* Model – only shown if there are options */}
                    {MODEL_OPTIONS[settings.aiProvider]?.length > 0 && (
                        <ListItem disableGutters sx={{ mt: 3 }}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Model</InputLabel>
                                <Select
                                    value={settings.model}
                                    label="Model"
                                    onChange={(e) =>
                                        setSettings((prev) => ({
                                            ...prev,
                                            model: e.target.value as string,
                                        }))
                                    }
                                >
                                    {MODEL_OPTIONS[settings.aiProvider].map(
                                        (opt) => (
                                            <MenuItem
                                                key={opt.value}
                                                value={opt.value}
                                            >
                                                {opt.label}
                                            </MenuItem>
                                        ),
                                    )}
                                </Select>
                            </FormControl>
                        </ListItem>
                    )}

                    {/* Max Tokens */}
                    <ListItem disableGutters sx={{ mt: 3 }}>
                        <Box sx={{ width: '100%' }}>
                            <Typography variant="body2" gutterBottom>
                                Max tokens: {settings.maxTokens}
                            </Typography>
                            <Slider
                                value={settings.maxTokens}
                                onChange={(_, v) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        maxTokens: v as number,
                                    }))
                                }
                                min={256}
                                max={32000} // ← you can increase depending on models
                                step={256}
                                marks
                                valueLabelDisplay="auto"
                            />
                        </Box>
                    </ListItem>

                    {/* System Prompt */}
                    <ListItem
                        disableGutters
                        sx={{
                            mt: 3,
                            flexDirection: 'column',
                            alignItems: 'stretch',
                        }}
                    >
                        <Typography variant="subtitle2" gutterBottom>
                            System Prompt
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            minRows={4}
                            maxRows={8}
                            variant="outlined"
                            size="small"
                            value={settings.systemPrompt}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    systemPrompt: e.target.value,
                                }))
                            }
                            placeholder="You are a helpful, concise assistant..."
                            helperText="Instructions given to the AI at the beginning of every conversation"
                        />
                    </ListItem>
                </List>

                <Box sx={{ mt: 'auto', pt: 3 }}>
                    <Typography variant="caption" color="text.secondary">
                        Changes apply to new messages
                    </Typography>
                </Box>
            </Drawer>
        </Box>
    );
}
