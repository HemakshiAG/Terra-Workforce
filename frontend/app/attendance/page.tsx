import { AppShell } from '@/components/app-shell';
import { AttendanceClient } from './attendance-client';

export default function AttendancePage() {
  return (
    <AppShell title="Today's attendance" subtitle="Green Valley worksite · verification station">
      <AttendanceClient />
    </AppShell>
  );
}
