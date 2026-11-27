// Role-Based Access Control (RBAC) for SPORT Marketplace
// Enforces Athlete, Provider (Coach / Venue / Gym / Academy), and Admin rules.

const PROVIDER_ROLES = new Set(['coach', 'venue_operator', 'gym_operator', 'academy_operator']);

export function authenticate(authHeader, usersMap) {
  const token = (authHeader || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  return usersMap.get(token) || null;
}

export function requireRole(user, allowedRoles) {
  if (!user) {
    const err = new Error('Authentication required');
    err.statusCode = 401;
    throw err;
  }
  if (!allowedRoles.includes(user.role)) {
    const err = new Error(`Forbidden for role: ${user.role}`);
    err.statusCode = 403;
    throw err;
  }
}

export function canManageResource(user, resource) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (!PROVIDER_ROLES.has(user.role)) return false;
  return resource.ownerId === user.id;
}

export function canAccessBooking(user, booking) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return booking.athleteId === user.id;
}
