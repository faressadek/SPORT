import Link from 'next/link';
import { PitchLines } from '@sport/ui';

// Placeholder home so the athlete shell can be reviewed. CC2 builds the real Home.
const ENTRIES = [
  { href: '/courts', label: 'Courts', text: 'Pick a venue, a branch and an hour.' },
  { href: '/coaches', label: 'Coaches', text: 'Sessions and bundles, at their venue or yours.' },
  { href: '/gyms', label: 'Gyms', text: 'Compare plans and book a free visit.' },
  { href: '/academies', label: 'Academies', text: 'Programs by age, with free trials.' },
];

export default function HomePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-pitch text-on-pitch">
        <PitchLines />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20">
          <h1 className="max-w-xl font-display text-4xl font-black leading-[0.95] sm:text-[4.5rem] sm:leading-[0.95]">
            Your next game in Alexandria starts here
          </h1>
          <p className="mt-4 max-w-md text-lg text-on-pitch-muted">
            Book a court, train with a coach, join a gym or enrol in an academy.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-8">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRIES.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="flex min-h-28 flex-col justify-between rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
              >
                <span className="font-display text-2xl font-extrabold text-ink">{e.label}</span>
                <span className="text-sm text-ink-muted">{e.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
