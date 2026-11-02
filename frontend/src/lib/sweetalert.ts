/**
 * Compatibility bridge redirecting legacy SweetAlert2 calls to HRMS Custom React Confirm Modal
 */
import {
  confirmAction,
  confirmDelete,
  showSuccess,
  showError,
  isConfirmVisible,
  closeConfirmDialog,
  type ConfirmDialogOptions,
} from '@/context/ConfirmContext';

export { confirmAction, confirmDelete, showSuccess, showError };

export const hrmsSwal = {
  fire: async (options: {
    title?: string;
    text?: string;
    html?: string;
    icon?: 'warning' | 'info' | 'question' | 'success' | 'error';
    confirmButtonText?: string;
    cancelButtonText?: string;
    showCancelButton?: boolean;
  }) => {
    const isConfirmed = await confirmAction({
      title: options.title || '',
      text: options.text,
      html: options.html,
      icon: options.icon,
      confirmButtonText: options.confirmButtonText || 'ตกลง',
      cancelButtonText: options.cancelButtonText || 'ยกเลิก',
      singleButton: !options.showCancelButton,
    });
    return { isConfirmed, isDismissed: !isConfirmed };
  },
  isVisible: () => isConfirmVisible(),
  close: () => closeConfirmDialog(),
};

export default hrmsSwal;
