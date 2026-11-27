// Sample catalog shared by both stores. Prices are whole EGP.
// The athlete app shows the same venues, so prices here must match apps/athlete-preview.

export const SEED_USERS = [
  { id: 'demo-athlete-marwan', role: 'athlete', name: 'Marwan' },
  { id: 'coach-fares', role: 'coach', name: 'Coach Fares Sadek' },
  { id: 'coach-nour', role: 'coach', name: 'Nour Amin' },
  { id: 'coach-omar', role: 'coach', name: 'Omar Adel' },
  { id: 'venue-coastal', role: 'venue_operator', name: 'Coastal Sports Club' },
  { id: 'gym-apex', role: 'gym_operator', name: 'Apex Athletic Club' },
  { id: 'academy-alex-youth', role: 'academy_operator', name: 'Alexandria Youth Football Academy' },
  { id: 'admin-sport', role: 'admin', name: 'SPORT Ops Admin' },
];

// Pitches on the Courts page and coaches on the Coaches page.
// fixedVenue = null means the coach has no listed venue, which unlocks the court add-on.
export const SEED_RESOURCES = [
  { id: 'smouha', kind: 'court', sport: 'football', name: 'North Pitch', area: 'Smouha', price: 500, hours: [9, 10, 11, 18], ownerId: 'venue-coastal' },
  { id: 'gleem', kind: 'court', sport: 'football', name: 'Seafront Pitch', area: 'Gleem', price: 700, hours: [10, 11, 16, 17], ownerId: 'venue-coastal' },
  { id: 'montaza', kind: 'court', sport: 'football', name: 'East Ground', area: 'Montaza', price: 1100, hours: [9, 12, 15, 20], ownerId: 'venue-coastal' },
  { id: 'padel-coach', kind: 'coach', sport: 'padel', name: 'Karim El-Masry (Padel)', area: 'Smouha', fixedVenue: 'Smouha Padel Club', price: 450, hours: [9, 11, 17, 19], ownerId: 'coach-fares' },
  { id: 'nour', kind: 'coach', sport: 'football', name: 'Nour Amin', area: 'Smouha', fixedVenue: 'Smouha training ground', price: 350, hours: [9, 11, 16, 18], ownerId: 'coach-nour' },
  { id: 'omar', kind: 'coach', sport: 'football', name: 'Omar Adel', area: 'Alexandria', fixedVenue: null, price: 400, hours: [10, 11, 17, 18], ownerId: 'coach-omar' },
];

// Facility clubs. Resource key: <sport>/<clubId>/<branchIndex>/<unitNumber>
export const SPORTS = { padel: ['Padel', 'Court', 520], football: ['Football', 'Pitch', 500], padbol: ['Padbol', 'Court', 400], pickleball: ['Pickleball', 'Court', 320], tennis: ['Tennis', 'Court', 450], basketball: ['Basketball', 'Court', 600], squash: ['Squash', 'Court', 300], handball: ['Handball', 'Court', 350], volleyball: ['Volleyball', 'Court', 350] };
export const CLUBS = [
  { id: 'coastal', name: 'Coastal Sports Club', branches: [['Gleem', 3], ['Smouha', 2]], ownerId: 'venue-coastal' },
  { id: 'east', name: 'Eastside Sports Centre', branches: [['Montaza', 2], ['Sidi Bishr', 3]], ownerId: null },
  { id: 'city', name: 'City Sports Grounds', branches: [['Sporting', 3], ['Roushdy', 2]], ownerId: null },
];
const MARKET_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export function marketResource(key) {
  const [sportId, clubId, b, n] = String(key).split('/');
  const sport = SPORTS[sportId], ci = CLUBS.findIndex(c => c.id === clubId), branch = CLUBS[ci]?.branches[Number(b)];
  if (!sport || !branch || !/^\d+$/.test(b ?? '') || !/^\d+$/.test(n ?? '') || Number(n) < 1 || Number(n) > branch[1]) return null;
  return { id: key, kind: 'court', sport: sportId, name: `${CLUBS[ci].name} · ${branch[0]} · ${sport[1]} ${n}`, area: branch[0],
    price: sport[2] + ci * 50 + Number(b) * 25, hours: MARKET_HOURS, ownerId: CLUBS[ci].ownerId, fixedVenue: branch[0] };
}

export function allMarketResources() {
  const out = [];
  for (const sportId of Object.keys(SPORTS)) for (const club of CLUBS) club.branches.forEach(([, units], b) => {
    for (let n = 1; n <= units; n++) out.push(marketResource(`${sportId}/${club.id}/${b}/${n}`));
  });
  return out;
}

// A fresh, mutable copy of the catalog for one store instance (publishing state lives here).
export function createCatalog() {
  const resources = new Map(SEED_RESOURCES.map(r => [r.id, { fixedVenue: null, ...r, hours: [...r.hours], published: true }]));
  const market = new Map();
  return {
    resources,
    lookup(id) {
      if (resources.has(id)) return resources.get(id);
      if (!market.has(id)) { const r = marketResource(id); if (!r) return null; market.set(id, { ...r, published: true }); }
      return market.get(id);
    },
    listPublished: () => [...resources.values()].filter(r => r.published),
  };
}

// Gyms and Academies (discovery + direct enquiry). Prices are whole EGP. ownerId = the provider who receives enquiries.
// The athlete app keeps an offline copy of these listings and loads this list from the API when the API is running.
export const GYMS = [
  { id: 'gold-smouha', kind: 'gym', name: 'Apex Athletic Club', area: 'Smouha', plans: { Monthly: 1450, Quarterly: 3800, Annual: 12500 }, facilities: ['Pool', 'Sauna', 'CrossFit Zone', 'Padel Access'], hours: '06:00 – 00:00', trial: 'Free 1-day guest pass', note: 'Olympic indoor lap pool + direct member discount on Smouha padel courts.', ownerId: 'gym-apex' },
  { id: 'gleem-bay-fit', kind: 'gym', name: 'Bayfront Performance Gym', area: 'Gleem', plans: { Monthly: 1800, Quarterly: 4700, Annual: 15200 }, facilities: ['Sauna', 'Women-Only Hours', 'CrossFit Zone'], hours: '06:00 – 23:30', trial: 'Free body composition + trial session', note: 'Seafront cardio deck with dedicated women-only daily window (10:00–14:00).', ownerId: null },
  { id: 'sporting-iron', kind: 'gym', name: 'Sporting Strength & Conditioning', area: 'Sporting', plans: { Monthly: 950, Quarterly: 2500, Annual: 8400 }, facilities: ['CrossFit Zone'], hours: '07:00 – 23:00', trial: 'Free trial workout', note: 'Athlete-focused turf sprint lane, Olympic lifting platforms, and mobility studio.', ownerId: null },
  { id: 'montaza-wellness', kind: 'gym', name: 'Royal Gardens Health Club', area: 'Montaza', plans: { Monthly: 1600, Quarterly: 4200, Annual: 13800 }, facilities: ['Pool', 'Sauna', 'Women-Only Hours', 'Padel Access'], hours: '06:30 – 23:30', trial: 'Complimentary weekend day pass', note: 'Full spa recovery suite, heated pool, and 3 panoramic outdoor padel courts.', ownerId: null },
];
export const ACADEMIES = [
  { id: 'kick-smash-padel', kind: 'academy', name: 'Kick Smash Padel Academy', sport: 'Padel', area: 'Smouha', ages: ['U12 (9–12 yrs)', 'U16 (13–16 yrs)', 'Adults (17+)'], levels: ['Beginner', 'Intermediate', 'Competitive'], schedule: 'Sun & Tue · 17:00–18:30 (Youth) / 20:00–21:30 (Adults)', price: 2200, billing: 'Monthly (8 sessions)', coachLead: 'Coach Fares Sadek & Certified Padel Staff', summary: 'Structured technical drills, match-play tactics, and ranked ladder nights.', ownerId: 'coach-fares' },
  { id: 'alex-striker-fc', kind: 'academy', name: 'Alexandria Youth Football Academy', sport: 'Football', area: 'Montaza', ages: ['U8 (5–8 yrs)', 'U12 (9–12 yrs)', 'U16 (13–16 yrs)'], levels: ['Beginner', 'Intermediate', 'Competitive'], schedule: 'Mon, Wed & Fri · 16:30–18:00', price: 1650, billing: 'Monthly (12 sessions)', coachLead: 'CAF-Licensed Youth Coaching Team', summary: 'Age-grouped technical ball mastery, small-sided tactical games, and fitness tracking.', ownerId: 'academy-alex-youth' },
  { id: 'gleem-tennis-pro', kind: 'academy', name: 'Mediterranean Tennis School', sport: 'Tennis', area: 'Gleem', ages: ['U8 (5–8 yrs)', 'U12 (9–12 yrs)', 'Adults (17+)'], levels: ['Beginner', 'Intermediate'], schedule: 'Sat & Thu · 10:00–11:30 or 18:00–19:30', price: 1900, billing: 'Monthly (8 sessions)', coachLead: 'Egyptian Tennis Federation Certified Coaches', summary: 'Red/orange/green ball progression for juniors and evening cardio tennis for adults.', ownerId: null },
  { id: 'sporting-squash', kind: 'academy', name: 'Alexandria Squash Excellence', sport: 'Squash', area: 'Sporting', ages: ['U12 (9–12 yrs)', 'U16 (13–16 yrs)', 'Adults (17+)'], levels: ['Intermediate', 'Competitive'], schedule: 'Sun, Tue & Thu · 18:00–19:30', price: 2400, billing: 'Monthly (12 sessions)', coachLead: 'PSA Tour Alumni Coaching Staff', summary: 'Glass-back court footwork, ghosting conditioning, and national junior tournament prep.', ownerId: null },
];
export const SEED_LISTINGS = [...GYMS, ...ACADEMIES];
export const GYM_BILLING = ['Monthly', 'Quarterly', 'Annual'];

// Search filters shared by both stores. Unknown or empty filters are ignored.
export function filterListings(listings, kind, q = {}) {
  const text = String(q.q || '').toLowerCase().trim();
  const has = (v, list) => !v || list.includes(v);
  let out = listings.filter(l => l.kind === kind && l.published !== false);
  if (kind === 'gym') {
    out = out.filter(g => has(q.area, [g.area]) && has(q.facility, g.facilities)
      && (!text || [g.name, g.area, g.note, ...g.facilities].join(' ').toLowerCase().includes(text)));
    const billing = GYM_BILLING.includes(q.billing) ? q.billing : 'Monthly';
    if (q.sort === 'price') out.sort((a, b) => a.plans[billing] - b.plans[billing]);
  } else {
    out = out.filter(a => has(q.sport, [a.sport]) && has(q.area, [a.area]) && has(q.age, a.ages) && has(q.level, a.levels)
      && (!text || [a.name, a.sport, a.area, a.summary, a.coachLead].join(' ').toLowerCase().includes(text)));
  }
  return out;
}

// What the public sees: everything except the owner.
export const publicListing = ({ ownerId, ...l }) => l;
