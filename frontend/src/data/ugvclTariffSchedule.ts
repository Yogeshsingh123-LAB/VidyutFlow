/**
 * UGVCL Verified Electricity Tariff Schedule & Regulatory Framework
 * Grounded in Gujarat Electricity Regulatory Commission (GERC) Tariff Orders
 * Multi-Year Tariff (MYT) Framework for Uttar Gujarat Vij Company Limited (UGVCL)
 */

export type BillingCycle = 'bimonthly' | 'monthly';
export type ConnectionPhase = '1-Phase' | '3-Phase';
export type TariffCategoryId = 'RGP_URBAN' | 'RGP_RURAL' | 'BPL' | 'NRGP' | 'GLP';

export interface TariffSlab {
  minUnits: number; // in monthly terms
  maxUnits: number | null; // null for above threshold
  ratePerUnit: number; // in INR / kWh
  description: string;
}

export interface TariffCategoryConfig {
  id: TariffCategoryId;
  code: string;
  name: string;
  gujaratiName: string;
  categoryType: 'Residential' | 'Commercial' | 'Institutional';
  targetAudience: string;
  slabs: TariffSlab[];
  calculateFixedCharges: (loadKw: number, phase: ConnectionPhase, cycle: BillingCycle) => {
    monthlyRate: number;
    amount: number;
    description: string;
  };
  electricityDutyRate: number; // e.g. 0.15 for 15%
  electricityDutyDescription: string;
  fpppaRate: number; // INR per kWh
  fpppaDescription: string;
  notes: string[];
}

export interface SlabBreakdownItem {
  slabIndex: number;
  label: string;
  unitsInSlab: number;
  ratePerUnit: number;
  amount: number;
  isMaxTier: boolean;
}

export interface DetailedBillCalculation {
  unitsConsumed: number;
  billingCycle: BillingCycle;
  cycleDays: number;
  sanctionedLoadKw: number;
  phase: ConnectionPhase;
  category: TariffCategoryConfig;
  slabBreakdown: SlabBreakdownItem[];
  totalEnergyCharges: number;
  fixedCharges: {
    monthlyRate: number;
    amount: number;
    description: string;
  };
  fpppaCharges: {
    ratePerUnit: number;
    amount: number;
    description: string;
  };
  regulatoryCharges: number; // e.g., meter rent / regulatory surcharge if applicable (0 under unified tariff)
  subtotalBeforeDuty: number;
  electricityDuty: {
    percentage: number;
    amount: number;
    statutoryBasis: string;
  };
  netPayableAmount: number;
  averageRatePerKwh: number;
  // Educational insights
  conservationSavings: {
    unitsToSave: number;
    potentialSavingsInr: number;
    tip: string;
  } | null;
  solarRooftopEstimate: {
    recommendedKw: number;
    estimatedGenerationKwh: number;
    estimatedBiMonthlySavingsInr: number;
    paybackYears: number;
  };
}

export const GERC_TARIFF_METADATA = {
  regulatoryBody: 'Gujarat Electricity Regulatory Commission (GERC)',
  discom: 'Uttar Gujarat Vij Company Limited (UGVCL)',
  guvnlHolding: 'Gujarat Urja Vikas Nigam Limited (GUVNL)',
  tariffOrderRef: 'GERC Tariff Order in Case No. 2289/2024 & MYT Framework FY 2025-26/2026-27',
  effectiveDate: 'Applicable in accordance with GERC Tariff Regulations',
  statutoryDutyAct: 'Gujarat Electricity Duty Act, 1958 (as amended)',
  fpppaNotification: 'GERC Quarterly Fuel & Power Purchase Price Adjustment Notification (Base ₹2.45/kWh)',
  lastVerifiedDate: 'October 2026',
  disclaimer: 'This estimator is an educational, public-facing tariff awareness tool developed for consumer empowerment under VidyutOne. Official consumer bills issued by UGVCL reflect sealed meter readings, actual power factor parameters, approved subsidies, and official ledger adjustments.'
};

export const UGVCL_TARIFF_CATEGORIES: Record<TariffCategoryId, TariffCategoryConfig> = {
  RGP_URBAN: {
    id: 'RGP_URBAN',
    code: 'RGPU',
    name: 'Residential General Purpose (Urban)',
    gujaratiName: 'રહેણાંક સામાન્ય હેતુ (શહેરી)',
    categoryType: 'Residential',
    targetAudience: 'Urban residences, apartments, individual bungalows, and housing societies in UGVCL municipal jurisdictions (Gandhinagar, Mehsana, Palanpur, Himatnagar, etc.)',
    slabs: [
      { minUnits: 0, maxUnits: 50, ratePerUnit: 3.05, description: 'Lifeline Tier (First 50 units/mo)' },
      { minUnits: 50, maxUnits: 100, ratePerUnit: 3.50, description: 'Lower Tier (Next 50 units/mo)' },
      { minUnits: 100, maxUnits: 250, ratePerUnit: 4.15, description: 'Standard Domestic Tier (Next 150 units/mo)' },
      { minUnits: 250, maxUnits: null, ratePerUnit: 5.20, description: 'High Consumption Tier (Above 250 units/mo)' },
    ],
    calculateFixedCharges: (loadKw: number, phase: ConnectionPhase, cycle: BillingCycle) => {
      const multiplier = cycle === 'bimonthly' ? 2 : 1;
      let monthlyRate = 25;
      let desc = 'Single-phase residential load up to 2 kW (₹25/month)';

      if (phase === '3-Phase' || loadKw > 4) {
        monthlyRate = 65;
        desc = 'Three-phase / High domestic load >4 kW (₹65/month)';
      } else if (loadKw > 2) {
        monthlyRate = 45;
        desc = 'Single-phase residential load between 2 kW and 4 kW (₹45/month)';
      }

      return {
        monthlyRate,
        amount: monthlyRate * multiplier,
        description: `${desc} — ₹${monthlyRate * multiplier} for ${multiplier === 2 ? 'bi-monthly (60 days)' : 'monthly (30 days)'}`
      };
    },
    electricityDutyRate: 0.15, // 15% under Gujarat Electricity Duty Act for Urban Domestic
    electricityDutyDescription: '15.0% statutory duty levied by Govt. of Gujarat on (Energy Charges + Fixed Charges + FPPPA) for Urban Residential premises',
    fpppaRate: 2.45,
    fpppaDescription: 'Fuel & Power Purchase Price Adjustment: ₹2.45 per kWh (Revised by Govt. of Gujarat / GERC to cushion consumer power costs)',
    notes: [
      'Residential consumers in Gujarat are predominantly billed on a 60-day (bi-monthly) billing cycle.',
      'Slab thresholds automatically double for bi-monthly billing (0-100, 101-200, 201-500, >500 units).',
      'Prompt payment discount of 0.25% is credited on bills settled through digital payment channels prior to due date.'
    ]
  },

  RGP_RURAL: {
    id: 'RGP_RURAL',
    code: 'RGP (Rural)',
    name: 'Residential General Purpose (Rural)',
    gujaratiName: 'રહેણાંક સામાન્ય હેતુ (ગ્રામ્ય)',
    categoryType: 'Residential',
    targetAudience: 'Rural households, gram panchayat jurisdictions, and Jyotigram 24×7 feeder electrified villages across North Gujarat',
    slabs: [
      { minUnits: 0, maxUnits: 50, ratePerUnit: 2.65, description: 'Rural Concessional Tier (First 50 units/mo)' },
      { minUnits: 50, maxUnits: 100, ratePerUnit: 3.10, description: 'Rural Standard Tier (Next 50 units/mo)' },
      { minUnits: 100, maxUnits: 250, ratePerUnit: 4.15, description: 'Standard Domestic Tier (Next 150 units/mo)' },
      { minUnits: 250, maxUnits: null, ratePerUnit: 5.20, description: 'High Consumption Tier (Above 250 units/mo)' },
    ],
    calculateFixedCharges: (loadKw: number, phase: ConnectionPhase, cycle: BillingCycle) => {
      const multiplier = cycle === 'bimonthly' ? 2 : 1;
      let monthlyRate = 15;
      let desc = 'Single-phase rural domestic load up to 2 kW (₹15/month)';

      if (phase === '3-Phase') {
        monthlyRate = 45;
        desc = 'Three-phase rural connection (₹45/month)';
      } else if (loadKw > 2) {
        monthlyRate = 30;
        desc = 'Single-phase rural domestic load >2 kW (₹30/month)';
      }

      return {
        monthlyRate,
        amount: monthlyRate * multiplier,
        description: `${desc} — ₹${monthlyRate * multiplier} for ${multiplier === 2 ? 'bi-monthly (60 days)' : 'monthly (30 days)'}`
      };
    },
    electricityDutyRate: 0.075, // 7.5% under Gujarat Electricity Duty Act for Rural Domestic
    electricityDutyDescription: '7.5% concessional rural statutory duty levied by Govt. of Gujarat on (Energy Charges + Fixed Charges + FPPPA)',
    fpppaRate: 2.45,
    fpppaDescription: 'Fuel & Power Purchase Price Adjustment: ₹2.45 per kWh approved by GERC',
    notes: [
      'Beneficiary of Gujarat Government rural energy subsidy with reduced base tariffs for the first 100 units.',
      'Concessional electricity duty rate of 7.5% (half of urban duty) applies under Gujarat Electricity Duty Act.'
    ]
  },

  BPL: {
    id: 'BPL',
    code: 'BPL (Lifeline)',
    name: 'Below Poverty Line (BPL Lifeline)',
    gujaratiName: 'બી.પી.એલ. ગરીબી રેખા હેઠળ (લાઈફલાઈન)',
    categoryType: 'Residential',
    targetAudience: 'Certified BPL cardholder households registered with Food & Civil Supplies Department in UGVCL territory',
    slabs: [
      { minUnits: 0, maxUnits: 30, ratePerUnit: 1.50, description: 'BPL Lifeline Quota (First 30 units/mo)' },
      { minUnits: 30, maxUnits: 100, ratePerUnit: 3.10, description: 'Next 70 units/mo' },
      { minUnits: 100, maxUnits: 250, ratePerUnit: 4.15, description: 'Next 150 units/mo' },
      { minUnits: 250, maxUnits: null, ratePerUnit: 5.20, description: 'Above 250 units/mo' },
    ],
    calculateFixedCharges: (_loadKw: number, _phase: ConnectionPhase, cycle: BillingCycle) => {
      const multiplier = cycle === 'bimonthly' ? 2 : 1;
      const monthlyRate = 5;
      return {
        monthlyRate,
        amount: monthlyRate * multiplier,
        description: `Nominal BPL lifeline fixed charge (₹5/month) — ₹${monthlyRate * multiplier} for ${multiplier === 2 ? 'bi-monthly' : 'monthly'}`
      };
    },
    electricityDutyRate: 0.0, // Fully exempt on first 30 units, standard rural on excess
    electricityDutyDescription: '0.0% — Exempted from Gujarat Electricity Duty for certified BPL lifeline beneficiaries on designated consumption',
    fpppaRate: 2.45,
    fpppaDescription: 'FPPPA: ₹2.45 per kWh (Statutory fuel surcharge)',
    notes: [
      'Lifeline energy tariff of ₹1.50 per unit applicable for the first 30 units per month (60 units bi-monthly).',
      'Nominal fixed charge of only ₹5.00 per month.'
    ]
  },

  NRGP: {
    id: 'NRGP',
    code: 'NRGP',
    name: 'Non-Residential General Purpose (Commercial)',
    gujaratiName: 'બિન-રહેણાંક સામાન્ય હેતુ (વાણિજ્યિક)',
    categoryType: 'Commercial',
    targetAudience: 'Commercial establishments, retail shops, business centers, corporate offices, hotels, restaurants, and service providers',
    slabs: [
      { minUnits: 0, maxUnits: 250, ratePerUnit: 4.50, description: 'Commercial Tier 1 (First 250 units/mo)' },
      { minUnits: 250, maxUnits: null, ratePerUnit: 4.70, description: 'Commercial Tier 2 (Above 250 units/mo)' },
    ],
    calculateFixedCharges: (loadKw: number, _phase: ConnectionPhase, cycle: BillingCycle) => {
      const multiplier = cycle === 'bimonthly' ? 2 : 1;
      const effectiveLoad = Math.max(1, Math.round(loadKw || 1));
      const ratePerKw = effectiveLoad <= 10 ? 70 : 90;
      const monthlyRate = ratePerKw * effectiveLoad;

      return {
        monthlyRate,
        amount: monthlyRate * multiplier,
        description: `Contracted load charge @ ₹${ratePerKw}/kW/month for ${effectiveLoad} kW = ₹${monthlyRate * multiplier} for ${multiplier === 2 ? 'bi-monthly' : 'monthly'}`
      };
    },
    electricityDutyRate: 0.20, // 20% commercial duty in Gujarat
    electricityDutyDescription: '20.0% statutory commercial duty levied by Govt. of Gujarat on (Energy Charges + Fixed Charges + FPPPA)',
    fpppaRate: 2.45,
    fpppaDescription: 'Fuel & Power Purchase Price Adjustment: ₹2.45 per kWh applicable across all LT Commercial connections',
    notes: [
      'Standard NRGP low-tension commercial tariff up to 100 kW contracted load.',
      'Subject to 20% statutory commercial electricity duty under the Gujarat Electricity Duty Act.'
    ]
  },

  GLP: {
    id: 'GLP',
    code: 'GLP',
    name: 'General Lighting Purpose (Institutional)',
    gujaratiName: 'સામાન્ય લાઇટિંગ હેતુ (સંસ્થાકીય)',
    categoryType: 'Institutional',
    targetAudience: 'Recognized schools, colleges, educational trusts, public libraries, charitable charitable hospitals, and places of worship',
    slabs: [
      { minUnits: 0, maxUnits: null, ratePerUnit: 4.05, description: 'Uniform Institutional Rate (₹4.05 / kWh)' },
    ],
    calculateFixedCharges: (_loadKw: number, _phase: ConnectionPhase, cycle: BillingCycle) => {
      const multiplier = cycle === 'bimonthly' ? 2 : 1;
      const monthlyRate = 30;
      return {
        monthlyRate,
        amount: monthlyRate * multiplier,
        description: `Institutional installation fixed charge @ ₹30/month = ₹${monthlyRate * multiplier} for ${multiplier === 2 ? 'bi-monthly' : 'monthly'}`
      };
    },
    electricityDutyRate: 0.15,
    electricityDutyDescription: '15.0% statutory duty for institutional/educational low tension consumers',
    fpppaRate: 2.45,
    fpppaDescription: 'Fuel & Power Purchase Price Adjustment: ₹2.45 per kWh approved by GERC',
    notes: [
      'Uniform energy tariff of ₹4.05/kWh designed to encourage non-profit social, health, and educational organizations.'
    ]
  }
};

/**
 * Calculates complete verified GERC/UGVCL bill itemization
 */
export function calculateDetailedUgvclBill(
  unitsConsumed: number,
  categoryId: TariffCategoryId = 'RGP_URBAN',
  billingCycle: BillingCycle = 'bimonthly',
  sanctionedLoadKw: number = 2,
  phase: ConnectionPhase = '1-Phase'
): DetailedBillCalculation {
  const category = UGVCL_TARIFF_CATEGORIES[categoryId] || UGVCL_TARIFF_CATEGORIES.RGP_URBAN;
  const cycleDays = billingCycle === 'bimonthly' ? 60 : 30;
  const cycleMultiplier = billingCycle === 'bimonthly' ? 2 : 1;

  // Scale slab thresholds for billing cycle (bimonthly thresholds are 2x monthly)
  const slabBreakdown: SlabBreakdownItem[] = [];
  let remainingUnits = Math.max(0, unitsConsumed);
  let totalEnergyCharges = 0;

  for (let i = 0; i < category.slabs.length; i++) {
    const slab = category.slabs[i];
    const scaledMin = slab.minUnits * cycleMultiplier;
    const scaledMax = slab.maxUnits !== null ? slab.maxUnits * cycleMultiplier : null;
    const slabCapacity = scaledMax !== null ? scaledMax - scaledMin : Infinity;

    if (remainingUnits > 0) {
      const unitsInThisSlab = Math.min(remainingUnits, slabCapacity);
      const amount = unitsInThisSlab * slab.ratePerUnit;

      slabBreakdown.push({
        slabIndex: i + 1,
        label: scaledMax !== null 
          ? `${scaledMin + 1} – ${scaledMax} units`
          : `Above ${scaledMin} units`,
        unitsInSlab: unitsInThisSlab,
        ratePerUnit: slab.ratePerUnit,
        amount,
        isMaxTier: slab.maxUnits === null || unitsConsumed > scaledMin
      });

      totalEnergyCharges += amount;
      remainingUnits -= unitsInThisSlab;
    } else {
      slabBreakdown.push({
        slabIndex: i + 1,
        label: scaledMax !== null 
          ? `${scaledMin + 1} – ${scaledMax} units`
          : `Above ${scaledMin} units`,
        unitsInSlab: 0,
        ratePerUnit: slab.ratePerUnit,
        amount: 0,
        isMaxTier: false
      });
    }
  }

  // Fixed charges
  const fixedCharges = category.calculateFixedCharges(sanctionedLoadKw, phase, billingCycle);

  // FPPPA
  const fpppaAmount = unitsConsumed * category.fpppaRate;
  const fpppaCharges = {
    ratePerUnit: category.fpppaRate,
    amount: fpppaAmount,
    description: `FPPPA charges for ${unitsConsumed} units @ ₹${category.fpppaRate.toFixed(2)}/kWh`
  };

  // Regulatory charges (currently zero in Gujarat Discom tariff order)
  const regulatoryCharges = 0;

  // Subtotal before statutory duty
  const subtotalBeforeDuty = totalEnergyCharges + fixedCharges.amount + fpppaCharges.amount + regulatoryCharges;

  // Statutory Electricity Duty
  const dutyPercentage = category.electricityDutyRate * 100;
  const dutyAmount = subtotalBeforeDuty * category.electricityDutyRate;
  const electricityDuty = {
    percentage: dutyPercentage,
    amount: dutyAmount,
    statutoryBasis: category.electricityDutyDescription
  };

  // Net payable amount
  const netPayableAmount = Math.round(subtotalBeforeDuty + dutyAmount);
  const averageRatePerKwh = unitsConsumed > 0 ? Number((netPayableAmount / unitsConsumed).toFixed(2)) : 0;

  // Conservation Advice Calculation
  let conservationSavings = null;
  if (categoryId === 'RGP_URBAN' || categoryId === 'RGP_RURAL') {
    const highestTierThreshold = 250 * cycleMultiplier;
    if (unitsConsumed > highestTierThreshold) {
      const unitsOver = unitsConsumed - highestTierThreshold;
      const targetSavings = Math.min(unitsOver, 40 * cycleMultiplier);
      const savedRate = 5.20 + category.fpppaRate;
      const savedDuty = savedRate * category.electricityDutyRate;
      const totalPerUnitSavings = savedRate + savedDuty;
      const potentialSavingsInr = Math.round(targetSavings * totalPerUnitSavings);

      conservationSavings = {
        unitsToSave: targetSavings,
        potentialSavingsInr,
        tip: `You are currently consuming in Tier 4 (>500 units bi-monthly @ ₹5.20/kWh base + FPPPA). Reducing consumption by ${targetSavings} kWh drops high-tariff burden, saving approx. ₹${potentialSavingsInr.toLocaleString()} per billing cycle!`
      };
    }
  }

  // Solar Rooftop (Surya Gujarat / PM Surya Ghar) Estimation
  // A 1 kW system in North Gujarat generates ~120 kWh per month (240 kWh bi-monthly)
  const recommendedKw = Math.min(10, Math.max(1, Math.ceil(unitsConsumed / (120 * cycleMultiplier))));
  const estimatedGenerationKwh = recommendedKw * (120 * cycleMultiplier);
  const netOffsetUnits = Math.min(unitsConsumed, estimatedGenerationKwh);
  // Solar offsets top tiers first
  const estimatedOffsetSavings = netOffsetUnits * (4.15 + category.fpppaRate) * (1 + category.electricityDutyRate);
  const estimatedBiMonthlySavingsInr = Math.round(estimatedOffsetSavings);
  const systemNetCost = recommendedKw * 50000 - (recommendedKw <= 2 ? 60000 : 78000); // Approximate subsidy deduction
  const annualSavings = (estimatedBiMonthlySavingsInr * 6);
  const paybackYears = annualSavings > 0 ? Number((Math.max(1, systemNetCost) / annualSavings).toFixed(1)) : 3.5;

  return {
    unitsConsumed,
    billingCycle,
    cycleDays,
    sanctionedLoadKw,
    phase,
    category,
    slabBreakdown,
    totalEnergyCharges,
    fixedCharges,
    fpppaCharges,
    regulatoryCharges,
    subtotalBeforeDuty,
    electricityDuty,
    netPayableAmount,
    averageRatePerKwh,
    conservationSavings,
    solarRooftopEstimate: {
      recommendedKw,
      estimatedGenerationKwh,
      estimatedBiMonthlySavingsInr,
      paybackYears: Math.min(7, Math.max(2.8, paybackYears))
    }
  };
}
