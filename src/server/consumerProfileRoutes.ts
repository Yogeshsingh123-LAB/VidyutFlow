import { IncomingMessage, ServerResponse } from 'http';
import { defaultServerDataStore } from './dataStore';
import { defaultServerAuthService } from './authRoutes';

export interface ConsumerAddressDto {
  id: string;
  userId: string;
  addressType: 'RESIDENTIAL' | 'COMMERCIAL' | 'CORRESPONDENCE' | 'BILLING';
  isPrimary: boolean;
  houseFlatNo: string;
  street: string;
  area: string;
  cityVillage: string;
  taluka: string;
  district: string;
  state: string;
  pinCode: string;
  formatted: string;
  createdAt: string;
}

export interface ConsumerConnectionDto {
  id: string;
  userId: string;
  consumerNo: string;
  discom: string;
  connectionType: string;
  sanctionedLoadKw: number;
  officialAddress: string;
  subdivision: string;
  feederName: string;
  status: string;
  isPrimary: boolean;
  linkedAt: string;
  source: string;
  readonlyNotice: string;
}

// In-memory store for demo/standalone node parity
const inMemoryAddresses: Map<string, ConsumerAddressDto[]> = new Map();
const inMemoryPreferences: Map<string, any> = new Map();
const inMemoryActivities: Map<string, any[]> = new Map();
const inMemoryConnectionOtps: Map<string, { otp: string; expiresAt: number; attempts: number }> = new Map();

function getUserIdFromReq(req: IncomingMessage): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const session = defaultServerAuthService.validateSession(token);
      if (session) return session.userId;
    } catch {
      // invalid or expired token
    }
  }
  // Fallback to active demo consumer
  return 'demo-consumer-meenaben-patel';
}

function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

export function isConsumerProfileRoutePath(pathname: string): boolean {
  return (
    pathname === '/api/v1/consumer' ||
    pathname.startsWith('/api/v1/consumer/') ||
    pathname === '/api/consumer' ||
    pathname.startsWith('/api/consumer/') ||
    pathname === '/consumer' ||
    pathname.startsWith('/consumer/')
  );
}

export async function handleConsumerProfileRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = req.url || '';
  if (!url.startsWith('/api/v1/consumer') && !url.startsWith('/api/consumer')) {
    return false;
  }

  const cleanPath = url.split('?')[0].replace(/^\/api\/v1\/consumer/, '').replace(/^\/api\/consumer/, '');
  const method = req.method || 'GET';
  const userId = getUserIdFromReq(req);

  // Initialize demo addresses if empty
  if (!inMemoryAddresses.has(userId)) {
    inMemoryAddresses.set(userId, [
      {
        id: 'addr-demo-01',
        userId,
        addressType: 'RESIDENTIAL',
        isPrimary: true,
        houseFlatNo: '14',
        street: 'Anand Nagar Society',
        area: 'Visnagar Road',
        cityVillage: 'Mehsana',
        taluka: 'Mehsana',
        district: 'Mehsana',
        state: 'Gujarat',
        pinCode: '384002',
        formatted: '14, Anand Nagar Society, Visnagar Road, Mehsana, Mehsana - 384002',
        createdAt: new Date().toISOString()
      }
    ]);
  }

  // Initialize preferences if empty
  if (!inMemoryPreferences.has(userId)) {
    inMemoryPreferences.set(userId, {
      preferred_language: 'en',
      sms_notifications: true,
      email_notifications: true,
      bill_reminders: true,
      outage_alerts: true,
      application_status_alerts: true
    });
  }

  // Initialize activity if empty
  if (!inMemoryActivities.has(userId)) {
    inMemoryActivities.set(userId, [
      {
        id: 'act-demo-01',
        event_type: 'PROFILE_UPDATED',
        description: 'Account verified and initialized with citizen portal access',
        created_at: new Date(Date.now() - 86400000).toISOString()
      }
    ]);
  }

  // 1. GET /profile
  if ((cleanPath === '/profile' || cleanPath === '') && method === 'GET') {
    const addresses = inMemoryAddresses.get(userId) || [];
    const pref = inMemoryPreferences.get(userId);
    const ownedConns = defaultServerDataStore.getConsumerConnectionsForUser(userId);
    const isNewApplicant = ownedConns.length === 0;

    sendJson(res, 200, {
      user_id: userId,
      full_name: userId === 'demo-consumer-meenaben-patel' ? 'Smt. Meenaben Patel' : 'Citizen Consumer',
      date_of_birth: '1979-08-14',
      profile_photo_url: null,
      profile_completion_percentage: isNewApplicant ? 60 : 90,
      role: 'consumer',
      is_new_applicant: isNewApplicant,
      contacts: {
        email: userId === 'demo-consumer-meenaben-patel' ? 'meenaben.patel@example.com' : 'citizen@example.com',
        email_verified: true,
        mobile_number: '+91 98250 14820',
        mobile_verified: true
      },
      addresses_count: addresses.length,
      connections_count: ownedConns.length,
      preferred_language: pref.preferred_language,
      created_at: '2026-01-15T09:00:00Z',
      updated_at: new Date().toISOString()
    });
    return true;
  }

  // 2. PATCH /profile
  if (cleanPath === '/profile' && method === 'PATCH') {
    const body = await parseJsonBody(req);
    const activities = inMemoryActivities.get(userId) || [];
    activities.unshift({
      id: `act-${Date.now()}`,
      event_type: 'PROFILE_UPDATED',
      description: `Personal information updated (${body.full_name || 'profile data'})`,
      created_at: new Date().toISOString()
    });
    inMemoryActivities.set(userId, activities);
    sendJson(res, 200, { message: 'Profile updated successfully' });
    return true;
  }

  // 3. GET /addresses
  if (cleanPath === '/addresses' && method === 'GET') {
    const addrs = inMemoryAddresses.get(userId) || [];
    sendJson(res, 200, addrs);
    return true;
  }

  // 4. POST /addresses
  if (cleanPath === '/addresses' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.pin_code || !/^[1-9][0-9]{5}$/.test(body.pin_code)) {
      sendJson(res, 422, { detail: 'Valid 6-digit Indian PIN code required' });
      return true;
    }
    const addrs = inMemoryAddresses.get(userId) || [];
    const isPrimary = body.is_primary || addrs.length === 0;
    if (isPrimary) {
      addrs.forEach(a => { a.isPrimary = false; });
    }
    const newAddr: ConsumerAddressDto = {
      id: `addr-${Date.now()}`,
      userId,
      addressType: body.address_type || 'RESIDENTIAL',
      isPrimary,
      houseFlatNo: body.house_flat_no || '',
      street: body.street || '',
      area: body.area || '',
      cityVillage: body.city_village || '',
      taluka: body.taluka || '',
      district: body.district || '',
      state: body.state || 'Gujarat',
      pinCode: body.pin_code,
      formatted: `${body.house_flat_no || ''}, ${body.street || ''}, ${body.area || ''}, ${body.city_village || ''}, ${body.district || ''} - ${body.pin_code}`,
      createdAt: new Date().toISOString()
    };
    addrs.push(newAddr);
    inMemoryAddresses.set(userId, addrs);

    const activities = inMemoryActivities.get(userId) || [];
    activities.unshift({
      id: `act-${Date.now()}`,
      event_type: 'ADDRESS_ADDED',
      description: `Added address in ${newAddr.cityVillage} (${newAddr.pinCode})`,
      created_at: new Date().toISOString()
    });
    inMemoryActivities.set(userId, activities);

    sendJson(res, 201, newAddr);
    return true;
  }

  // 5. DELETE /addresses/:id
  if (cleanPath.startsWith('/addresses/') && method === 'DELETE') {
    const id = cleanPath.replace('/addresses/', '');
    let addrs = inMemoryAddresses.get(userId) || [];
    addrs = addrs.filter(a => a.id !== id);
    if (addrs.length > 0 && !addrs.some(a => a.isPrimary)) {
      addrs[0].isPrimary = true;
    }
    inMemoryAddresses.set(userId, addrs);
    sendJson(res, 200, { message: 'Address deleted successfully' });
    return true;
  }

  // 6. GET /connections
  if (cleanPath === '/connections' && method === 'GET') {
    const ownedConns = defaultServerDataStore.getConsumerConnectionsForUser(userId);
    sendJson(res, 200, {
      total_connections: ownedConns.length,
      is_new_applicant: ownedConns.length === 0,
      empty_state_help: ownedConns.length === 0 ? 'No electricity connection linked to your profile.' : null,
      connections: ownedConns.map((c: any, idx: number) => ({
        id: `conn-link-${c.consumerNo}`,
        consumer_no: c.consumerNo,
        discom: 'UGVCL',
        connection_type: c.category || 'RGP',
        sanctioned_load_kw: c.sanctionedLoadKw || 4.0,
        official_address: c.address,
        subdivision: c.subdivision,
        feeder_name: c.feederName || 'Express Feeder-01',
        status: 'ACTIVE',
        is_primary: idx === 0,
        linked_at: new Date().toISOString(),
        source: 'SELF_LINKED',
        readonly_notice: 'Official utility connection data verified by UGVCL. Consumers cannot modify metering or tariff details.'
      }))
    });
    return true;
  }

  // 7. POST /connections/link/initiate
  if (cleanPath === '/connections/link/initiate' && method === 'POST') {
    const body = await parseJsonBody(req);
    const consumerNo = body.consumer_no || '04281-99231';
    inMemoryConnectionOtps.set(`${userId}:${consumerNo}`, {
      otp: '482019',
      expiresAt: Date.now() + 600000,
      attempts: 0
    });
    sendJson(res, 200, {
      status: 'OTP_SENT',
      consumer_no: consumerNo,
      masked_mobile: '+91 XXXXX XX92',
      expires_in_seconds: 600,
      demo_verification_code: '482019',
      message: 'Verification code sent to registered mobile +91 XXXXX XX92.'
    });
    return true;
  }

  // 8. POST /connections/link/verify
  if (cleanPath === '/connections/link/verify' && method === 'POST') {
    const body = await parseJsonBody(req);
    const consumerNo = body.consumer_no;
    const rec = inMemoryConnectionOtps.get(`${userId}:${consumerNo}`);
    if (!rec || rec.otp !== body.otp) {
      sendJson(res, 400, { detail: 'Incorrect verification code. Please try again.' });
      return true;
    }
    // Link connection to user in datastore
    defaultServerDataStore.linkConsumerConnection(userId, consumerNo);

    const activities = inMemoryActivities.get(userId) || [];
    activities.unshift({
      id: `act-${Date.now()}`,
      event_type: 'CONNECTION_LINKED',
      description: `Linked electricity connection ${consumerNo} after OTP verification`,
      created_at: new Date().toISOString()
    });
    inMemoryActivities.set(userId, activities);

    sendJson(res, 200, {
      status: 'LINKED_SUCCESS',
      connection: {
        id: `conn-link-${consumerNo}`,
        consumer_no: consumerNo,
        discom: 'UGVCL',
        status: 'ACTIVE',
        is_primary: true
      },
      message: `Connection ${consumerNo} successfully verified and linked to your citizen profile.`
    });
    return true;
  }

  // 9. GET /preferences
  if (cleanPath === '/preferences' && method === 'GET') {
    const pref = inMemoryPreferences.get(userId);
    sendJson(res, 200, pref);
    return true;
  }

  // 10. PATCH /preferences
  if (cleanPath === '/preferences' && method === 'PATCH') {
    const body = await parseJsonBody(req);
    const pref = inMemoryPreferences.get(userId) || {};
    Object.assign(pref, body);
    inMemoryPreferences.set(userId, pref);
    sendJson(res, 200, { message: 'Preferences updated successfully' });
    return true;
  }

  // 11. GET /security/sessions
  if (cleanPath === '/security/sessions' && method === 'GET') {
    sendJson(res, 200, [
      {
        id: 'sess-current-demo',
        ip_address: '127.0.0.1 (Localhost / Sandbox)',
        user_agent: 'Chrome / VidyutFlow Citizen Portal',
        is_current: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      }
    ]);
    return true;
  }

  // 12. POST /security/change-password
  if (cleanPath === '/security/change-password' && method === 'POST') {
    const body = await parseJsonBody(req);
    if (!body.current_password) {
      sendJson(res, 400, { detail: 'Current password required' });
      return true;
    }
    const activities = inMemoryActivities.get(userId) || [];
    activities.unshift({
      id: `act-${Date.now()}`,
      event_type: 'SECURITY_PASSWORD_CHANGED',
      description: 'Account password changed successfully',
      created_at: new Date().toISOString()
    });
    inMemoryActivities.set(userId, activities);
    sendJson(res, 200, { message: 'Password changed successfully.' });
    return true;
  }

  // 13. GET /activity
  if (cleanPath === '/activity' && method === 'GET') {
    const acts = inMemoryActivities.get(userId) || [];
    sendJson(res, 200, acts);
    return true;
  }

  return false;
}
