import * as React from 'react';
import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import UserManual from './UserManual';

export default function UserManualDialog({ open, onClose }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ sx: { height: '90vh' } }}
    >
      <IconButton
        aria-label="Close user manual"
        onClick={onClose}
        sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
      >
        <CloseRoundedIcon />
      </IconButton>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', pt: 2, pr: 7 }}>
        <UserManual />
      </DialogContent>
    </Dialog>
  );
}

UserManualDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};
