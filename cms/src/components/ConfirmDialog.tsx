import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
} from '@mui/material';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    content: ReactNode;
    onConfirm: () => void;
    onClose: () => void;
}

const ConfirmDialog = ({
    open,
    title,
    content,
    onConfirm,
    onClose,
}: ConfirmDialogProps) => (
    <Dialog open={open} onClose={onClose}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
            <DialogContentText>{content}</DialogContentText>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button color="error" onClick={onConfirm} variant="contained">
                Confirm
            </Button>
        </DialogActions>
    </Dialog>
);

export default ConfirmDialog;
