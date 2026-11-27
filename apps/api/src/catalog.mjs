// Sample catalog shared by both stores. Prices are whole EGP.
// The athlete app shows the same venues, so prices here must match apps/athlete-preview.

export const SEED_USERS = [
  { id: 'demo-athlete-marwan', role: 'athlete', name: 'Marwan' },
  { id: 'coach-fares', role: 'coach', name: 'Coach Fares Sadek' },
  { id: 'coach-nour', role: 'coach', name: 'Nour Amin' },
  { id: 'coach-omar', role: 'coach', name: 'Omar Adel' },
  { id: 'venue-coastal', role: 'venue_operator', name: 'Coastal Sports Club' },
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
