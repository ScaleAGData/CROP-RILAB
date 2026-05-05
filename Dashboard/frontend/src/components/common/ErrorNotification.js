import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { useSelection } from './path/to/SelectionProvider';

export const ErrorNotification = () => {
  const { error, setError } = useSelection();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') return;
    setError(null);
  };

  return (
    <Snackbar 
      open={!!error} 
      autoHideDuration={6000} 
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert 
        onClose={handleClose} 
        severity="error" 
        sx={{ width: '100%' }}
      >
        {error}
      </Alert>
    </Snackbar>
  );
};