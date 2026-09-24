import Swal, { SweetAlertOptions } from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';

// Custom SweetAlert2 instance with HRMS Theme
export const hrmsSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 bg-white',
    title: 'text-lg font-bold text-slate-800 pt-2',
    htmlContainer: 'text-sm text-slate-600 mt-2 leading-relaxed',
    confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200',
    cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-95 transition-all mr-3 border border-slate-300',
    actions: 'gap-3 mt-5 flex justify-center items-center',
  },
  buttonsStyling: false,
  backdrop: 'rgba(15, 23, 42, 0.45)',
});

/**
 * Modern Confirmation Dialog for Deletions
 * Returns true if user confirmed, false if cancelled/dismissed.
 * Button styling:
 * - ยกเลิก (Cancel): สีเทา (Slate/Gray 200)
 * - ลบข้อมูล (Confirm): สีน้ำเงิน (Blue 600)
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
      popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 bg-white',
      title: 'text-lg font-bold text-slate-800 pt-2',
      htmlContainer: 'text-sm text-slate-600 mt-2 leading-relaxed',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 cursor-pointer',
      cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-95 transition-all mr-3 border border-slate-300 cursor-pointer',
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
  const result = await hrmsSwal.fire({
    title: options.title,
    text: options.text,
    html: options.html,
    icon: options.icon ?? 'question',
    showCancelButton: true,
    confirmButtonText: options.confirmButtonText || 'ยืนยัน',
    cancelButtonText: options.cancelButtonText || 'ยกเลิก',
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 bg-white',
      title: 'text-lg font-bold text-slate-800 pt-2',
      htmlContainer: 'text-sm text-slate-600 mt-2 leading-relaxed',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 cursor-pointer',
      cancelButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 active:scale-95 transition-all mr-3 border border-slate-300 cursor-pointer',
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
      popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 bg-white',
      title: 'text-lg font-bold text-slate-800 pt-2',
      htmlContainer: 'text-sm text-slate-600 mt-2',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 cursor-pointer',
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
      popup: 'rounded-2xl shadow-2xl border border-slate-100 p-6 bg-white',
      title: 'text-lg font-bold text-slate-800 pt-2',
      htmlContainer: 'text-sm text-slate-600 mt-2',
      confirmButton: 'inline-flex items-center justify-center px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm shadow-blue-200 cursor-pointer',
      actions: 'mt-5 flex justify-center',
    },
  });
}

export default hrmsSwal;
