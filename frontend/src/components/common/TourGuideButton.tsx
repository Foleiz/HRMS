'use client';

import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui';

interface TourGuideButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  variant?: 'secondary' | 'ghost';
  compact?: boolean;
}

export const TourGuideButton: React.FC<TourGuideButtonProps> = ({
  onClick,
  label = 'แนะนำการใช้งาน',
  className = '',
  variant = 'secondary',
  compact = false,
}) => {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      icon={<HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
      className={`text-xs ${className}`}
      title={label}
    >
      {!compact && label}
    </Button>
  );
};
