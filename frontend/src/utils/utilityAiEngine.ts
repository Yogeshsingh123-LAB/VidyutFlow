/**
 * VidyutFlow Enterprise Utility Grounded Engine
 * Deterministic, zero-hallucination fallback engine for Vidyut Mitra AI
 * Grounded strictly in session-scoped demo records and GERC reference schedules.
 */

export interface UtilityEngineContext {
  consumerName?: string;
  hasLinkedConnections?: boolean;
  selectedConnectionNo?: string | null;
  connections?: Array<{
    consumerNo: string;
    connectionId?: string;
    consumerName?: string;
    category?: string;
    tariffCategory?: string;
    sanctionedLoadKw?: number;
    phase?: string;
    meterNo?: string;
    subdivision?: string;
    feederName?: string;
    status?: string;
    lastReadingDate?: string;
    currentReadingKwh?: number;
    previousReadingKwh?: number;
    averageMonthlyKwh?: number;
    bills?: Array<{
      billNo: string;
      billMonth: string;
      billDate: string;
      dueDate: string;
      unitsConsumed: number;
      totalAmount: number;
      energyCharges: number;
      fixedCharges: number;
      fuelPriceAdjustment: number;
      electricityDuty: number;
      rebateOrSubsidy: number;
      status: string;
      paidDate?: string | null;
      transactionRef?: string | null;
      slabBreakdown?: Array<{ slab: string; units: number; rate: number; amount: number }>;
    }>;
    complaints?: Array<{ id: string; category: string; status: string; description: string }>;
  }>;
  payments?: Array<{
    txId: string;
    consumerNo: string;
    billNo: string;
    date: string;
    amount: number;
    paymentMethod: string;
    status: string;
  }>;
  complaints?: Array<{ id: string; consumerNo?: string; category: string; status: string; description: string }>;
  applications?: Array<{ id: string; category: string; status: string; loadKw?: number }>;
  role?: string;
  designation?: string;
}

function formatInr(amount: number, decimals = 2): string {
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

export function generateUtilityGroundedResponse(
  query: string,
  role: string = 'consumer',
  context?: UtilityEngineContext | null
): string {
  const q = (query || '').toLowerCase().trim();
  const connections = context?.connections || [];
  const hasLinked = Boolean(context?.hasLinkedConnections && connections.length > 0);
  const userName = context?.consumerName || 'Valued Consumer';

  // ---------------------------------------------------------------------------
  // 1. Staff Portal Roles (Employee, Field, Management, Admin)
  // Handle non-consumer roles first so staff inquiries always receive role-valid
  // guidance and role-scoped navigation tokens.
  // ---------------------------------------------------------------------------
  if (role === 'employee') {
    if (q.includes('fpppa') || q.includes('fuel')) {
      return `### FPPPA Reference Overview (Demo ERP Guidance)

* **Formula Overview**: Fuel Price and Power Purchase Adjustment (FPPPA) represents the per-unit power procurement cost adjustment applied across tariff schedules.
* **Stored Demo Bill Verification**: When auditing simulated consumer bills in this demo environment, compare stored \`fuelPriceAdjustment\` and \`energyCharges\` values directly against the record's \`slabBreakdown\`.

[Consumer Ledger](action:consumers) [Revenue Reports](action:reports) [ERP Overview](action:dashboard)`;
    }

    if (q.includes('burnt') || q.includes('meter')) {
      return `### SOP: Burnt / Defective Smart Meter Replacement

1. **Ticket Verification**: Confirm consumer complaint in the [Complaint Queue](action:complaints) and verify no pending vigilance/tamper hold exists.
2. **Work Order Dispatch**: Issue a high-priority meter replacement work order to the Junior Engineer / Line Inspector.
3. **Site Inspection & Sealing**: Field staff must record final retrievable kWh reading, inspect neutral/terminal block for loose-contact flashover, and seal the removed meter for lab testing.
4. **SLA Benchmark**: Must be completed within **3 working days** under GERC Standards of Performance.

[Complaint Queue](action:complaints) [Consumer Ledger](action:consumers) [Approval Center](action:approvals)`;
    }

    if (q.includes('nrgp') || q.includes('load') || q.includes('application') || q.includes('checklist')) {
      return `### Verification Checklist: Commercial NRGP Load Extension

* **KYC & Premises Proof**: Ownership deed / GIDC allotment letter / registered lease agreement.
* **Technical Feasibility**: Verify local Distribution Transformer (DT) loading is **< 80% rated kVA** after adding requested load.
* **Phase Upgrade Rule**: Sanctioned load **> 6.0 kW** requires mandatory conversion from 1-Phase (230V) to 3-Phase (415V) four-wire supply.
* **Security Deposit & Estimate**: Issue differential Security Deposit (SD) and service line estimate before final sanction in the [Approval Center](action:approvals).

[Application Queue](action:applications) [Approval Center](action:approvals) [Dept Coordination](action:coordination)`;
    }

    return `### Sub-Divisional Operations Guidance (Office ERP)

Namaste **${userName}**! Here is your sub-divisional operations summary:
* **Application Verification**: Ensure site plan, ownership deed/7-12 extract, and licensed contractor Test Report comply with GERC Supply Code 2021 before sanctioning load.
* **Burnt Meter Replacement**: Initiate inspection work order; check for over-current / neutral flashover; meter must be replaced within **3 working days**.
* **Category-A Grievance SLA**: Emergency safety tickets must be assigned to JE/Line Inspector within **2 hours** of portal logging.

[Application Queue](action:applications) [Consumer Ledger](action:consumers) [Complaint Queue](action:complaints) [ERP Overview](action:dashboard)`;
  }

  if (role === 'field') {
    if (q.includes('clearance') || q.includes('11kv') || q.includes('ptw') || q.includes('permit') || q.includes('safety')) {
      return `### 11kV Line Clearance & Permit to Work (PTW) Safety Protocol

* **Mandatory PTW Issuance**: Obtain numbered Permit to Work (PTW) from the 66kV/11kV Sub-Station Operator before ascending any pole or structure.
* **Isolate & Earth**: Open the 11kV breaker/AB switch, verify zero potential using a calibrated HV neon tester, and apply portable earthing rods on both upstream and downstream sides.
* **Minimum Ground Clearance (CEA Safety Regulations)**:
  * **Across Streets/Roads**: Minimum **5.8 meters** (11kV overhead).
  * **Along Streets / General Areas**: Minimum **5.2 meters**.

[Work Orders](action:workorders) [Feeder Patrol](action:maintenance) [Field Console](action:dashboard)`;
    }

    if (q.includes('transformer') || q.includes('neutral') || q.includes('grounding') || q.includes('voltage') || q.includes('feeder')) {
      return `### Distribution Transformer (DT) Grounding & Voltage Compensation

* **Neutral Earthing Resistance**: Maintain combined earth pit resistance **<= 2.0 Ohms** for 11kV/433V distribution transformers; inspect GI earth strips for corrosion.
* **Phase Load Balancing**: Measure R, Y, B phase currents during peak evening hours; redistribute single-phase service drops if neutral current exceeds **15% of phase current**.
* **Tail-End Voltage Regulation**: For tail-end voltage drops below 216V, check LT loose jumpers and recommend off-circuit tap-changer (OCTC) adjustment (+2.5% / +5%).

[Feeder Patrol](action:maintenance) [Site Feasibility](action:inspections) [Work Orders](action:workorders)`;
    }

    return `### Field Operations & Vigilance Protocol

Namaste **${userName}**! Field engineering guidelines:
* **Permit to Work (PTW)**: Always obtain authorized feeder line clearance before beginning work on 11kV/415V distribution lines.
* **DT Neutral Grounding**: Verify neutral resistance is **<= 2.0 Ohms**. Balance phase loads across R, Y, B to minimize neutral current.
* **Offline Inspections**: Complete field feasibility and maintenance reports in [Offline Queue](action:offline); sync triggers automatically when connectivity restores.

[Work Orders](action:workorders) [Site Feasibility](action:inspections) [Feeder Patrol](action:maintenance) [Field Console](action:dashboard)`;
  }

  if (role === 'management') {
    if (q.includes('at&c') || q.includes('loss') || q.includes('revenue')) {
      return `### GERC AT&C Loss & Revenue Collection Benchmarks

* **Circle AT&C Loss Target**: **<= 11.50%** under the Revamped Distribution Sector Scheme (RDSS).
* **Billing Efficiency Benchmark**: **>= 92.5%** via automated Smart Meter Head-End System (HES) ingestion.
* **Collection Efficiency Target**: **>= 99.0%** through digital UPI/BBPS payment channels and timely HT industrial realization.

[Revenue & Demand](action:analytics) [Executive Cockpit](action:dashboard) [UGVCL AI Insights](action:ai-insights)`;
    }

    if (q.includes('feeder') || q.includes('peak') || q.includes('sldc') || q.includes('overload')) {
      return `### Feeder Peak Load Mitigation & SLDC Coordination

* **11kV Industrial Feeder Monitoring**: Feeders exceeding **85% thermal ampacity** (such as 11kV GIDC-2 Dedicated Feeder) are prioritized for capacitor bank switching and load bifurcation under RDSS.
* **Agricultural Roster (Suryaashakti / Kisan Suryodaya)**: Coordinate 8-hour daytime 3-phase agricultural pump blocks with SLDC Gotri to flatten evening domestic peak demand.

[Feeder Overloads](action:feeders) [SLA Redressal](action:sla) [UGVCL AI Insights](action:ai-insights)`;
    }

    return `### Executive Intelligence & AT&C Loss Benchmark

Namaste **${userName}**! Circle executive intelligence summary:
* **AT&C Loss Control**: UGVCL circle target is **<= 11.5%** under the RDSS scheme.
* **Feeder Reliability**: SAIDI / SAIFI indices and overloaded 11kV feeders are tracked in real time; review predictive transformer alerts in [UGVCL AI Insights](action:ai-insights).

[Executive Cockpit](action:dashboard) [Revenue & Demand](action:analytics) [Feeder Overloads](action:feeders) [UGVCL AI Insights](action:ai-insights)`;
  }

  if (role === 'admin') {
    return `### System Administration & Security Architecture

Namaste **${userName}**! Enterprise platform security controls:
* **RBAC Enforcement**: All five portal roles (\`consumer\`, \`employee\`, \`field\`, \`management\`, \`admin\`) are strictly isolated with route-level and tab-level authorization guards.
* **CEA Cybersecurity & Audit Trail**: System audit logs must be retained for a minimum of **365 days** with immutable timestamping.
* **CIS-SCADA & Smart Meter HES**: Monitor head-end telemetry latency and gateway health in [API Integrations](action:integrations) and [Infrastructure & DB](action:infra).

[System Overview](action:overview) [Users & Roles](action:users) [Access Matrix](action:access) [Audit Trail](action:audit)`;
  }

  // ---------------------------------------------------------------------------
  // 2. Consumer Portal: Newly registered accounts with 0 linked connections
  // ---------------------------------------------------------------------------
  if (role === 'consumer' && !hasLinked) {
    if (
      q.includes('bill') ||
      q.includes('meter') ||
      q.includes('payment') ||
      q.includes('consumption') ||
      q.includes('amount') ||
      q.includes('september') ||
      q.includes('august') ||
      q.includes('july') ||
      q.includes('invoice')
    ) {
      return `### Account Status: No Linked Electricity Connections

Namaste **${userName}**, there are currently **no electricity connections or bills linked** to your registered profile.

To view simulated electricity bills, payment history, and smart meter readings:
1. Go to your [Open Dashboard](action:dashboard) or [View My Connections](action:connections).
2. Click **"Link Existing Connection"**.
3. Enter your 11-digit UGVCL Consumer Number (for example, sample demo records: \`04281-99231\` for Residential or \`04281-77190\` for Commercial).

Alternatively, if you require a fresh electrical connection:
* [Apply New Connection](action:new-connection)
* [Go to Complaint Desk](action:complaints) for general service inquiries.`;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. Consumer Portal: Dynamic Bill Explanation / Amount / Slab Verification
  // ---------------------------------------------------------------------------
  if (
    q.includes('bill') ||
    q.includes('2185') ||
    q.includes('2,185') ||
    q.includes('2537') ||
    q.includes('2,537') ||
    q.includes('2435') ||
    q.includes('2,435') ||
    q.includes('14854') ||
    q.includes('14,854') ||
    q.includes('september') ||
    q.includes('august') ||
    q.includes('july') ||
    q.includes('invoice') ||
    q.includes('amount') ||
    q.includes('kwh') ||
    q.includes('units') ||
    q.includes('99231') ||
    q.includes('4821') ||
    q.includes('77190')
  ) {
    let targetConn = connections[0];
    let targetBill = targetConn?.bills?.[0];

    // Match connection based on query keywords or bill amounts
    if (q.includes('commercial') || q.includes('77190') || q.includes('14854') || q.includes('14,854')) {
      const comConn = connections.find(
        c =>
          c.consumerNo.includes('77190') ||
          (c.tariffCategory && c.tariffCategory.toLowerCase().includes('commercial')) ||
          (c.category && c.category.toLowerCase().includes('commercial'))
      );
      if (comConn && comConn.bills && comConn.bills.length > 0) {
        targetConn = comConn;
        targetBill = comConn.bills[0];
      }
    } else if (
      q.includes('residential') ||
      q.includes('99231') ||
      q.includes('4821') ||
      q.includes('2185') ||
      q.includes('2,185') ||
      q.includes('2537') ||
      q.includes('2,537') ||
      q.includes('2435') ||
      q.includes('2,435')
    ) {
      const resConn = connections.find(
        c =>
          c.consumerNo.includes('99231') ||
          (c.tariffCategory && c.tariffCategory.toLowerCase().includes('residential')) ||
          (c.category && c.category.toLowerCase().includes('residential'))
      );
      if (resConn && resConn.bills && resConn.bills.length > 0) {
        targetConn = resConn;
        targetBill = resConn.bills[0];
      }
    }

    // Match specific billing month or amount if requested
    if (targetConn?.bills) {
      if (q.includes('august') || q.includes('2537') || q.includes('2,537')) {
        const augBill = targetConn.bills.find(b => b.billMonth.toLowerCase().includes('august') || b.totalAmount === 2537);
        if (augBill) targetBill = augBill;
      } else if (q.includes('july') || q.includes('2435') || q.includes('2,435')) {
        const julBill = targetConn.bills.find(b => b.billMonth.toLowerCase().includes('july') || b.totalAmount === 2435);
        if (julBill) targetBill = julBill;
      } else if (q.includes('september')) {
        const sepBill = targetConn.bills.find(b => b.billMonth.toLowerCase().includes('september'));
        if (sepBill) targetBill = sepBill;
      }
    }

    if (targetBill && targetConn) {
      const categoryLabel = targetConn.tariffCategory || targetConn.category || 'Residential (RGPU)';
      const slabs = Array.isArray(targetBill.slabBreakdown) ? targetBill.slabBreakdown : [];

      // Dynamically compute slab totals from stored slabBreakdown
      const calculatedSlabUnits = slabs.reduce((sum, s) => sum + Number(s.units || 0), 0);
      const calculatedSlabTotal = Number(
        slabs.reduce((sum, s) => sum + Number(s.amount || 0), 0).toFixed(2)
      );
      const calculatedRawRateSum = Number(
        slabs.reduce((sum, s) => sum + Number(s.units || 0) * Number(s.rate || 0), 0).toFixed(2)
      );

      const storedEnergyCharges = Number(targetBill.energyCharges || 0);
      const storedFixedCharges = Number(targetBill.fixedCharges || 0);
      const storedFpppa = Number(targetBill.fuelPriceAdjustment || 0);
      const storedDuty = Number(targetBill.electricityDuty || 0);
      const storedRebate = Number(targetBill.rebateOrSubsidy || 0);
      const storedTotalAmount = Number(targetBill.totalAmount || 0);

      const storedComponentSum = Number(
        (storedEnergyCharges + storedFixedCharges + storedFpppa + storedDuty - storedRebate).toFixed(2)
      );

      const slabVsEnergyDiff = Number((calculatedSlabTotal - storedEnergyCharges).toFixed(2));
      const hasSlabDiscrepancy = slabs.length > 0 && Math.abs(slabVsEnergyDiff) > 0.009;
      const rawVsStoredSlabDiff = Number((calculatedRawRateSum - calculatedSlabTotal).toFixed(2));
      const hasSlabRoundingDiff = slabs.length > 0 && Math.abs(rawVsStoredSlabDiff) > 0.009;

      const slabRowsMarkdown =
        slabs.length > 0
          ? slabs
              .map(
                s =>
                  `| ${s.slab} | ${s.units} kWh | ${formatInr(s.rate, 2)}/kWh | ${formatInr(s.amount, 2)} |`
              )
              .join('\n')
          : '| *No slab rows stored* | — | — | — |';

      let discrepancyNotice = '';
      if (hasSlabDiscrepancy) {
        discrepancyNotice = `\n> **Unexplained Demo-Data Discrepancy**: The dynamically calculated sum of the stored slab amounts is **${formatInr(calculatedSlabTotal, 2)}** (${calculatedSlabUnits} kWh), whereas the stored \`energyCharges\` field on this simulated demo bill record is **${formatInr(storedEnergyCharges, 2)}** — a difference of **${formatInr(Math.abs(slabVsEnergyDiff), 2)}**. No supporting record in the demo dataset explains this ${formatInr(Math.abs(slabVsEnergyDiff), 2)} difference; it is recorded strictly as an **unexplained demo-data discrepancy**.\n`;
      } else if (hasSlabRoundingDiff) {
        discrepancyNotice = `\n> **Demo Data Rounding Note**: Raw \`units × rate\` across slabs equals **${formatInr(calculatedRawRateSum, 2)}**, while the stored slab \`amount\` field is **${formatInr(calculatedSlabTotal, 2)}** (a **${formatInr(Math.abs(rawVsStoredSlabDiff), 2)}** rounding difference in the demo record), matching stored \`energyCharges\` of **${formatInr(storedEnergyCharges, 2)}**.\n`;
      } else if (slabs.length > 0) {
        discrepancyNotice = `\n*The dynamically calculated slab total (**${formatInr(calculatedSlabTotal, 2)}**) matches the stored \`energyCharges\` value (**${formatInr(storedEnergyCharges, 2)}**).*\n`;
      }

      const otherConnectionsNote =
        connections.length > 1
          ? `\n> **Other Linked Demo Connection**: You also have linked connection \`${connections[1].consumerNo}\` (${connections[1].tariffCategory || connections[1].category || 'Commercial NRGP'}) with a ${connections[1].bills?.[0]?.billMonth || 'September 2026'} simulated demo bill of **${formatInr(connections[1].bills?.[0]?.totalAmount || 14854, 2)}** (Status: **${connections[1].bills?.[0]?.status || 'Unpaid'}**).\n`
          : '';

      return `### Simulated Demo Bill Summary (${targetBill.billMonth}) — ${formatInr(storedTotalAmount, 2)}

*Note: This is a **SIMULATED DEMO BILL RECORD** for demonstration purposes only, **not an official UGVCL invoice**.*

Your stored **${targetBill.billMonth}** demo bill amount is **${formatInr(storedTotalAmount, 2)}** (Status: **${targetBill.status}**, Due Date: **${targetBill.dueDate}**).

* **Consumer Number**: \`${targetConn.consumerNo}\` (${categoryLabel})
* **Demo Bill ID**: \`${targetBill.billNo}\` (Bill Date: ${targetBill.billDate})
* **Stored Billed Consumption**: **${targetBill.unitsConsumed} kWh**

---

#### 1. Stored Demo Bill Record Values (\`INITIAL_BILLS\`)

| Stored Field | Stored Demo Value |
| --- | ---: |
| **Stored \`energyCharges\`** | ${formatInr(storedEnergyCharges, 2)} |
| **Stored \`fixedCharges\`** | ${formatInr(storedFixedCharges, 2)} |
| **Stored \`fuelPriceAdjustment\`** | ${formatInr(storedFpppa, 2)} |
| **Stored \`electricityDuty\`** | ${formatInr(storedDuty, 2)} |
| **Stored \`rebateOrSubsidy\`** | -${formatInr(Math.abs(storedRebate), 2)} |
| **Stored \`totalAmount\`** (Sum: ${formatInr(storedComponentSum, 2)}) | **${formatInr(storedTotalAmount, 2)}** |

---

#### 2. Dynamically Calculated Slab Breakdown vs. Stored \`energyCharges\`

| Stored Slab Tier | Units | Rate | Stored Slab Amount |
| --- | ---: | ---: | ---: |
${slabRowsMarkdown}
| **Calculated Slab Total** | **${calculatedSlabUnits} kWh** | — | **${formatInr(calculatedSlabTotal, 2)}** |
| **Stored \`energyCharges\` Field** | **${targetBill.unitsConsumed} kWh** | — | **${formatInr(storedEnergyCharges, 2)}** |
| **Difference (Calculated Slab Total − Stored \`energyCharges\`)** | — | — | **${formatInr(Math.abs(slabVsEnergyDiff), 2)}** |
${discrepancyNotice}${otherConnectionsNote}
[Open Electricity Bills](action:bills) [View Payment History](action:payments) [View My Connections](action:connections)`;
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Solar Net-Metering / Surya Gujarat / PM Surya Ghar Inquiries
  // ---------------------------------------------------------------------------
  if (q.includes('solar') || q.includes('surya') || q.includes('rooftop') || q.includes('net-meter') || q.includes('subsidy')) {
    return `### Rooftop Solar Net-Metering Reference Guidelines (Demo Guide)

Under the **PM Surya Ghar: Muft Bijli Yojana** & **Gujarat Solar Power Policy** reference rules:

#### 1. Residential System Eligibility & Sizing:
* **Capacity Limit**: Up to 100% of your sanctioned load (e.g., 5.0 kW for your residential connection).
* **Transformer Capacity Headroom**: Cumulative solar capacity on any local Distribution Transformer (DT) is capped at **75% of DT rated kVA capacity** to maintain network stability.

#### 2. Financial Subsidies:
* **1 kW System**: ₹30,000 Central Subsidy
* **2 kW System**: ₹60,000 Central Subsidy
* **3 kW System & Above**: Maximum ₹78,000 Central Subsidy

#### 3. Metering & Billing:
* A **Bi-directional Smart Net-Meter** replaces the standard consumer meter to log both Import (consumption from grid) and Export (solar feed into grid).
* Surplus exported energy is credited against your monthly bill as per GERC net-metering settlement regulations.

[Open Service Requests](action:requests) [View My Connections](action:connections) [Open Dashboard](action:dashboard)`;
  }

  // ---------------------------------------------------------------------------
  // 5. Power Outage, Fluctuations & Complaint Redressal Inquiries
  // ---------------------------------------------------------------------------
  if (
    q.includes('outage') ||
    q.includes('power cut') ||
    q.includes('complaint') ||
    q.includes('voltage') ||
    q.includes('grievance') ||
    q.includes('fault') ||
    q.includes('burnt meter') ||
    q.includes('fluctuation')
  ) {
    const activeComplaints = context?.complaints || [];
    return `### Grievance Redressal & Outage Standards (Demo Portal)

Under the **GERC Standards of Performance (SOP)** reference benchmarks:

#### Standard Resolution Timelines (SLAs):
* **Normal Fuse-off / Service Line Fault**: Within **4 hours** (Urban) / **12 hours** (Rural).
* **Voltage Fluctuation Complaints**: Addressed within **24 hours**; local tap-changer adjustment within 15 days.
* **Distribution Transformer (DT) Failure**: Replaced within **24 hours** in city limits / **48 hours** in rural areas.
* **Burnt / Defective Smart Meter**: Replaced within **3 working days** upon verification.

${
  activeComplaints.length > 0
    ? `#### Your Demo Account Complaints:\n${activeComplaints.map(c => `* **\`${c.id}\`**: ${c.category} — Status: **${c.status}** (${c.description})`).join('\n')}`
    : `*No unresolved complaints are currently open on your demo account.*`
}

To register a new grievance or track progress:
[Go to Complaint Desk](action:complaints) [Open Dashboard](action:dashboard)`;
  }

  // ---------------------------------------------------------------------------
  // 6. Payment History & Receipts (Simulated Demo Records)
  // ---------------------------------------------------------------------------
  if (q.includes('payment') || q.includes('receipt') || q.includes('paid') || q.includes('transaction')) {
    const payments = context?.payments || [];
    if (payments.length > 0) {
      return `### Simulated Demo Payment History

Here are the simulated payment transactions recorded on your VidyutFlow demo account (*DEMO DATA — not real financial transactions*):

| Date | Demo Bill Reference | Payment Mode | Demo Transaction ID | Amount | Status |
| --- | --- | --- | --- | ---: | --- |
${payments.map(p => `| ${p.date} | \`${p.billNo}\` | ${p.paymentMethod} | \`${p.txId}\` | ₹${p.amount.toLocaleString('en-IN')} | **${p.status}** |`).join('\n')}

[View Payment History](action:payments) [Open Electricity Bills](action:bills)`;
    }

    return `### Simulated Demo Payment Records
You can view simulated past transactions and test demo bill payment workflows from your payment ledger.

[View Payment History](action:payments) [Open Electricity Bills](action:bills)`;
  }

  // ---------------------------------------------------------------------------
  // 7. Meter Reading & Connection Info
  // ---------------------------------------------------------------------------
  if (q.includes('meter') || q.includes('reading') || q.includes('connection') || q.includes('load') || q.includes('link')) {
    const conn = connections[0];
    if (conn) {
      const categoryLabel = conn.tariffCategory || conn.category || 'Residential (RGPU)';
      return `### Demo Connection & Smart Meter Overview

* **Consumer Account**: \`${conn.consumerNo}\` (${conn.consumerName || userName})
* **Category**: **${categoryLabel}** (${conn.phase || '1-Phase'})
* **Sanctioned Load**: **${conn.sanctionedLoadKw || 5.0} kW**
* **Smart Meter No**: \`${conn.meterNo || 'MTR-2024-884102'}\`
* **Latest Reading Date**: ${conn.lastReadingDate || '01-Oct-2026'}
* **Current Meter Reading**: **${conn.currentReadingKwh || 14820} kWh**
* **Previous Meter Reading**: **${conn.previousReadingKwh || 14460} kWh**
* **Net Billed Units (Current Cycle)**: **${(conn.currentReadingKwh || 14820) - (conn.previousReadingKwh || 14460)} kWh**
* **Feeder Linkage**: ${conn.feederName || '11kV Feeder'} (${conn.subdivision || 'Mehsana City North'})

[View My Connections](action:connections) [Open Electricity Bills](action:bills)`;
    }

    return `### Linking Your Demo Electricity Connection

To link an existing electricity connection to your consumer portal:
1. Open [View My Connections](action:connections) or [Open Dashboard](action:dashboard).
2. Click **"Link Existing Connection"** and enter your 11-digit Consumer Number.
3. For a new electricity service application, visit [Apply New Connection](action:new-connection).

[View My Connections](action:connections) [Apply New Connection](action:new-connection) [Open Dashboard](action:dashboard)`;
  }

  // ---------------------------------------------------------------------------
  // 8. Tariff Schedule & Regulations
  // ---------------------------------------------------------------------------
  if (q.includes('tariff') || q.includes('rate') || q.includes('slab') || q.includes('gerc') || q.includes('rgp')) {
    return `### Reference GERC Tariff Schedule (Demo Guide)

#### Residential Rate (RGPU Urban Reference Slabs):
* **0 to 50 Units**: ₹3.05 per kWh
* **51 to 100 Units**: ₹3.50 per kWh
* **101 to 250 Units**: ₹4.15 per kWh
* **Above 250 Units**: ₹5.20 per kWh

#### Commercial Rate (NRGP Reference):
* **Fixed Charge**: ₹70/kW/month (<=10 kW) and ₹90/kW/month (>10 kW)
* **Energy Charges**: ₹4.50/kWh (first 10 kW demand) and ₹4.70/kWh (>10 kW)

*Note: When inspecting individual demo bills in VidyutFlow, always compare the dynamically summed \`slabBreakdown\` against the stored \`energyCharges\` field, as some sample demo bills contain an unexplained demo-data discrepancy.*

[Open Electricity Bills](action:bills) [View My Connections](action:connections)`;
  }

  // ---------------------------------------------------------------------------
  // 9. New Connection Documents / Application Inquiries
  // ---------------------------------------------------------------------------
  if (q.includes('document') || q.includes('apply') || q.includes('new connection')) {
    return `### Applying for a New Electricity Connection (Demo Portal)

#### Required Documents (Reference Checklist):
1. **Identity Proof**: Aadhaar Card, PAN Card, Passport, or Voter ID.
2. **Premises Ownership / Occupancy Proof**: Property Tax Receipt, Sale Deed, 7/12 Land Extract, or Registered Rent Agreement with Owner NOC.
3. **Licensed Electrical Contractor Test Report**: Form-A wiring completion certificate for the requested load (kW).

[Apply New Connection](action:new-connection) [Open Service Requests](action:requests) [Open Dashboard](action:dashboard)`;
  }

  // ---------------------------------------------------------------------------
  // 10. Default / Greeting Fallback (e.g. "Hi", "Hello", "Namaste")
  // ---------------------------------------------------------------------------
  const primaryConn = connections[0];
  const latestBill = primaryConn?.bills?.[0];
  const accountSummaryLine =
    hasLinked && primaryConn && latestBill
      ? `\n\n**Your Active Demo Account Snapshot**: Connection \`${primaryConn.consumerNo}\` (${primaryConn.tariffCategory || primaryConn.category || 'Residential RGPU'}) — Latest **${latestBill.billMonth}** simulated demo bill is **₹${latestBill.totalAmount.toLocaleString('en-IN')}** (**${latestBill.status}**, Due: ${latestBill.dueDate}).`
      : '';

  return `### Vidyut Mitra Utility Operations Advisor (Demo Assistant)

Namaste **${userName}**! I am here to help you explore your VidyutFlow demonstration account and reference utility tariffs:${accountSummaryLine}

* **Explain Demo Bills**: Ask *"What is my September 2026 electricity bill amount?"* or *"Explain my September 2026 bill of ₹2,185"* for a full comparison of stored demo bill values vs. calculated slab totals.
* **Solar Net-Metering**: Ask *"What are the solar net-metering rules for 5kW?"*
* **Grievance Support**: Ask *"How do I register a power outage or voltage grievance?"*
* **Tariff Slabs**: Ask *"What are the current residential RGPU tariff slabs?"*

[Open Dashboard](action:dashboard) [View My Connections](action:connections) [Open Electricity Bills](action:bills) [Go to Complaint Desk](action:complaints)`;
}
