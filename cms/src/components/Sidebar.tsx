import {
    Divider,
    Drawer,
    List,
    ListItemButton,
    ListItemText,
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/app.constants';

const menuItems = [
    { label: 'Manage Users', path: ROUTES.USERS },
    { label: 'Manual Creation', path: ROUTES.MANUAL_CREATION },
    { label: 'AI Creation', path: ROUTES.STORY_UPLOAD },
    { label: 'Manage Stories', path: ROUTES.MANAGE_STORIES },
];

export default function Sidebar({
    onNavigate,
}: {
    onNavigate: (path: string) => void;
}) {
    const location = useLocation();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();

        navigate(ROUTES.LOGIN);
    };

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: 240,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: 240,
                    boxSizing: 'border-box',
                    bgcolor: '#1e1e2f', // dark blue-gray tone
                    color: '#fff',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                },
            }}
        >
            <List sx={{ mt: 2 }}>
                {menuItems.map((item) => {
                    const active = location.pathname === item.path;
                    return (
                        <ListItemButton
                            key={item.path}
                            onClick={() => onNavigate(item.path)}
                            sx={{
                                mx: 1,
                                mb: 0.5,
                                borderRadius: 2,
                                color: active
                                    ? '#fff'
                                    : 'rgba(255,255,255,0.7)',
                                backgroundColor: active
                                    ? 'rgba(255,255,255,0.1)'
                                    : 'transparent',
                                '&:hover': {
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    color: '#fff',
                                },
                            }}
                        >
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    fontWeight: active ? 600 : 400,
                                }}
                            />
                        </ListItemButton>
                    );
                })}
            </List>

            <Divider sx={{ bgcolor: 'rgba(255,255,255,0.12)', mx: 2 }} />

            <List sx={{ pb: 2 }}>
                <ListItemButton
                    onClick={handleLogout}
                    sx={{
                        mx: 1,
                        mt: 1,
                        borderRadius: 2,
                        color: 'rgba(255,255,255,0.7)',
                        '&:hover': {
                            backgroundColor: 'rgba(255,100,100,0.15)',
                            color: '#ff8a80',
                        },
                    }}
                >
                    <ListItemText
                        primary="Logout"
                        primaryTypographyProps={{ fontWeight: 500 }}
                    />
                </ListItemButton>
            </List>
        </Drawer>
    );
}
