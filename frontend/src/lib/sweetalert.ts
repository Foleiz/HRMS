import Swal, { SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Custom SweetAlert2 instance with HRMS Theme
export const hrmsSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900',
    title: 'text-lg font-bold text-slate-900 dark:text-slate-100 pt-2',
    htmlContainer: 'text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed',
    confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-none cursor-pointer',
    cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all mr-3 border border-slate-200 dark:border-slate-700 cursor-pointer',
    actions: 'gap-3 mt-5 flex justify-center items-center',
  },
  buttonsStyling: false,
  backdrop: 'rgba(15, 23, 42, 0.55)',
});

/**
 * Modern Confirmation Dialog for Deletions
 * Returns true if user confirmed, false if cancelled/dismissed.
 */
export async function confirmDelete(options: {
  title?: string;
  text?: string;
  html?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
}): Promise<boolean> {
  const result = await hrmsSwal.fire({
    title: options.title || 'ยืนยันการลบข้อมูล?',
    text: options.text,
    html: options.html,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'ลบข้อมูล',
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900',
      title: 'text-lg font-bold text-slate-900 dark:text-slate-100 pt-2',
      htmlContainer: 'text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-sm shadow-rose-200 dark:shadow-none cursor-pointer',
      cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all mr-3 border border-slate-200 dark:border-slate-700 cursor-pointer',
      actions: 'gap-3 mt-5 flex justify-center items-center',
    },
  });

  return result.isConfirmed;
}

/**
 * General Confirmation Dialog
 */
export async function confirmAction(options: {
  title: string;
  text?: string;
  html?: string;
  icon?: 'warning' | 'info' | 'question' | 'error';
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDestructive?: boolean;
}): Promise<boolean> {
  const isDestructive = options.isDestructive ?? false;
  const result = await hrmsSwal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon ?? (isDestructive ? 'warning' : 'question'),
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || (isDestructive ? 'ลบข้อมูล' : 'ยืนยัน'),
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900',
      title: 'text-lg font-bold text-slate-900 dark:text-slate-100 pt-2',
      htmlContainer: 'text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed',
      confirmButton: isDestructive
        ? 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-sm shadow-rose-200 dark:shadow-none cursor-pointer'
        : 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-none cursor-pointer',
      cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all mr-3 border border-slate-200 dark:border-slate-700 cursor-pointer',
      actions: 'gap-3 mt-5 flex justify-center items-center',
    },
  });

  return result.isConfirmed;
}

/**
 * Success Alert
 */
export async function showSuccess(title: string, text?: string): Promise<void> {
  await hrmsSwal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonText: 'ตกลง',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900',
      title: 'text-lg font-bold text-slate-900 dark:text-slate-100 pt-2',
      htmlContainer: 'text-sm text-slate-500 dark:text-slate-400 mt-2',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-none cursor-pointer',
      actions: 'mt-5 flex justify-center',
    },
  });
}

/**
 * Error Alert
 */
export async function showError(title: string, text?: string): Promise<void> {
  await hrmsSwal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonText: 'ตกลง',
    customClass: {
      popup: 'rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 bg-white dark:bg-slate-900',
      title: 'text-lg font-bold text-slate-900 dark:text-slate-100 pt-2',
      htmlContainer: 'text-sm text-slate-500 dark:text-slate-400 mt-2',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 dark:shadow-none cursor-pointer',
      actions: 'mt-5 flex justify-center',
    },
  });
}

export default hrmsSwal;
