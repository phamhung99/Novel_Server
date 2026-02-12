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
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import axios from '../api/axios'; // ← your axios instance

interface Message {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export default function AiChat() {
    const theme = useTheme();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

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
            };

            const res = await axios.post(
                '/api/v1/ai/generate',
                payload,
                {
                    headers: { 'Content-Type': 'application/json' },
                },
            );

            const data = res.data.data;

            const assistantMessage: Message = {
                role: 'assistant',
                content: data,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('AI request failed:', error);

            const errorMessage: Message = {
                role: 'assistant',
                content:
                    'Sorry, something went wrong. Please try again later. 😔',
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
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
            }}
        >
            {/* Header */}
            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    borderRadius: 0,
                    bgcolor: theme.palette.primary.main,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <SmartToyOutlinedIcon fontSize="large" />
                <Typography variant="h6" fontWeight={600}>
                    AI Assistant
                </Typography>
            </Paper>

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
                {messages.length === 0 && (
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
                                position: 'relative',
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
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

            {/* Input Area */}
            <Paper
                elevation={3}
                sx={{
                    p: 2,
                    borderRadius: 0,
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
                        '&:hover': {
                            bgcolor: 'primary.dark',
                        },
                    }}
                >
                    <SendIcon />
                </IconButton>
            </Paper>
        </Box>
    );
}
