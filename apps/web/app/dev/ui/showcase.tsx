'use client';

import { CalendarX2, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Calendar,
  CalendarLegend,
  CalendarToolbar,
  Card,
  CardHeader,
  CardTitle,
  Checkbox,
  DataTable,
  DatePicker,
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
  EmptyState,
  ErrorState,
  Field,
  FileUploader,
  Input,
  LoadingRegion,
  OperatorCard,
  OperatorCardSkeleton,
  PhotoGallery,
  PriceTag,
  Rating,
  STATUS_META,
  Select,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
  Skeleton,
  StatusPill,
  Stepper,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  TimeSlotGrid,
  VenueCard,
  VenueCardSkeleton,
  addDays,
  formatDay,
  useToast,
  type CalendarEvent,
  type MediaItem,
  type StatusKey,
  type TimeSlot,
} from '@sport/ui';
import { NextLink } from '../../next-link';

// Sample data for the showcase only. Never shown to athletes.
const TODAY = '2026-11-28';

const BRANCH_PHOTOS: MediaItem[] = [
  { id: 'p1', src: '/samples/football-turf.svg', alt: 'Five-a-side pitch, artificial turf' },
  { id: 'p2', src: '/samples/football-night.svg', alt: 'The same pitch under floodlights' },
  { id: 'p3', src: '/samples/indoor-court.svg', alt: 'Indoor court with a wooden floor' },
];

const PORTFOLIO: MediaItem[] = [
  {
    id: 'v1',
    src: '/samples/academy-team.svg',
    alt: 'Under-12 team after the Alexandria cup final',
  },
  {
    id: 'v2',
    src: '/samples/swim-pool.svg',
    alt: 'Training video: freestyle drills',
    kind: 'video',
    poster: '/samples/swim-pool.svg',
  },
  { id: 'v3', src: '/samples/gym-floor.svg', alt: 'Strength area with free weights' },
];

function makeSlots(): TimeSlot[] {
  const taken = new Set(['10:00', '18:00', '21:00']);
  const blocked = new Set(['14:00']);
  return Array.from({ length: 16 }, (_, i) => {
    const h = 8 + i;
    const start = `${String(h).padStart(2, '0')}:00`;
    const end = `${String(h + 1).padStart(2, '0')}:00`;
    return {
      id: start,
      start,
      end,
      status: taken.has(start) ? 'taken' : blocked.has(start) ? 'blocked' : 'available',
      price: h >= 17 ? 45000 : 30000,
    } satisfies TimeSlot;
  });
}

const COURTS = [
  { id: 'c1', label: 'Court 1', sublabel: 'Football, turf' },
  { id: 'c2', label: 'Court 2', sublabel: 'Football, turf' },
  { id: 'c3', label: 'Padel A', sublabel: 'Indoor' },
];

const INITIAL_EVENTS: CalendarEvent[] = [
  {
    id: 'e1',
    columnId: 'c1',
    start: '09:00',
    end: '10:00',
    title: 'Karim Fathy',
    subtitle: 'Paid online',
    kind: 'booking',
  },
  {
    id: 'e2',
    columnId: 'c1',
    start: '18:00',
    end: '20:00',
    title: 'Coach Omar + 4',
    subtitle: 'Coach and court',
    kind: 'booking',
  },
  {
    id: 'e3',
    columnId: 'c2',
    start: '19:00',
    end: '20:00',
    title: 'Walk-in',
    subtitle: 'Paid at desk',
    kind: 'walk_in',
  },
  { id: 'e4', columnId: 'c2', start: '12:00', end: '13:00', title: 'In checkout', kind: 'hold' },
  { id: 'e5', columnId: 'c3', start: '07:00', end: '11:00', title: 'Resurfacing', kind: 'closed' },
  { id: 'e6', columnId: 'c3', start: '17:00', end: '18:30', title: 'Salma Nabil', kind: 'booking' },
];

type BookingRow = {
  id: string;
  athlete: string;
  what: string;
  when: string;
  amount: number;
  status: StatusKey;
};
const BOOKINGS: BookingRow[] = [
  {
    id: 'SP-1042',
    athlete: 'Karim Fathy',
    what: 'Court 1, 1 hour',
    when: '28 Nov, 09:00',
    amount: 30000,
    status: 'confirmed',
  },
  {
    id: 'SP-1043',
    athlete: 'Salma Nabil',
    what: 'Padel A, 90 min',
    when: '28 Nov, 17:00',
    amount: 52500,
    status: 'pending_payment',
  },
  {
    id: 'SP-1039',
    athlete: 'Youssef Ali',
    what: 'Court 2, 1 hour',
    when: '27 Nov, 20:00',
    amount: 45000,
    status: 'refunded',
  },
  {
    id: 'SP-1035',
    athlete: 'Nour Samir',
    what: 'Coach Omar + Court 1',
    when: '26 Nov, 18:00',
    amount: 120000,
    status: 'partially_refunded',
  },
];

const SWATCHES: [string, string, string][] = [
  ['bg', 'Page', 'bg-bg'],
  ['surface', 'Surface', 'bg-surface'],
  ['sunken', 'Sunken', 'bg-sunken'],
  ['ink', 'Ink (text)', 'bg-ink'],
  ['ink-muted', 'Muted text', 'bg-ink-muted'],
  ['line', 'Line', 'bg-line'],
  ['line-strong', 'Strong line', 'bg-line-strong'],
  ['pitch', 'Pitch', 'bg-pitch'],
  ['pitch-raised', 'Turf', 'bg-pitch-raised'],
  ['action', 'Action (lime)', 'bg-action'],
  ['success', 'Success', 'bg-success'],
  ['warning', 'Warning', 'bg-warning'],
  ['danger', 'Danger', 'bg-danger'],
  ['info', 'Info', 'bg-info'],
];

const SECTIONS = [
  ['foundations', 'Foundations'],
  ['buttons', 'Buttons'],
  ['inputs', 'Inputs'],
  ['labels', 'Badges and status'],
  ['display', 'Avatar, rating, price'],
  ['cards', 'Cards'],
  ['gallery', 'Photo gallery'],
  ['overlays', 'Dialog, sheet, toast'],
  ['tabs', 'Tabs'],
  ['states', 'Loading, empty, error'],
  ['booking', 'Date and time'],
  ['stepper', 'Stepper'],
  ['upload', 'File uploader'],
  ['table', 'Data table'],
  ['calendar', 'Calendar'],
  ['shells', 'App shells'],
] as const;

function Section({
  id,
  title,
  children,
  note,
}: {
  id: string;
  title: string;
  children: ReactNode;
  note?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-32 border-t border-line py-10 first:border-t-0"
    >
      <h2 id={`${id}-h`} className="font-display text-3xl font-black leading-none text-ink">
        {title}
      </h2>
      {note ? <p className="mt-2 max-w-2xl text-ink-muted">{note}</p> : null}
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  );
}

function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="mb-2 text-sm font-semibold text-ink-muted">{label}</h3>
      {children}
    </div>
  );
}

type Theme = 'system' | 'light' | 'dark';

function useDocumentSettings() {
  const [theme, setTheme] = useState<Theme>('system');
  const [rtl, setRtl] = useState(false);

  useEffect(() => {
    // Read once on mount: the theme script in the root layout may have set it.
    // These live in the URL and the DOM, which the server render can't see,
    // so they are read after hydration.
    const params = new URLSearchParams(window.location.search);
    const q = params.get('theme') ?? document.documentElement.dataset.theme;
    const initialTheme = q === 'light' || q === 'dark' ? q : null;
    const initialRtl = params.get('dir') === 'rtl';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL after hydration
    if (initialTheme) setTheme(initialTheme);
    if (initialRtl) setRtl(true);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') {
      delete el.dataset.theme;
      try {
        localStorage.removeItem('sport-theme');
      } catch {
        // Storage can be blocked (private mode); the theme still applies for this visit.
      }
    } else {
      el.dataset.theme = theme;
      try {
        localStorage.setItem('sport-theme', theme);
      } catch {
        // Storage can be blocked (private mode); the theme still applies for this visit.
      }
    }
  }, [theme]);

  useEffect(() => {
    const el = document.documentElement;
    el.dir = rtl ? 'rtl' : 'ltr';
    el.lang = rtl ? 'ar' : 'en';
  }, [rtl]);

  return { theme, setTheme, rtl, setRtl };
}

export function Showcase() {
  const toast = useToast();
  const { theme, setTheme, rtl, setRtl } = useDocumentSettings();
  const [date, setDate] = useState<string | null>(TODAY);
  const [single, setSingle] = useState<string[]>(['19:00']);
  const [range, setRange] = useState<string[]>(['19:00', '20:00']);
  const [step, setStep] = useState(1);
  const [view, setView] = useState<'day' | 'week'>('day');
  const [calDay, setCalDay] = useState(TODAY);
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [walkIn, setWalkIn] = useState<{ court: string; start: string } | null>(null);
  const slots = makeSlots();

  const fakeUpload = (file: File, onProgress: (p: number) => void) =>
    new Promise<void>((resolve, reject) => {
      let p = 0;
      const t = setInterval(() => {
        p += 0.2;
        onProgress(p);
        if (p >= 1) {
          clearInterval(t);
          if (file.name.includes('fail'))
            reject(new Error('Upload stopped. Check your connection and retry.'));
          else resolve();
        }
      }, 250);
    });

  const weekColumns = Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(calDay, i);
    return { id: iso, label: formatDay(iso, 'en', { month: undefined }), sublabel: 'Court 1' };
  });
  const weekEvents: CalendarEvent[] = [
    {
      id: 'w1',
      columnId: addDays(calDay, 0),
      start: '09:00',
      end: '10:00',
      title: 'Karim Fathy',
      kind: 'booking',
    },
    {
      id: 'w2',
      columnId: addDays(calDay, 1),
      start: '18:00',
      end: '20:00',
      title: 'League night',
      kind: 'booking',
    },
    {
      id: 'w3',
      columnId: addDays(calDay, 3),
      start: '07:00',
      end: '12:00',
      title: 'Closed',
      kind: 'closed',
    },
    {
      id: 'w4',
      columnId: addDays(calDay, 5),
      start: '20:00',
      end: '21:00',
      title: 'Walk-in',
      kind: 'walk_in',
    },
  ];

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <p className="me-auto font-display text-2xl font-black text-ink">SPORT UI kit</p>
          <div
            role="group"
            aria-label="Theme"
            className="flex rounded-md border border-line-strong"
          >
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
                className={`min-h-11 rounded-sm px-3 text-sm font-semibold capitalize ${theme === t ? 'bg-pitch text-on-pitch' : 'text-ink-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" aria-pressed={rtl} onClick={() => setRtl(!rtl)}>
            {rtl ? 'Right to left (Arabic)' : 'Left to right'}
          </Button>
        </div>
        <nav
          aria-label="Sections"
          className="scrollbar-none mx-auto max-w-6xl overflow-x-auto px-2"
        >
          <ul className="flex gap-1">
            {SECTIONS.map(([id, label]) => (
              <li key={id} className="shrink-0">
                <a
                  href={`#${id}`}
                  className="flex min-h-11 items-center px-2 text-sm font-semibold text-ink-muted hover:text-ink"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <Section
          id="foundations"
          title="Foundations"
          note="Colours are roles. Lime marks actions and selections only; pitch green carries the brand."
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {SWATCHES.map(([token, label, cls]) => (
              <li key={token} className="overflow-hidden rounded-md border border-line bg-surface">
                <div className={`h-14 ${cls}`} />
                <div className="p-2">
                  <p className="text-sm font-semibold text-ink">{label}</p>
                  <p className="text-xs text-ink-muted">--c-{token}</p>
                </div>
              </li>
            ))}
          </ul>
          <Demo label="Type scale (Big Shoulders + Barlow; Noto Kufi Arabic in Arabic)">
            <div className="flex flex-col gap-2">
              <p className="font-display text-4xl font-black leading-none">
                Court 2 is free at 19:00
              </p>
              <p className="font-display text-3xl font-black leading-none">Coaches near Smouha</p>
              <p className="font-display text-2xl font-extrabold">Membership plans</p>
              <p className="font-display text-xl font-extrabold">Review details and price</p>
              <p className="text-lg">Lead paragraph, 20px. Train where your coach trains.</p>
              <p className="text-base">
                Body, 16px. Free cancellation until 24 hours before the start time.
              </p>
              <p className="text-sm text-ink-muted">Small, 14px. Prices include the SPORT fee.</p>
              <p className="scoreboard text-3xl font-extrabold">18:00 19:00 20:00 EGP 450</p>
              <p lang="ar" dir="rtl" className="font-arabic text-xl font-semibold">
                احجز ملعبك القادم في الإسكندرية
              </p>
            </div>
          </Demo>
        </Section>

        <Section id="buttons" title="Buttons">
          <Demo label="Variants">
            <div className="flex flex-wrap gap-3">
              <Button>Book this time</Button>
              <Button variant="secondary">Send enquiry</Button>
              <Button variant="outline">Filters</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger">Cancel booking</Button>
              <Button variant="link">See packages</Button>
            </div>
          </Demo>
          <Demo label="Sizes and states">
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button>Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" variant="outline" aria-label="Search">
                <Search className="size-5" aria-hidden />
              </Button>
              <Button loading>Paying</Button>
              <Button disabled>Fully booked</Button>
            </div>
          </Demo>
          <Demo label="Full width (checkout footer on phones)" className="max-w-sm">
            <Button block size="lg">
              Pay EGP 750
            </Button>
          </Demo>
        </Section>

        <Section id="inputs" title="Inputs">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" hint="As it appears on your ID." required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  placeholder="Karim Fathy"
                />
              )}
            </Field>
            <Field label="Phone" error="Enter an Egyptian mobile number, like 010 1234 5678.">
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  defaultValue="0101"
                  inputMode="tel"
                />
              )}
            </Field>
            <Field label="Search coaches" hideLabel>
              {({ id }) => (
                <Input
                  id={id}
                  type="search"
                  leading={<Search className="size-4" />}
                  placeholder="Search coaches"
                />
              )}
            </Field>
            <Field label="Area">
              {({ id, describedBy }) => (
                <Select
                  id={id}
                  aria-describedby={describedBy}
                  placeholder="Any area"
                  defaultValue=""
                  options={[
                    { value: 'smouha', label: 'Smouha' },
                    { value: 'sidi-gaber', label: 'Sidi Gaber' },
                    { value: 'miami', label: 'Miami' },
                    { value: 'stanley', label: 'Stanley' },
                  ]}
                />
              )}
            </Field>
            <Field label="Disabled">
              {({ id }) => <Input id={id} disabled defaultValue="Smouha branch" />}
            </Field>
            <Field
              label="Message to the academy"
              hint="Your child's age and the sport help them reply faster."
            >
              {({ id, describedBy }) => <Textarea id={id} aria-describedby={describedBy} />}
            </Field>
          </div>
          <div>
            <Checkbox label="Indoor only" description="Hide outdoor courts" />
            <Checkbox label="Floodlit" defaultChecked />
          </div>
        </Section>

        <Section
          id="labels"
          title="Badges and status"
          note="One wording and one colour per status, everywhere (SPEC R10)."
        >
          <div className="flex flex-wrap gap-2">
            <Badge>Football</Badge>
            <Badge>Artificial turf</Badge>
            <Badge tone="info">Indoor</Badge>
            <Badge tone="success">Free trial</Badge>
            <Badge tone="warning">2 spots left</Badge>
            <Badge tone="pitch">Verified</Badge>
            <Badge tone="action">Selected</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_META) as StatusKey[]).map((s) => (
              <StatusPill key={s} status={s} />
            ))}
          </div>
        </Section>

        <Section id="display" title="Avatar, rating, price">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name="Omar Hassan" src="/samples/coach-portrait.svg" size="xl" />
            <Avatar name="Omar Hassan" size="lg" />
            <Avatar name="Blue Wave Academy" size="lg" shape="square" />
            <Avatar name="Salma" size="md" />
            <Avatar name="Broken image" src="/samples/missing.png" size="md" />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Rating value={4.8} count={126} />
            <Rating value={4.3} count={18} variant="stars" />
            <Rating value={0} count={0} />
          </div>
          <div className="flex flex-wrap items-end gap-6">
            <PriceTag amount={35000} prefix="from" unit="/ hour" size="sm" />
            <PriceTag amount={120000} unit="/ month" />
            <PriceTag amount={240000} was={300000} unit="/ 8 sessions" size="lg" />
            <PriceTag amount={35050} />
          </div>
        </Section>

        <Section
          id="cards"
          title="Cards"
          note="Operator cards for Coaches, Gyms and Academies (R3); venue cards with 2–3 branch photos for Courts (R6)."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OperatorCard
              linkAs={NextLink}
              href="/coaches/omar-hassan"
              kind="coach"
              name="Omar Hassan"
              photo="/samples/football-turf.svg"
              avatar="/samples/coach-portrait.svg"
              sports={['Football', 'Fitness']}
              area="Smouha, Alexandria"
              rating={4.9}
              ratingCount={84}
              startingPrice={35000}
              priceUnit="/ session"
              highlights={['Has a venue']}
            />
            <OperatorCard
              linkAs={NextLink}
              href="/gyms/iron-coast"
              kind="gym"
              name="Iron Coast Gym"
              photo="/samples/gym-floor.svg"
              sports={['Strength', 'Cardio']}
              area="Stanley"
              rating={4.4}
              ratingCount={203}
              startingPrice={90000}
              priceUnit="/ month"
              highlights={['Free visit']}
            />
            <OperatorCard
              linkAs={NextLink}
              href="/academies/blue-wave"
              kind="academy"
              name="Blue Wave Swim Academy"
              sports={['Swimming']}
              area="Sporting"
              rating={0}
              ratingCount={0}
              startingPrice={150000}
              priceUnit="/ term"
              highlights={['Ages 5–14']}
            />
          </div>
          <Demo label="Row layout (dense lists on phones) and loading">
            <div className="grid gap-3 lg:grid-cols-2">
              <OperatorCard
                layout="row"
                linkAs={NextLink}
                href="/coaches/salma-nabil"
                kind="coach"
                name="Salma Nabil"
                photo="/samples/padel-court.svg"
                sports={['Padel']}
                area="Sidi Gaber"
                rating={4.7}
                ratingCount={31}
                startingPrice={40000}
                priceUnit="/ session"
              />
              <OperatorCardSkeleton layout="row" />
            </div>
          </Demo>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <VenueCard
              linkAs={NextLink}
              href="/courts/smouha-sports-club/main"
              venueName="Smouha Sports Club"
              branchName="Main branch"
              area="Smouha"
              photos={BRANCH_PHOTOS}
              sports={['Football']}
              surfaces={['Turf']}
              outdoor
              floodlit
              courtsCount={4}
              rating={4.6}
              ratingCount={312}
              priceFrom={30000}
              nextFree="Free 19:00"
            />
            <VenueCard
              linkAs={NextLink}
              href="/courts/sidi-gaber-padel/east"
              venueName="Sidi Gaber Padel"
              branchName="East branch"
              area="Sidi Gaber"
              photos={[
                {
                  id: 'pd1',
                  src: '/samples/padel-court.svg',
                  alt: 'Blue padel court, glass walls',
                },
                BRANCH_PHOTOS[2]!,
              ]}
              sports={['Padel']}
              indoor
              courtsCount={2}
              priceFrom={52500}
            />
            <VenueCardSkeleton />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Flat card</CardTitle>
                <Badge>Default</Badge>
              </CardHeader>
              <p className="text-ink-muted">Hairline border, for most grouped content.</p>
            </Card>
            <Card tone="raised">
              <CardTitle>Raised</CardTitle>
              <p className="mt-2 text-ink-muted">For the booking summary that must stand out.</p>
            </Card>
            <Card tone="pitch">
              <CardTitle>Pitch</CardTitle>
              <p className="mt-2 text-on-pitch-muted">For one highlight per screen.</p>
            </Card>
          </div>
        </Section>

        <Section
          id="gallery"
          title="Photo gallery"
          note="Swipe on touch, arrow keys or buttons on desktop, full-screen view with video."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoGallery
              items={PORTFOLIO}
              label="Blue Wave Swim Academy portfolio"
              className="rounded-lg"
            />
            <PhotoGallery items={[]} label="Empty gallery" className="rounded-lg" />
          </div>
        </Section>

        <Section id="overlays" title="Dialog, sheet, toast">
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="danger">Cancel booking</Button>
              </DialogTrigger>
              <DialogContent
                title="Cancel this booking?"
                description="Free cancellation until 24 hours before. You'll get EGP 450 back to your card in 5–7 days."
                footer={
                  <>
                    <DialogClose asChild>
                      <Button variant="outline">Keep booking</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button
                        variant="danger"
                        onClick={() =>
                          toast({
                            title: 'Booking cancelled',
                            description: 'Refund requested: EGP 450.',
                          })
                        }
                      >
                        Cancel booking
                      </Button>
                    </DialogClose>
                  </>
                }
              />
            </Dialog>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Filters</Button>
              </SheetTrigger>
              <SheetContent
                title="Filters"
                footer={
                  <>
                    <SheetClose asChild>
                      <Button variant="ghost">Clear</Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button block>Show 24 coaches</Button>
                    </SheetClose>
                  </>
                }
              >
                <div className="flex flex-col gap-4">
                  <Field label="Sport">
                    {({ id }) => (
                      <Select
                        id={id}
                        placeholder="Any sport"
                        defaultValue=""
                        options={[
                          { value: 'football', label: 'Football' },
                          { value: 'padel', label: 'Padel' },
                        ]}
                      />
                    )}
                  </Field>
                  <Checkbox label="Rated 4 and up" />
                  <Checkbox label="Has a venue" />
                </div>
              </SheetContent>
            </Sheet>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: 'Enquiry sent',
                  description: "You'll see the reply in My Bookings.",
                })
              }
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  tone: 'error',
                  title: 'That time was just booked',
                  description: 'Pick another time.',
                  action: { label: 'See times', onClick: () => {} },
                })
              }
            >
              Error toast
            </Button>
          </div>
        </Section>

        <Section id="tabs" title="Tabs">
          <Tabs defaultValue="about">
            <TabsList sticky aria-label="Profile">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="about">
              <p className="max-w-prose text-ink">
                UEFA C licensed coach with 9 years of experience. Small-group sessions for teenagers
                and adults.
              </p>
            </TabsContent>
            <TabsContent value="portfolio">Portfolio goes here.</TabsContent>
            <TabsContent value="packages">Packages go here.</TabsContent>
            <TabsContent value="reviews">Reviews go here.</TabsContent>
          </Tabs>
        </Section>

        <Section
          id="states"
          title="Loading, empty, error"
          note="Every screen that loads data has all three, plus success."
        >
          <div className="grid gap-4 lg:grid-cols-3">
            <LoadingRegion
              label="Loading coaches"
              className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
            >
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </LoadingRegion>
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No coaches match these filters"
              description="Try another area or remove the price limit."
              action={<Button variant="outline">Clear filters</Button>}
            />
            <ErrorState onRetry={() => toast({ title: 'Loaded', tone: 'info' })} />
          </div>
          <EmptyState
            icon={<CalendarX2 className="size-6" />}
            title="No bookings yet"
            description="Courts and coaches you book show up here."
            action={
              <Link
                href="/courts"
                className="inline-flex min-h-11 items-center rounded-md bg-action px-4 font-semibold text-on-action"
              >
                Find a court
              </Link>
            }
          />
        </Section>

        <Section
          id="booking"
          title="Date and time"
          note="Times read like a scoreboard. Courts can book back-to-back hours."
        >
          <DatePicker
            value={date}
            onChange={setDate}
            from={TODAY}
            isDisabled={(d) => d === addDays(TODAY, 4)}
          />
          <Demo label="Single slot (coach session)">
            <TimeSlotGrid slots={slots} value={single} onChange={setSingle} />
          </Demo>
          <Demo
            label={`Range (court hours): ${range.length ? `${range[0]} for ${range.length} h` : 'none'}`}
          >
            <TimeSlotGrid slots={slots} value={range} onChange={setRange} mode="range" />
          </Demo>
          <div className="grid gap-4 lg:grid-cols-3">
            <Demo label="Loading">
              <TimeSlotGrid slots={[]} value={[]} onChange={() => {}} loading />
            </Demo>
            <Demo label="No times">
              <TimeSlotGrid slots={[]} value={[]} onChange={() => {}} />
            </Demo>
            <Demo label="Fully booked">
              <TimeSlotGrid
                slots={slots.slice(0, 3).map((s) => ({ ...s, status: 'taken' as const }))}
                value={[]}
                onChange={() => {}}
              />
            </Demo>
          </div>
        </Section>

        <Section id="stepper" title="Stepper">
          <Stepper
            steps={[
              { id: 'photos', label: 'Photos' },
              { id: 'about', label: 'About' },
              { id: 'branches', label: 'Branches', status: 'error' },
              { id: 'packages', label: 'Packages' },
              { id: 'review', label: 'Go live' },
            ]}
            current={step}
            onStepClick={setStep}
          />
          <div className="flex gap-2">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </Button>
            <Button disabled={step === 4} onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          </div>
        </Section>

        <Section
          id="upload"
          title="File uploader"
          note="Pick or drop files. A file named with 'fail' shows the retry state."
        >
          <FileUploader
            label="Portfolio photos and videos"
            upload={fakeUpload}
            initial={[
              {
                id: 'i1',
                name: 'team-final.jpg',
                size: 820000,
                kind: 'photo',
                previewUrl: '/samples/academy-team.svg',
                status: 'done',
                progress: 1,
                review: 'approved',
              },
              {
                id: 'i2',
                name: 'pool-drills.mp4',
                size: 7400000,
                kind: 'video',
                status: 'done',
                progress: 1,
                review: 'pending',
              },
              {
                id: 'i3',
                name: 'court-night.jpg',
                size: 640000,
                kind: 'photo',
                previewUrl: '/samples/football-night.svg',
                status: 'uploading',
                progress: 0.45,
              },
              {
                id: 'i4',
                name: 'locker-room.jpg',
                size: 910000,
                kind: 'photo',
                status: 'error',
                progress: 0.3,
                error: 'Upload stopped. Retry.',
              },
            ]}
          />
        </Section>

        <Section
          id="table"
          title="Data table"
          note="A table from 640px, stacked cards on phones. Used in dashboards and SPORT Admin."
        >
          <DataTable
            caption="Recent bookings"
            showCaption
            rows={BOOKINGS}
            rowKey={(r) => r.id}
            onRowClick={(r) => toast({ title: `Open ${r.id}`, tone: 'info' })}
            columns={[
              { key: 'id', header: 'Booking', sortValue: (r) => r.id },
              { key: 'athlete', header: 'Athlete', sortValue: (r) => r.athlete },
              { key: 'what', header: 'What', hideOnMobile: true },
              { key: 'when', header: 'When', sortValue: (r) => r.when },
              {
                key: 'amount',
                header: 'Amount',
                align: 'end',
                sortValue: (r) => r.amount,
                cell: (r) => <PriceTag amount={r.amount} size="sm" />,
              },
              { key: 'status', header: 'Status', cell: (r) => <StatusPill status={r.status} /> },
            ]}
          />
          <div className="grid gap-4 lg:grid-cols-3">
            <DataTable
              caption="Loading"
              rows={[] as BookingRow[]}
              rowKey={(r) => r.id}
              columns={[{ key: 'id', header: 'Booking' }]}
              loading
            />
            <DataTable
              caption="Empty"
              rows={[] as BookingRow[]}
              rowKey={(r) => r.id}
              columns={[{ key: 'id', header: 'Booking' }]}
              empty={{
                title: 'No refund requests',
                description: 'Requests from cancelled bookings land here.',
              }}
            />
            <DataTable
              caption="Error"
              rows={[] as BookingRow[]}
              rowKey={(r) => r.id}
              columns={[{ key: 'id', header: 'Booking' }]}
              error="The bookings list didn't load. Try again."
              onRetry={() => {}}
            />
          </div>
        </Section>

        <Section
          id="calendar"
          title="Calendar"
          note="Day view: one column per court. Week view: one court across the week. Tap a free hour to add a walk-in."
        >
          <div>
            <CalendarToolbar
              title={
                view === 'day'
                  ? formatDay(calDay, 'en', { weekday: 'long', month: 'long' })
                  : `Week of ${formatDay(calDay)}`
              }
              view={view}
              onViewChange={setView}
              onPrev={() => setCalDay(addDays(calDay, view === 'day' ? -1 : -7))}
              onNext={() => setCalDay(addDays(calDay, view === 'day' ? 1 : 7))}
              onToday={() => setCalDay(TODAY)}
            />
            {view === 'day' ? (
              <Calendar
                label="Courts calendar"
                columns={COURTS}
                events={calDay === TODAY ? events : []}
                nowMinutes={calDay === TODAY ? 16 * 60 + 20 : undefined}
                onSlotClick={(court, start) => setWalkIn({ court, start })}
                onEventClick={(e) =>
                  toast({ title: e.title, description: `${e.start}–${e.end}`, tone: 'info' })
                }
              />
            ) : (
              <Calendar
                label="Court 1 this week"
                columns={weekColumns}
                events={weekEvents}
                onSlotClick={(c, s) => setWalkIn({ court: c, start: s })}
              />
            )}
            <CalendarLegend />
          </div>
          <Calendar label="Loading calendar" columns={COURTS} events={[]} loading />
          <Dialog open={walkIn !== null} onOpenChange={(o) => !o && setWalkIn(null)}>
            <DialogContent
              title="Add a walk-in"
              description={
                walkIn
                  ? `${COURTS.find((c) => c.id === walkIn.court)?.label ?? walkIn.court}, ${walkIn.start}. Athletes won't be able to book this hour.`
                  : undefined
              }
              footer={
                <>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      if (!walkIn) return;
                      const h = Number(walkIn.start.slice(0, 2)) + 1;
                      setEvents((ev) => [
                        ...ev,
                        {
                          id: `w-${Date.now()}`,
                          columnId: walkIn.court,
                          start: walkIn.start,
                          end: `${String(h).padStart(2, '0')}:00`,
                          title: 'Walk-in',
                          kind: 'walk_in',
                        },
                      ]);
                      setWalkIn(null);
                      toast({
                        title: 'Walk-in added',
                        description: 'That hour is blocked for athletes.',
                      });
                    }}
                  >
                    Add walk-in
                  </Button>
                </>
              }
            >
              <Field label="Name (optional)">
                {({ id }) => <Input id={id} placeholder="Walk-in" />}
              </Field>
            </DialogContent>
          </Dialog>
        </Section>

        <Section
          id="shells"
          title="App shells"
          note="Open each layout at phone and desktop widths."
        >
          <ul className="grid gap-3 sm:grid-cols-3">
            {[
              ['/', 'Athlete', 'Top bar, bottom tabs on phones, operator link in the footer.'],
              ['/dashboard', 'Operator', 'Sidebar on desktop, scrollable tabs on phones.'],
              ['/dev/ui/shells/admin', 'SPORT Admin', 'Department sidebar, menu sheet on phones.'],
            ].map(([href, label, text]) => (
              <li key={href}>
                <Link
                  href={href!}
                  className="flex min-h-24 flex-col gap-1 rounded-lg border border-line bg-surface p-4 hover:border-line-strong"
                >
                  <span className="font-display text-2xl font-extrabold text-ink">{label}</span>
                  <span className="text-sm text-ink-muted">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </main>
    </div>
  );
}
