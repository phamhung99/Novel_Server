import { AppBar, Toolbar, Typography } from '@mui/material';

export default function Topbar() {
    return (
        <AppBar position="static" color="primary" elevation={0}>
            <Toolbar>
                <Typography variant="h6" component="div">
                    Admin Dashboard
                </Typography>
            </Toolbar>
        </AppBar>
    );
}
