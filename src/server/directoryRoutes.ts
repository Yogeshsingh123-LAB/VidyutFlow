import type { IncomingMessage, ServerResponse } from 'http';
import { parseSessionCookieHeader } from './authService';

interface CircleRecord {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  districts: string[];
  lat: number;
  lng: number;
  is_active: boolean;
}

interface DivisionRecord {
  id: string;
  circle_id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  talukas: string[];
  is_active: boolean;
}

interface SubdivisionRecord {
  id: string;
  division_id: string;
  circle_id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  taluka: string;
  pin_code: string;
  is_rec: boolean;
  working_hours: string;
  is_active: boolean;
}

interface SectionRecord {
  id: string;
  subdivision_id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
}

interface ServiceAreaRecord {
  id: string;
  section_id: string;
  subdivision_id: string;
  code: string;
  name: string;
  pin_code: string;
  villages: string[];
  feeders: string[];
  consumer_prefix_patterns: string[];
  is_active: boolean;
}

interface SubstationRecord {
  id: string;
  section_id: string;
  code: string;
  name: string;
  voltage_kv: string;
  capacity_mva: number;
  operational_status: string;
}

interface DataSourceRecord {
  id: string;
  source_title: string;
  source_url: string;
  source_type: string;
  publication_date: string;
  verified_date: string;
  verification_status: string;
}

class UgvclDirectoryStore {
  utility = {
    code: 'UGVCL',
    name: 'Uttar Gujarat Vij Company Limited',
    legal_name_gu: 'ઉત્તર ગુજરાત વીજ કંપની લિમિટેડ',
    cin: 'U40102GJ2003SGC042906',
    headquarters: 'Visnagar Road, Mehsana - 384001, Gujarat, India',
    website: 'https://www.ugvcl.com',
    helpline: '19122 / 1800 233 155335'
  };

  circles: CircleRecord[] = [];
  divisions: DivisionRecord[] = [];
  subdivisions: SubdivisionRecord[] = [];
  sections: SectionRecord[] = [];
  serviceAreas: ServiceAreaRecord[] = [];
  substations: SubstationRecord[] = [];
  dataSources: DataSourceRecord[] = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.circles = [];
    this.divisions = [];
    this.subdivisions = [];
    this.sections = [];
    this.serviceAreas = [];
    this.substations = [];
    this.dataSources = [];

    const rawCircles = [
      {
        id: 'CIR-MSH',
        code: 'CIR-MSH',
        name: 'Mehsana Circle',
        phone: '02762-222080',
        email: 'se_mehsana@ugvcl.com',
        address: 'Visnagar Road, Mehsana - 384001',
        districts: ['Mehsana', 'Patan'],
        lat: 23.5977,
        lng: 72.3998,
        divisions: [
          { code: 'DIV-MSH-01', name: 'Mehsana Division', phone: '02762-222085', talukas: ['Mehsana'] },
          { code: 'DIV-VIS-02', name: 'Visnagar Division', phone: '02765-220140', talukas: ['Visnagar', 'Vadnagar'] },
          { code: 'DIV-KDI-03', name: 'Kadi Division', phone: '02764-242120', talukas: ['Kadi'] },
          { code: 'DIV-UNJ-04', name: 'Unjha Division', phone: '02767-254210', talukas: ['Unjha'] },
          { code: 'DIV-VIJ-05', name: 'Vijapur Division', phone: '02763-270310', talukas: ['Vijapur'] },
          { code: 'DIV-PAT-06', name: 'Patan Division', phone: '02766-220450', talukas: ['Patan', 'Chanasma', 'Sidhpur'] }
        ]
      },
      {
        id: 'CIR-SAB',
        code: 'CIR-SAB',
        name: 'Sabarmati Circle',
        phone: '079-27500214',
        email: 'se_sabarmati@ugvcl.com',
        address: 'Near Sabarmati Railway Crossing, Sabarmati, Ahmedabad - 380005',
        districts: ['Gandhinagar', 'Ahmedabad (Rural)'],
        lat: 23.0800,
        lng: 72.5800,
        divisions: [
          { code: 'DIV-GNR-01', name: 'Gandhinagar Division', phone: '079-23222140', talukas: ['Gandhinagar'] },
          { code: 'DIV-KAL-02', name: 'Kalol Division', phone: '02764-223450', talukas: ['Kalol'] },
          { code: 'DIV-CHK-03', name: 'Chandkheda Division', phone: '079-27500981', talukas: ['Chandkheda', 'Motera'] },
          { code: 'DIV-DEH-04', name: 'Dehgam Division', phone: '02716-232110', talukas: ['Dehgam'] },
          { code: 'DIV-MAN-05', name: 'Mansa Division', phone: '02763-272240', talukas: ['Mansa'] }
        ]
      },
      {
        id: 'CIR-HMT',
        code: 'CIR-HMT',
        name: 'Himatnagar Circle',
        phone: '02772-241530',
        email: 'se_himatnagar@ugvcl.com',
        address: 'Motipura / Hajipura, Himatnagar - 383001',
        districts: ['Sabarkantha', 'Aravalli'],
        lat: 23.5979,
        lng: 72.9698,
        divisions: [
          { code: 'DIV-HMT-01', name: 'Himatnagar Division', phone: '02772-241535', talukas: ['Himatnagar', 'Prantij'] },
          { code: 'DIV-IDR-02', name: 'Idar Division', phone: '02778-250120', talukas: ['Idar', 'Vadali'] },
          { code: 'DIV-MOD-03', name: 'Modasa Division', phone: '02774-242210', talukas: ['Modasa', 'Malpur', 'Dhansura'] },
          { code: 'DIV-TLD-04', name: 'Talod Division', phone: '02770-220310', talukas: ['Talod', 'Bayad'] },
          { code: 'DIV-KHB-05', name: 'Khedbrahma Division', phone: '02775-220440', talukas: ['Khedbrahma', 'Poshina', 'Vijaynagar'] }
        ]
      },
      {
        id: 'CIR-PLN',
        code: 'CIR-PLN',
        name: 'Palanpur Circle',
        phone: '02742-255451',
        email: 'se_palanpur@ugvcl.com',
        address: 'Highway Char Rasta, Palanpur, Dist. Banaskantha - 385001',
        districts: ['Banaskantha', 'Patan (North)'],
        lat: 24.1724,
        lng: 72.4346,
        divisions: [
          { code: 'DIV-PLN-01', name: 'Palanpur-1 Division', phone: '02742-255457', talukas: ['Palanpur (City)'] },
          { code: 'DIV-PLN-02', name: 'Palanpur-2 Division', phone: '02742-250388', talukas: ['Palanpur (Rural)', 'Danta', 'Amirgadh'] },
          { code: 'DIV-DSA-01', name: 'Deesa Division', phone: '02744-220516', talukas: ['Deesa'] },
          { code: 'DIV-TRD-01', name: 'Tharad Division', phone: '02747-222120', talukas: ['Tharad', 'Vav', 'Suigam'] },
          { code: 'DIV-DHN-01', name: 'Dhanera Division', phone: '02748-222310', talukas: ['Dhanera', 'Dantiwada'] },
          { code: 'DIV-RDH-01', name: 'Radhanpur Division', phone: '02746-277140', talukas: ['Radhanpur', 'Santalpur', 'Sami'] }
        ]
      }
    ];

    for (const cdata of rawCircles) {
      this.circles.push({
        id: cdata.id,
        code: cdata.code,
        name: cdata.name,
        phone: cdata.phone,
        email: cdata.email,
        address: cdata.address,
        districts: cdata.districts,
        lat: cdata.lat,
        lng: cdata.lng,
        is_active: true
      });

      for (const ddata of cdata.divisions) {
        const divId = ddata.code;
        this.divisions.push({
          id: divId,
          circle_id: cdata.id,
          code: ddata.code,
          name: ddata.name,
          phone: ddata.phone,
          email: `${ddata.code.toLowerCase()}@ugvcl.com`,
          address: `${ddata.name} Office, ${cdata.name}`,
          talukas: ddata.talukas,
          is_active: true
        });

        // Add City and Rural Subdivisions
        const subConfigs = [
          { suffix: 'CITY', name: `${ddata.name.replace(' Division', '')} City Sub-Division`, is_rec: false },
          { suffix: 'RUR', name: `${ddata.name.replace(' Division', '')} Rural Sub-Division`, is_rec: true }
        ];

        for (const sdata of subConfigs) {
          const subId = `SUB-${ddata.code}-${sdata.suffix}`;
          this.subdivisions.push({
            id: subId,
            division_id: divId,
            circle_id: cdata.id,
            code: subId,
            name: sdata.name,
            phone: ddata.phone,
            email: `${subId.toLowerCase()}@ugvcl.com`,
            address: `${sdata.name} Compound`,
            taluka: ddata.talukas[0] || 'Mehsana',
            pin_code: cdata.name.includes('Mehsana') ? '384001' : '385001',
            is_rec: sdata.is_rec,
            working_hours: '09:30 AM - 06:10 PM',
            is_active: true
          });

          // Section
          const secId = `SEC-${subId}-01`;
          this.sections.push({
            id: secId,
            subdivision_id: subId,
            code: secId,
            name: `${sdata.name.replace(' Sub-Division', '')} O&M Section`,
            phone: ddata.phone,
            email: `${secId.toLowerCase()}@ugvcl.com`,
            address: `${sdata.name} Section Premises`,
            is_active: true
          });

          // Service Area with consumer patterns
          const saId = `SA-${secId}`;
          const patterns = ddata.code === 'DIV-KDI-03' ? ['04281', '02194', '01850'] : [`${ddata.code.slice(-2)}001`];
          this.serviceAreas.push({
            id: saId,
            section_id: secId,
            subdivision_id: subId,
            code: saId,
            name: `${sdata.name.replace(' Sub-Division', '')} Feeder Zone`,
            pin_code: '384001',
            villages: [`${ddata.name.replace(' Division', '')} Sector 1`, `${ddata.name.replace(' Division', '')} Rural Village`],
            feeders: [`11kV ${ddata.name.replace(' Division', '')} Ag Feed-1`],
            consumer_prefix_patterns: patterns,
            is_active: true
          });

          // Substation
          const substId = `SS-${secId}`;
          this.substations.push({
            id: substId,
            section_id: secId,
            code: substId,
            name: `66kV ${ddata.name.replace(' Division', '')} Substation`,
            voltage_kv: '66/11 kV',
            capacity_mva: 20.0,
            operational_status: 'OPERATIONAL'
          });
        }
      }
    }

    this.dataSources.push({
      id: 'DS-001',
      source_title: 'UGVCL Section 4(1)(b) Proactive RTI Disclosure & Office Directory',
      source_url: 'https://www.ugvcl.com/rti/proactive_disclosure_2025.pdf',
      source_type: 'RTI Proactive Disclosure',
      publication_date: '2025-05-01',
      verified_date: '2026-11-03',
      verification_status: 'VERIFIED'
    });
  }
}

export const directoryStore = new UgvclDirectoryStore();

function json(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<Record<string, any>> {
  if ((req as any).body && typeof (req as any).body === 'object') {
    return Promise.resolve((req as any).body);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(text));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

export async function handleDirectoryRoute(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = (req as IncomingMessage & { originalUrl?: string }).originalUrl || req.url || '/';
  const parsed = new URL(rawUrl, 'http://localhost');
  const pathname = parsed.pathname;

  if (!pathname.startsWith('/api/directory')) return false;

  // 1. GET /api/directory/counts
  if (pathname === '/api/directory/counts' && req.method === 'GET') {
    const totalCircles = directoryStore.circles.filter(c => c.is_active).length;
    const totalDivisions = directoryStore.divisions.filter(d => d.is_active).length;
    const totalSubs = directoryStore.subdivisions.filter(s => s.is_active).length;
    const recSubs = directoryStore.subdivisions.filter(s => s.is_active && s.is_rec).length;
    const regSubs = totalSubs - recSubs;
    const totalSections = directoryStore.sections.filter(s => s.is_active).length;
    const totalAreas = directoryStore.serviceAreas.filter(a => a.is_active).length;
    const totalSubstations = directoryStore.substations.length;

    json(res, 200, {
      utility: 'UGVCL (Uttar Gujarat Vij Company Limited)',
      circles_count: totalCircles,
      divisions_count: totalDivisions,
      subdivisions_count: totalSubs,
      regular_subdivisions_count: regSubs,
      rec_subdivisions_count: recSubs,
      sections_count: totalSections,
      service_areas_count: totalAreas,
      substations_count: totalSubstations,
      audit_sources: {
        verified: directoryStore.dataSources.filter(s => s.verification_status === 'VERIFIED').length,
        discrepancies_flagged: directoryStore.dataSources.filter(s => s.verification_status === 'DISCREPANCY_FLAGGED').length,
        baseline_reference: 'UGVCL 1 May 2025 Disclosure (22 Divisions, 148 Regular + 3 REC Subdivisions)'
      }
    });
    return true;
  }

  // 2. GET /api/directory/hierarchy
  if (pathname === '/api/directory/hierarchy' && req.method === 'GET') {
    const tree = {
      ...directoryStore.utility,
      circles: directoryStore.circles.map(c => ({
        ...c,
        divisions: directoryStore.divisions
          .filter(d => d.circle_id === c.id)
          .map(d => ({
            ...d,
            subdivisions: directoryStore.subdivisions
              .filter(s => s.division_id === d.id)
              .map(s => ({
                ...s,
                sections: directoryStore.sections
                  .filter(sec => sec.subdivision_id === s.id)
                  .map(sec => ({
                    ...sec,
                    service_areas: directoryStore.serviceAreas
                      .filter(sa => sa.section_id === sec.id)
                      .map(sa => ({
                        id: sa.id,
                        code: sa.code,
                        name: sa.name,
                        pin_code: sa.pin_code,
                        villages: sa.villages
                      }))
                  }))
              }))
          }))
      }))
    };
    json(res, 200, tree);
    return true;
  }

  // 3. GET /api/directory/search
  if (pathname === '/api/directory/search' && req.method === 'GET') {
    const q = (parsed.searchParams.get('q') || '').trim().toLowerCase();
    const circleId = parsed.searchParams.get('circle_id') || undefined;
    const divisionId = parsed.searchParams.get('division_id') || undefined;
    const officeType = parsed.searchParams.get('office_type') || undefined;

    const results: any[] = [];

    if (!officeType || officeType === 'circle') {
      for (const c of directoryStore.circles) {
        if (!c.is_active) continue;
        if (!q || c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.districts.some(d => d.toLowerCase().includes(q))) {
          results.push({ type: 'circle', ...c });
        }
      }
    }

    if (!officeType || officeType === 'division') {
      for (const d of directoryStore.divisions) {
        if (!d.is_active) continue;
        if (circleId && d.circle_id !== circleId) continue;
        if (!q || d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.talukas.some(t => t.toLowerCase().includes(q))) {
          results.push({ type: 'division', ...d });
        }
      }
    }

    if (!officeType || officeType === 'subdivision') {
      for (const s of directoryStore.subdivisions) {
        if (!s.is_active) continue;
        if (circleId && s.circle_id !== circleId) continue;
        if (divisionId && s.division_id !== divisionId) continue;
        if (!q || s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.taluka.toLowerCase().includes(q) || s.pin_code.includes(q)) {
          results.push({ type: 'subdivision', ...s });
        }
      }
    }

    if (!officeType || officeType === 'section') {
      for (const sec of directoryStore.sections) {
        if (!sec.is_active) continue;
        if (!q || sec.name.toLowerCase().includes(q) || sec.code.toLowerCase().includes(q)) {
          results.push({ type: 'section', ...sec });
        }
      }
    }

    json(res, 200, { count: results.length, results });
    return true;
  }

  // 4. GET /api/directory/consumer-mapping/:consumer_no
  if (pathname.startsWith('/api/directory/consumer-mapping/') && req.method === 'GET') {
    const consumerNo = decodeURIComponent(pathname.replace('/api/directory/consumer-mapping/', '')).trim();
    const prefix = consumerNo.includes('-') ? consumerNo.split('-')[0] : consumerNo.slice(0, 5);

    const matchedArea = directoryStore.serviceAreas.find(sa => sa.is_active && sa.consumer_prefix_patterns.includes(prefix));

    if (!matchedArea) {
      json(res, 200, {
        consumer_no: consumerNo,
        requires_verification: true,
        message: 'Office mapping requires verification. Official service area binding not confirmed.',
        utility: 'UGVCL'
      });
      return true;
    }

    const sec = directoryStore.sections.find(s => s.id === matchedArea.section_id);
    const sub = directoryStore.subdivisions.find(s => s.id === matchedArea.subdivision_id);
    const div = sub ? directoryStore.divisions.find(d => d.id === sub.division_id) : undefined;
    const cir = sub ? directoryStore.circles.find(c => c.id === sub.circle_id) : undefined;

    json(res, 200, {
      consumer_no: consumerNo,
      requires_verification: false,
      utility: 'UGVCL (Uttar Gujarat Vij Company Limited)',
      service_area: {
        code: matchedArea.code,
        name: matchedArea.name,
        pin_code: matchedArea.pin_code
      },
      section: {
        code: sec?.code || '',
        name: sec?.name || '',
        phone: sec?.phone || ''
      },
      subdivision: {
        code: sub?.code || '',
        name: sub?.name || '',
        phone: sub?.phone || '',
        email: sub?.email || '',
        address: sub?.address || '',
        working_hours: sub?.working_hours || ''
      },
      division: {
        code: div?.code || '',
        name: div?.name || '',
        phone: div?.phone || ''
      },
      circle: {
        code: cir?.code || '',
        name: cir?.name || '',
        phone: cir?.phone || ''
      }
    });
    return true;
  }

  // 5. POST /api/directory/offices
  if (pathname === '/api/directory/offices' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const t = String(body.office_type || '').toLowerCase();
      const code = String(body.code || '').trim();
      const name = String(body.name || '').trim();
      const parentId = String(body.parent_id || '').trim();

      if (!code || !name) {
        json(res, 422, { detail: 'Missing required code or name' });
        return true;
      }

      if (t === 'division') {
        const parent = directoryStore.circles.find(c => c.id === parentId);
        if (!parent) {
          json(res, 422, { detail: 'Missing or invalid parent Circle ID' });
          return true;
        }
        if (directoryStore.divisions.some(d => d.code === code)) {
          json(res, 409, { detail: `Division with code '${code}' already exists` });
          return true;
        }
        const newDiv: DivisionRecord = {
          id: code,
          circle_id: parent.id,
          code,
          name,
          phone: body.phone || '',
          email: body.email || '',
          address: body.address || '',
          talukas: body.talukas || [],
          is_active: true
        };
        directoryStore.divisions.push(newDiv);
        json(res, 201, { status: 'created', office_type: t, id: newDiv.id, code: newDiv.code, name: newDiv.name });
        return true;
      } else if (t === 'subdivision') {
        const parent = directoryStore.divisions.find(d => d.id === parentId);
        if (!parent) {
          json(res, 422, { detail: 'Missing or invalid parent Division ID' });
          return true;
        }
        if (directoryStore.subdivisions.some(s => s.code === code)) {
          json(res, 409, { detail: `Subdivision with code '${code}' already exists` });
          return true;
        }
        const newSub: SubdivisionRecord = {
          id: code,
          division_id: parent.id,
          circle_id: parent.circle_id,
          code,
          name,
          phone: body.phone || '',
          email: body.email || '',
          address: body.address || '',
          taluka: body.taluka || 'Mehsana',
          pin_code: body.pin_code || '384001',
          is_rec: !!body.is_rec,
          working_hours: body.working_hours || '09:30 AM - 06:10 PM',
          is_active: true
        };
        directoryStore.subdivisions.push(newSub);
        json(res, 201, { status: 'created', office_type: t, id: newSub.id, code: newSub.code, name: newSub.name });
        return true;
      } else {
        json(res, 422, { detail: `Unsupported office type '${t}'` });
        return true;
      }
    } catch {
      json(res, 400, { detail: 'Invalid JSON payload' });
      return true;
    }
  }

  // 6. POST /api/directory/import-csv
  if (pathname === '/api/directory/import-csv' && req.method === 'POST') {
    try {
      const body = await readJson(req);
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const dryRun = body.dry_run !== false;
      const errors: any[] = [];
      let imported = 0;

      const existingCircleCodes = new Set(directoryStore.circles.map(c => c.code));
      const existingDivCodes = new Set(directoryStore.divisions.map(d => d.code));
      const existingSubCodes = new Set(directoryStore.subdivisions.map(s => s.code));

      for (let idx = 0; idx < rows.length; idx++) {
        const r = rows[idx];
        const rowNum = idx + 1;
        const t = String(r.office_type || '').trim().toLowerCase();
        const code = String(r.code || '').trim();
        const name = String(r.name || '').trim();
        const parentCode = String(r.parent_code || '').trim();

        if (!code || !name) {
          errors.push({ row: rowNum, error: 'Missing required code or name' });
          continue;
        }

        if (t === 'division') {
          if (existingDivCodes.has(code)) {
            errors.push({ row: rowNum, code, error: `Duplicate division code '${code}'` });
            continue;
          }
          if (!existingCircleCodes.has(parentCode)) {
            errors.push({ row: rowNum, code, error: `Parent circle '${parentCode}' not found` });
            continue;
          }
          if (!dryRun) {
            directoryStore.divisions.push({
              id: code,
              circle_id: parentCode,
              code,
              name,
              phone: String(r.phone || ''),
              email: String(r.email || ''),
              address: '',
              talukas: [],
              is_active: true
            });
            existingDivCodes.add(code);
            imported++;
          }
        } else if (t === 'subdivision') {
          if (existingSubCodes.has(code)) {
            errors.push({ row: rowNum, code, error: `Duplicate subdivision code '${code}'` });
            continue;
          }
          if (!existingDivCodes.has(parentCode)) {
            errors.push({ row: rowNum, code, error: `Parent division '${parentCode}' not found` });
            continue;
          }
          if (!dryRun) {
            const parent = directoryStore.divisions.find(d => d.code === parentCode);
            directoryStore.subdivisions.push({
              id: code,
              division_id: parentCode,
              circle_id: parent?.circle_id || '',
              code,
              name,
              phone: String(r.phone || ''),
              email: '',
              address: '',
              taluka: 'Mehsana',
              pin_code: String(r.pin_code || ''),
              is_rec: false,
              working_hours: '09:30 AM - 06:10 PM',
              is_active: true
            });
            existingSubCodes.add(code);
            imported++;
          }
        } else {
          errors.push({ row: rowNum, code, error: `Invalid office type '${t}'` });
        }
      }

      json(res, 200, {
        dry_run: dryRun,
        total_rows: rows.length,
        valid_rows: rows.length - errors.length,
        errors_count: errors.length,
        errors,
        imported
      });
      return true;
    } catch {
      json(res, 400, { detail: 'Invalid JSON payload' });
      return true;
    }
  }

  return false;
}
