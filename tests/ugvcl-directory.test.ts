import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import http from 'node:http';
import { createProductionRequestHandler } from '../src/server/prodServer';
import { directoryStore } from '../src/server/directoryRoutes';

async function runDirectoryTestSuite() {
  console.log('\n================================================================');
  console.log('UGVCL ORGANIZATIONAL DIRECTORY TEST SUITE');
  console.log('Verifying Corporate, 4 Circles, 22 Divisions, Subdivisions,');
  console.log('Consumer Mapping, Hierarchy API, CSV Import, and Validations');
  console.log('================================================================\n');

  // Reset directory store to clean verified baseline
  directoryStore.reset();

  const handler = createProductionRequestHandler();
  const baseUrl = 'http://127.0.0.1:3000';

  const inMemoryFetch = async (urlStr: string, init?: RequestInit): Promise<Response> => {
    const urlObj = new URL(urlStr);
    const req = new EventEmitter() as any;
    req.method = (init?.method || 'GET').toUpperCase();
    req.url = urlObj.pathname + urlObj.search;
    req.headers = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { req.headers[k.toLowerCase()] = v; });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) { req.headers[k.toLowerCase()] = v; }
      } else {
        for (const [k, v] of Object.entries(init.headers)) { req.headers[k.toLowerCase()] = String(v); }
      }
    }
    if (!req.headers['host']) req.headers['host'] = urlObj.host || '127.0.0.1:3000';
    req.socket = { remoteAddress: '127.0.0.1' };

    const res = new EventEmitter() as any;
    res.statusCode = 200;
    res.headers = {};
    res.setHeader = (name: string, val: any) => { res.headers[name.toLowerCase()] = val; };
    res.getHeader = (name: string) => res.headers[name.toLowerCase()];
    res.removeHeader = (name: string) => { delete res.headers[name.toLowerCase()]; };

    const chunks: Buffer[] = [];
    const responsePromise = new Promise<Response>((resolve, reject) => {
      res.write = (chunk: any) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      res.end = (chunk?: any) => {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        res.writableEnded = true;
        const bodyBuf = Buffer.concat(chunks);
        const nodeHeaders = new Headers();
        for (const [k, v] of Object.entries(res.headers)) {
          if (Array.isArray(v)) {
            v.forEach(item => nodeHeaders.append(k, item));
          } else if (v !== undefined) {
            nodeHeaders.set(k, String(v));
          }
        }
        const webRes = new Response(bodyBuf, {
          status: res.statusCode,
          headers: nodeHeaders
        });
        resolve(webRes);
      };
      res.on('error', reject);
    });

    if (init?.body) {
      try {
        (req as any).body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch {
        // keep as is
      }
    }

    setImmediate(() => {
      try {
        handler(req as http.IncomingMessage, res as http.ServerResponse);
        if (init?.body) {
          const bodyStr = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
          req.emit('data', Buffer.from(bodyStr));
        }
        req.emit('end');
      } catch (err) {
        req.emit('error', err);
      }
    });

    return responsePromise;
  };

  let passedTests = 0;

  // ------------------------------------------------------------------------
  // Test 1: Verify 4 Circles & 22 Divisions Baseline Structure
  // ------------------------------------------------------------------------
  console.log('[Test 1] Verifying 4 Official Circles and 22 Divisions Baseline...');
  const resCounts = await inMemoryFetch(`${baseUrl}/api/directory/counts`);
  assert.equal(resCounts.status, 200, 'GET /api/directory/counts should return 200');
  const countsData = await resCounts.json();

  assert.equal(countsData.circles_count, 4, 'UGVCL must have exactly 4 circles');
  assert.equal(countsData.divisions_count, 22, 'UGVCL must have exactly 22 divisions');
  assert.ok(countsData.subdivisions_count > 0, 'Subdivisions must be populated');
  assert.ok(countsData.audit_sources.baseline_reference.includes('1 May 2025'), 'Audit sources should cite UGVCL 1 May 2025 disclosure');
  console.log('✓ PASS: Baseline counts verified (4 Circles, 22 Divisions).');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 2: Verify Exact Circle-to-Division Association in Hierarchy Tree
  // ------------------------------------------------------------------------
  console.log('[Test 2] Verifying Complete Organizational Hierarchy Tree...');
  const resTree = await inMemoryFetch(`${baseUrl}/api/directory/hierarchy`);
  assert.equal(resTree.status, 200, 'GET /api/directory/hierarchy should return 200');
  const tree = await resTree.json();

  assert.equal(tree.code, 'UGVCL');
  assert.equal(tree.circles.length, 4);

  const circleMap = new Map<string, any>();
  for (const c of tree.circles) {
    circleMap.set(c.code, c);
  }

  // Mehsana Circle (6 divisions)
  const mehsana = circleMap.get('CIR-MSH');
  assert.ok(mehsana, 'Mehsana Circle (CIR-MSH) must exist');
  assert.equal(mehsana.divisions.length, 6, 'Mehsana Circle must have 6 divisions');
  const mehsanaDivCodes = mehsana.divisions.map((d: any) => d.code);
  assert.ok(mehsanaDivCodes.includes('DIV-MSH-01'));
  assert.ok(mehsanaDivCodes.includes('DIV-VIS-02'));
  assert.ok(mehsanaDivCodes.includes('DIV-KDI-03'));
  assert.ok(mehsanaDivCodes.includes('DIV-UNJ-04'));
  assert.ok(mehsanaDivCodes.includes('DIV-VIJ-05'));
  assert.ok(mehsanaDivCodes.includes('DIV-PAT-06'));

  // Sabarmati Circle (5 divisions)
  const sabarmati = circleMap.get('CIR-SAB');
  assert.ok(sabarmati, 'Sabarmati Circle (CIR-SAB) must exist');
  assert.equal(sabarmati.divisions.length, 5, 'Sabarmati Circle must have 5 divisions');
  const sabarmatiDivCodes = sabarmati.divisions.map((d: any) => d.code);
  assert.ok(sabarmatiDivCodes.includes('DIV-GNR-01'));
  assert.ok(sabarmatiDivCodes.includes('DIV-KAL-02'));
  assert.ok(sabarmatiDivCodes.includes('DIV-CHK-03'));
  assert.ok(sabarmatiDivCodes.includes('DIV-DEH-04'));
  assert.ok(sabarmatiDivCodes.includes('DIV-MAN-05'));

  // Himatnagar Circle (5 divisions)
  const himatnagar = circleMap.get('CIR-HMT');
  assert.ok(himatnagar, 'Himatnagar Circle (CIR-HMT) must exist');
  assert.equal(himatnagar.divisions.length, 5, 'Himatnagar Circle must have 5 divisions');
  const hmtDivCodes = himatnagar.divisions.map((d: any) => d.code);
  assert.ok(hmtDivCodes.includes('DIV-HMT-01'));
  assert.ok(hmtDivCodes.includes('DIV-IDR-02'));
  assert.ok(hmtDivCodes.includes('DIV-MOD-03'));
  assert.ok(hmtDivCodes.includes('DIV-TLD-04'));
  assert.ok(hmtDivCodes.includes('DIV-KHB-05'));

  // Palanpur Circle (6 divisions)
  const palanpur = circleMap.get('CIR-PLN');
  assert.ok(palanpur, 'Palanpur Circle (CIR-PLN) must exist');
  assert.equal(palanpur.divisions.length, 6, 'Palanpur Circle must have 6 divisions');
  const plnDivCodes = palanpur.divisions.map((d: any) => d.code);
  assert.ok(plnDivCodes.includes('DIV-PLN-01'));
  assert.ok(plnDivCodes.includes('DIV-PLN-02'));
  assert.ok(plnDivCodes.includes('DIV-DSA-01'));
  assert.ok(plnDivCodes.includes('DIV-TRD-01'));
  assert.ok(plnDivCodes.includes('DIV-DHN-01'));
  assert.ok(plnDivCodes.includes('DIV-RDH-01'));

  console.log('✓ PASS: All 4 circles and 22 divisions matched official structural breakdown.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 3: Consumer Mapping - Confirmed Prefix Resolution
  // ------------------------------------------------------------------------
  console.log('[Test 3] Testing Consumer Mapping for Confirmed Prefix (04281-99231)...');
  const resMapKadi = await inMemoryFetch(`${baseUrl}/api/directory/consumer-mapping/04281-99231`);
  assert.equal(resMapKadi.status, 200);
  const kadiData = await resMapKadi.json();

  assert.equal(kadiData.requires_verification, false, 'Confirmed prefix must not require manual verification');
  assert.equal(kadiData.division.name, 'Kadi Division');
  assert.equal(kadiData.division.code, 'DIV-KDI-03');
  assert.equal(kadiData.circle.name, 'Mehsana Circle');
  assert.ok(kadiData.subdivision.name.includes('Kadi'));
  assert.ok(kadiData.subdivision.phone, 'Office contact phone must be present');
  console.log('✓ PASS: Confirmed consumer correctly mapped to Kadi Division under Mehsana Circle.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 4: Consumer Mapping - Unconfirmed/Unknown Prefix Fallback
  // ------------------------------------------------------------------------
  console.log('[Test 4] Testing Consumer Mapping for Unknown Consumer (requires_verification: true)...');
  const resMapUnknown = await inMemoryFetch(`${baseUrl}/api/directory/consumer-mapping/99999-12345`);
  assert.equal(resMapUnknown.status, 200);
  const unknownData = await resMapUnknown.json();

  assert.equal(unknownData.requires_verification, true, 'Unconfirmed connection must explicitly return requires_verification: true');
  assert.ok(unknownData.message.includes('requires verification'), 'Must provide explanatory verification message');
  assert.equal(unknownData.division, undefined, 'Must not hallucinate or guess a division');
  console.log('✓ PASS: Unknown consumer connection cleanly flags verification without guessing.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 5: Global Search & Cascading Filter Isolation
  // ------------------------------------------------------------------------
  console.log('[Test 5] Testing Search and Cascading Filter Isolation...');
  // Search query "Kadi"
  const resSearchKadi = await inMemoryFetch(`${baseUrl}/api/directory/search?q=kadi`);
  assert.equal(resSearchKadi.status, 200);
  const searchKadi = await resSearchKadi.json();
  assert.ok(searchKadi.count > 0, 'Search for Kadi should find offices');
  const hasKadiDiv = searchKadi.results.some((r: any) => r.code === 'DIV-KDI-03');
  assert.ok(hasKadiDiv, 'Results must contain Kadi division');

  // Search filtered by circle CIR-PLN (Palanpur)
  const resFilterPln = await inMemoryFetch(`${baseUrl}/api/directory/search?circle_id=CIR-PLN`);
  assert.equal(resFilterPln.status, 200);
  const filterPln = await resFilterPln.json();
  assert.ok(filterPln.count > 0);
  // Ensure every division returned belongs to Palanpur Circle
  const nonPlnDiv = filterPln.results.find((r: any) => r.type === 'division' && r.circle_id !== 'CIR-PLN');
  assert.equal(nonPlnDiv, undefined, 'No division outside Palanpur should be returned when filtered');
  console.log('✓ PASS: Search and circle filtering work with strict boundary isolation.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 6: Safe Office Creation Validations (Duplicate Code Rejection)
  // ------------------------------------------------------------------------
  console.log('[Test 6] Testing Office Creation - Duplicate Code Rejection (409 Conflict)...');
  const resDup = await inMemoryFetch(`${baseUrl}/api/directory/offices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      office_type: 'division',
      parent_id: 'CIR-MSH',
      code: 'DIV-MSH-01', // already exists
      name: 'Duplicate Mehsana Division'
    })
  });
  assert.equal(resDup.status, 409, 'Creating office with duplicate code must return 409 Conflict');
  const dupErr = await resDup.json();
  assert.ok(dupErr.detail.includes('already exists'), 'Error message must explain duplicate');
  console.log('✓ PASS: Duplicate office code correctly rejected with 409 Conflict.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 7: Safe Office Creation Validations (Missing Parent Validation)
  // ------------------------------------------------------------------------
  console.log('[Test 7] Testing Office Creation - Missing Parent Validation (422 Unprocessable)...');
  const resMissingParent = await inMemoryFetch(`${baseUrl}/api/directory/offices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      office_type: 'division',
      parent_id: 'NON-EXISTENT-CIRCLE-ID',
      code: 'DIV-NEW-99',
      name: 'Orphan Division'
    })
  });
  assert.equal(resMissingParent.status, 422, 'Creating office with invalid parent must return 422 Unprocessable Entity');
  const parentErr = await resMissingParent.json();
  assert.ok(parentErr.detail.includes('parent Circle'), 'Error message must report missing parent');
  console.log('✓ PASS: Missing parent relationship rejected with 422 Unprocessable Entity.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 8: Safe CSV Import - Dry Run Preview and Error Validation
  // ------------------------------------------------------------------------
  console.log('[Test 8] Testing Safe CSV Import (Dry Run Preview & Duplicate/Orphan Detection)...');
  const csvPayload = {
    dry_run: true,
    rows: [
      { office_type: 'division', code: 'DIV-MSH-01', name: 'Dupe Div', parent_code: 'CIR-MSH' }, // duplicate code
      { office_type: 'division', code: 'DIV-ORPHAN-01', name: 'Orphan Div', parent_code: 'CIR-INVALID' }, // parent not found
      { office_type: 'division', code: 'DIV-NEWVALID-01', name: 'New Valid Division', parent_code: 'CIR-MSH', phone: '02762-229988' }
    ]
  };

  const resCsvDry = await inMemoryFetch(`${baseUrl}/api/directory/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(csvPayload)
  });
  assert.equal(resCsvDry.status, 200);
  const dryData = await resCsvDry.json();

  assert.equal(dryData.dry_run, true);
  assert.equal(dryData.total_rows, 3);
  assert.equal(dryData.errors_count, 2, 'Should flag 2 erroneous rows (duplicate and invalid parent)');
  assert.equal(dryData.valid_rows, 1, 'Should identify 1 valid row');
  assert.equal(dryData.imported, 0, 'Dry run must not mutate database store');
  console.log('✓ PASS: CSV dry run successfully detected duplicates and missing parents without mutating store.');
  passedTests++;

  // ------------------------------------------------------------------------
  // Test 9: Safe CSV Import - Non-Dry Run Execution
  // ------------------------------------------------------------------------
  console.log('[Test 9] Testing CSV Import - Execution of Valid Records...');
  const resCsvExec = await inMemoryFetch(`${baseUrl}/api/directory/import-csv`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dry_run: false,
      rows: [
        { office_type: 'division', code: 'DIV-TEST-IMPORT', name: 'Imported Test Division', parent_code: 'CIR-MSH', phone: '02762-221199' }
      ]
    })
  });
  assert.equal(resCsvExec.status, 200);
  const execData = await resCsvExec.json();
  assert.equal(execData.imported, 1, 'Valid record should be imported');

  // Verify the new division appears in search
  const resVerify = await inMemoryFetch(`${baseUrl}/api/directory/search?q=DIV-TEST-IMPORT`);
  const verifyData = await resVerify.json();
  assert.equal(verifyData.count, 1);
  assert.equal(verifyData.results[0].code, 'DIV-TEST-IMPORT');
  console.log('✓ PASS: Valid record imported and searchable in organizational directory.');
  passedTests++;

  console.log('\n================================================================');
  console.log(`ALL ${passedTests} UGVCL DIRECTORY TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runDirectoryTestSuite().catch(err => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
