import { notFound } from 'next/navigation';
import { Showcase } from './showcase';

export const metadata = { title: 'UI kit', robots: { index: false } };

/** Every component and state, for review at 390px and 1280px in light and dark. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_UI !== 'true') notFound();
  return <Showcase />;
}
