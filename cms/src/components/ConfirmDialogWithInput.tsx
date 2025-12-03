// components/ConfirmDialogWithInput.tsx
import {
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Button,
    TextField,
} from '@mui/material';
import { useState, useEffect, type ReactNode } from 'react';

interface ConfirmDialogWithInputProps {
    open: boolean;
    title: string;
    content: ReactNode;
    inputLabel?: string;
    onConfirm: (inputValue: string) => void;
    onClose: () => void;
}

const ConfirmDialogWithInput = ({
    open,
    title,
    content,
    inputLabel,
    onConfirm,
    onClose,
}: ConfirmDialogWithInputProps) => {
    const [inputValue, setInputValue] = useState('');

    // Reset input when dialog opens
    useEffect(() => {
        if (open) setInputValue('');
    }, [open]);

    const handleConfirm = () => {
        if (!inputValue.trim()) {
            alert('Vui lòng nhập giá trị');
            return;
        }
        onConfirm(inputValue.trim());
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md">
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText>{content}</DialogContentText>
                <TextField
                    autoFocus
                    margin="dense"
                    label={inputLabel || 'Nhập giá trị'}
                    fullWidth
                    multiline
                    minRows={4}
                    maxRows={10}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    color="error"
                    variant="contained"
                    onClick={handleConfirm}
                >
                    Confirm
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ConfirmDialogWithInput;
