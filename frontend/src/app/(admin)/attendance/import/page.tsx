import { redirect } from 'next/navigation';

export default function AttendanceImportPage() {
  redirect('/attendance/daily?tab=import');
}
