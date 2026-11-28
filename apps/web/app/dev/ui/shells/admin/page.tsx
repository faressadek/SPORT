import { notFound } from 'next/navigation';
import { AdminPreview } from './preview';

export const metadata = { title: 'Admin layout', robots: { index: false } };

export default function AdminShellPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_UI !== 'true') notFound();
  return <AdminPreview />;
}
