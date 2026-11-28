'use client';

import {
  BadgeCheck,
  Banknote,
  Flag,
  Image as ImageIcon,
  LifeBuoy,
  ReceiptText,
  Store,
  Users,
} from 'lucide-react';
import {
  AdminShell,
  Button,
  DataTable,
  StatusPill,
  type AdminNavSection,
  type StatusKey,
} from '@sport/ui';
import { NextLink } from '../../../../next-link';

const SECTIONS: AdminNavSection[] = [
  {
    label: 'Operations',
    items: [
      {
        href: '/dev/ui/shells/admin',
        label: 'Applications',
        icon: <BadgeCheck className="size-4" aria-hidden />,
        badge: 4,
      },
      {
        href: '/admin/operators',
        label: 'Live operators',
        icon: <Store className="size-4" aria-hidden />,
      },
    ],
  },
  {
    label: 'Moderation',
    items: [
      {
        href: '/admin/media',
        label: 'Photos',
        icon: <ImageIcon className="size-4" aria-hidden />,
        badge: 12,
      },
      { href: '/admin/reports', label: 'Reports', icon: <Flag className="size-4" aria-hidden /> },
    ],
  },
  {
    label: 'Finance',
    items: [
      {
        href: '/admin/refunds',
        label: 'Refund requests',
        icon: <ReceiptText className="size-4" aria-hidden />,
        badge: 2,
      },
      {
        href: '/admin/payouts',
        label: 'Payouts',
        icon: <Banknote className="size-4" aria-hidden />,
      },
    ],
  },
  {
    label: 'Support',
    items: [
      {
        href: '/admin/tickets',
        label: 'Tickets',
        icon: <LifeBuoy className="size-4" aria-hidden />,
      },
    ],
  },
  {
    label: 'Team',
    items: [
      {
        href: '/admin/staff',
        label: 'Staff and roles',
        icon: <Users className="size-4" aria-hidden />,
      },
    ],
  },
];

type Row = { id: string; name: string; kind: string; submitted: string; status: StatusKey };
const ROWS: Row[] = [
  {
    id: '1',
    name: 'Coach Omar Hassan',
    kind: 'Coach',
    submitted: '28 Nov, 10:12',
    status: 'pending',
  },
  {
    id: '2',
    name: 'Sidi Gaber Padel',
    kind: 'Court owner',
    submitted: '27 Nov, 18:40',
    status: 'changes_requested',
  },
  {
    id: '3',
    name: 'Blue Wave Swim Academy',
    kind: 'Academy',
    submitted: '27 Nov, 09:03',
    status: 'pending',
  },
  { id: '4', name: 'Iron Coast Gym', kind: 'Gym', submitted: '26 Nov, 21:15', status: 'approved' },
];

export function AdminPreview() {
  return (
    <AdminShell
      currentPath="/dev/ui/shells/admin"
      sections={SECTIONS}
      staff={{ name: 'Mona Adel', role: 'Operations' }}
      environment="Sample data"
      title="Applications"
      linkAs={NextLink}
    >
      <DataTable
        caption="Operator applications"
        rows={ROWS}
        rowKey={(r) => r.id}
        onRowClick={() => {}}
        columns={[
          { key: 'name', header: 'Applicant', sortValue: (r) => r.name },
          { key: 'kind', header: 'Type', sortValue: (r) => r.kind },
          { key: 'submitted', header: 'Submitted', sortValue: (r) => r.id },
          { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
        ]}
        rowActions={() => (
          <Button size="sm" variant="outline">
            Review
          </Button>
        )}
      />
    </AdminShell>
  );
}
