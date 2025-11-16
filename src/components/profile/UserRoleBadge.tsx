import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Work as WorkIcon
} from '@mui/icons-material';

interface UserRoleBadgeProps {
  userType: 'admin' | 'intervenant' | 'client';
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
  showIcon?: boolean;
}

const getRoleConfig = (userType: 'admin' | 'intervenant' | 'client') => {
  switch (userType) {
    case 'admin':
      return {
        label: 'Administrateur',
        color: 'error' as ChipProps['color'],
        icon: <AdminIcon />,
        bgcolor: '#d32f2f',
        textColor: '#fff'
      };
    case 'intervenant':
      return {
        label: 'Intervenant',
        color: 'primary' as ChipProps['color'],
        icon: <WorkIcon />,
        bgcolor: '#1976d2',
        textColor: '#fff'
      };
    case 'client':
      return {
        label: 'Client',
        color: 'success' as ChipProps['color'],
        icon: <PersonIcon />,
        bgcolor: '#2e7d32',
        textColor: '#fff'
      };
    default:
      return {
        label: 'Utilisateur',
        color: 'default' as ChipProps['color'],
        icon: <PersonIcon />,
        bgcolor: '#757575',
        textColor: '#fff'
      };
  }
};

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({
  userType,
  size = 'small',
  variant = 'filled',
  showIcon = true
}) => {
  const config = getRoleConfig(userType);

  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={variant}
      icon={showIcon ? config.icon : undefined}
      sx={{
        fontWeight: 600,
        ...(variant === 'filled' && {
          backgroundColor: config.bgcolor,
          color: config.textColor,
          '& .MuiChip-icon': {
            color: config.textColor
          }
        })
      }}
    />
  );
};

export default UserRoleBadge;
