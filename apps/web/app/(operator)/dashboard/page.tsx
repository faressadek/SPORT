import { EmptyState } from '@sport/ui';
import { LayoutDashboard } from 'lucide-react';

export const metadata = { title: "Today's courts" };

// Placeholder so the operator shell can be reviewed. CC8 builds the dashboards.
export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-5 font-display text-3xl font-black leading-none text-ink sm:text-4xl">
        Today&apos;s courts
      </h1>
      <EmptyState
        icon={<LayoutDashboard className="size-6" />}
        title="No bookings today yet"
        description="New bookings and walk-ins show up here as they come in."
      />
    </>
  );
}
