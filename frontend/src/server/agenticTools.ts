import { FunctionDeclaration, Type } from '@google/genai';
import { UserRole } from '../types';
import { ServerSessionRecord } from './authService';
import { ServerDataStore } from './dataStore';
import { FEEDER_METRICS, SYSTEM_SERVICES } from '../data/mockData';
import { AGENTIC_PERSONAS } from './agenticPersonas';
import { verifyReadOnlyToolCall } from '../utils/securityHardening';

/**
 * VidyutFlow Role-Specific Agentic Tools (Step 6B.4 / Phase 1)
 *
 * Strict read-only tools providing authorized access to enterprise ERP datasets.
 * Every tool enforces:
 * - Role permission verification
 * - Consumer record ownership isolation (zero cross-tenant leakage)
 * - Safe input validation and bounded output serialization
 */

export interface ExecuteToolParams {
  name: string;
  args: Record<string, any>;
  session?: ServerSessionRecord | null;
  role: UserRole;
  dataStore: ServerDataStore;
  clientContext?: any;
}

export interface AgenticToolResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  displayChip: string;
}

// ---------------------------------------------------------------------------
// 1. TOOL DECLARATIONS FOR GEMINI FUNCTION CALLING
// ---------------------------------------------------------------------------

export const AGENTIC_TOOL_DECLARATIONS: Record<string, FunctionDeclaration> = {
  // Consumer Tools
  getConsumerBillDetails: {
    name: 'getConsumerBillDetails',
    description: 'Retrieve authorized billing records, slab breakdown amounts, energy charges, and payment status for an owned electricity connection.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        consumerNo: {
          type: Type.STRING,
          description: 'The electricity consumer number (e.g., "04281-99231").'
        },
        billNo: {
          type: Type.STRING,
          description: 'Optional specific bill identifier (e.g., "BILL-UG-2026-10-8821").'
        }
      },
      required: ['consumerNo']
    }
  },

  calculateTariffEstimate: {
    name: 'calculateTariffEstimate',
    description: 'Calculate official GERC electricity tariff slab breakdown estimate for a given consumption in kWh and consumer category.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        units: {
          type: Type.NUMBER,
          description: 'Billed units in kilowatt-hours (kWh).'
        },
        category: {
          type: Type.STRING,
          description: 'Tariff category: "RGPU" (Residential), "NRGP" (Commercial), or "GLP" (General Lighting).'
        },
        sanctionedLoadKw: {
          type: Type.NUMBER,
          description: 'Sanctioned load in kW (defaults to 2 kW for residential).'
        }
      },
      required: ['units', 'category']
    }
  },

  getConsumerConnectionDetails: {
    name: 'getConsumerConnectionDetails',
    description: 'Retrieve technical and meter details of the authenticated consumer\'s authorized connection(s).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        consumerNo: {
          type: Type.STRING,
          description: 'Optional specific consumer number. If omitted, returns all authorized connections.'
        }
      }
    }
  },

  getConsumerPaymentHistory: {
    name: 'getConsumerPaymentHistory',
    description: 'Retrieve recent verified payment transactions, bank reference numbers, and payment status for the consumer\'s connections.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        consumerNo: {
          type: Type.STRING,
          description: 'Optional consumer number to filter transactions.'
        }
      }
    }
  },

  getConsumerComplaints: {
    name: 'getConsumerComplaints',
    description: 'Check status, category, resolution timeframe, and field technician dispatch status of consumer\'s logged complaints.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        statusFilter: {
          type: Type.STRING,
          description: 'Optional status: "Registered", "In Progress", or "Resolved".'
        }
      }
    }
  },

  getConsumerApplications: {
    name: 'getConsumerApplications',
    description: 'Track the status, stage, and sub-divisional processing notes for new connection and load extension applications.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        statusFilter: {
          type: Type.STRING,
          description: 'Optional status filter: "Under Review", "Site Inspection Pending", "Sanctioned".'
        }
      }
    }
  },

  // Employee Tools
  listPendingApplications: {
    name: 'listPendingApplications',
    description: 'List pending new connection and load extension applications in the sub-division queue requiring verification or sanction.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        statusFilter: {
          type: Type.STRING,
          description: 'Filter applications by status (e.g., "Under Review", "Site Inspection Pending").'
        },
        subdivision: {
          type: Type.STRING,
          description: 'Subdivision name filter (e.g., "UGVCL Gandhinagar Sub-Division 2").'
        }
      }
    }
  },

  getComplaintSlaRisks: {
    name: 'getComplaintSlaRisks',
    description: 'Analyze sub-divisional complaint backlog to identify complaints approaching or exceeding official GERC SLA limits.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        priority: {
          type: Type.STRING,
          description: 'Filter by priority: "High", "Medium", "Low".'
        }
      }
    }
  },

  getConsumerLedgerSummary: {
    name: 'getConsumerLedgerSummary',
    description: 'Retrieve high-level summary of consumer ledger receivables, billed amounts, and collection aging for sub-division.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        subdivision: {
          type: Type.STRING,
          description: 'Sub-division name.'
        }
      }
    }
  },

  listPendingApprovals: {
    name: 'listPendingApprovals',
    description: 'Retrieve approval center items requiring Assistant Engineer or Sub-Divisional Officer concurrence.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description: 'Approval type: "Load Extension", "Meter Replacement", "Tariff Reclassification".'
        }
      }
    }
  },

  // Field Engineer Tools
  getAssignedWorkOrders: {
    name: 'getAssignedWorkOrders',
    description: 'Fetch operational field work orders, breakdown jobs, and routine maintenance tasks assigned to the field team.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        statusFilter: {
          type: Type.STRING,
          description: 'Work order status: "Pending", "In Progress", or "Completed".'
        },
        priority: {
          type: Type.STRING,
          description: 'Priority level: "Critical", "High", "Medium", "Low".'
        }
      }
    }
  },

  getFeederAndTransformerStatus: {
    name: 'getFeederAndTransformerStatus',
    description: 'Inspect 11kV distribution feeder telemetry, peak load amperes, rated capacity, utilization %, and tripping history.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        feederId: {
          type: Type.STRING,
          description: 'Feeder ID (e.g. "FDR-11-MS-04").'
        },
        minLoadPercent: {
          type: Type.NUMBER,
          description: 'Minimum utilization percentage to filter (e.g. 80 for overloaded feeders).'
        }
      }
    }
  },

  getSiteFeasibilityQueue: {
    name: 'getSiteFeasibilityQueue',
    description: 'List consumer premises and commercial installations awaiting field site feasibility inspection and physical meter audit.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: 'Inspection status.'
        }
      }
    }
  },

  getSafetyProtocolGuidelines: {
    name: 'getSafetyProtocolGuidelines',
    description: 'Retrieve official CEA Indian Electricity Safety Rules, Permit to Work (PTW) procedures, and PPE requirements for field tasks.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        taskType: {
          type: Type.STRING,
          description: 'Task type: "11kv_line_clearance", "transformer_replacement", "meter_burn_inspection", "overhead_conductor_patrol".'
        }
      },
      required: ['taskType']
    }
  },

  // Management Tools
  getExecutiveKpiSummary: {
    name: 'getExecutiveKpiSummary',
    description: 'Retrieve Discom-wide executive KPIs including AT&C loss %, billing efficiency %, collection efficiency %, and peak demand.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },

  getFeederOverloadAnalytics: {
    name: 'getFeederOverloadAnalytics',
    description: 'Identify critically overloaded 11kV feeders (>80% utilization) and high-tripping lines requiring Capex/RDSS augmentation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        circle: {
          type: Type.STRING,
          description: 'Discom circle (e.g., "Mehsana", "Sabarmati", "Gandhinagar").'
        }
      }
    }
  },

  getRevenueRealizationLedger: {
    name: 'getRevenueRealizationLedger',
    description: 'Retrieve revenue assessment vs. realization, government subsidy tranches, and tariff deficit metrics.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        fiscalMonth: {
          type: Type.STRING,
          description: 'Fiscal month (e.g., "October 2026").'
        }
      }
    }
  },

  getDiscomComplaintTrends: {
    name: 'getDiscomComplaintTrends',
    description: 'Analyze Discom grievance redressal performance across categories and GERC statutory timeline adherence.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },

  // Admin Tools
  querySystemAuditLogs: {
    name: 'querySystemAuditLogs',
    description: 'Query immutable security audit trail events, actor identities, role privileges, action types, and IP addresses.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        roleFilter: {
          type: Type.STRING,
          description: 'Filter by actor role: "ADMIN", "EMPLOYEE", "FIELD", "CONSUMER".'
        },
        limit: {
          type: Type.NUMBER,
          description: 'Max records to return (1-20, default 10).'
        }
      }
    }
  },

  getSecurityAccessMatrix: {
    name: 'getSecurityAccessMatrix',
    description: 'Retrieve Role-Based Access Control (RBAC) permission matrix, active endpoint privileges, and session enforcement rules.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },

  getSystemTelemetryStatus: {
    name: 'getSystemTelemetryStatus',
    description: 'Retrieve infrastructure health, database connection pool, API microservice latency, and memory utilization.',
    parameters: {
      type: Type.OBJECT,
      properties: {}
    }
  },

  getRecentAuthEvents: {
    name: 'getRecentAuthEvents',
    description: 'Inspect recent authentication events, failed login alerts, rate-limit throttles, and session rotation statuses.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: {
          type: Type.NUMBER,
          description: 'Max events to retrieve (default 5).'
        }
      }
    }
  }
};

/**
 * Returns the list of FunctionDeclarations authorized for a specific role.
 */
export function getRoleToolDeclarations(role: UserRole): FunctionDeclaration[] {
  const persona = AGENTIC_PERSONAS[role];
  if (!persona) return [];

  return persona.allowedTools
    .map(toolName => AGENTIC_TOOL_DECLARATIONS[toolName])
    .filter((decl): decl is FunctionDeclaration => Boolean(decl));
}

// ---------------------------------------------------------------------------
// 2. TOOL EXECUTION ROUTER (SERVER AUTHORIZATION & ISOLATION)
// ---------------------------------------------------------------------------

const READ_ONLY_TOOL_NAMES_SET = new Set<string>(Object.keys(AGENTIC_TOOL_DECLARATIONS));

export async function executeAgenticTool(params: ExecuteToolParams): Promise<AgenticToolResult> {
  const { name, args, session, role, dataStore, clientContext } = params;
  const persona = AGENTIC_PERSONAS[role];

  // 1. Strict Read-Only Tool Guard: AI agents can never invoke mutating functions directly
  const readOnlyCheck = verifyReadOnlyToolCall(name, READ_ONLY_TOOL_NAMES_SET);
  if (!readOnlyCheck.allowed) {
    return {
      toolName: name,
      success: false,
      error: readOnlyCheck.reason || `Access Denied: Tool "${name}" is not a verified read-only tool.`,
      displayChip: `Blocked Mutation: ${name}`
    };
  }

  // 2. RBAC Guard: tool must belong to role's allowedTools
  if (!persona || !persona.allowedTools.includes(name)) {
    return {
      toolName: name,
      success: false,
      error: `Access Denied: The role "${role}" is not authorized to execute tool "${name}".`,
      displayChip: `Unauthorized: ${name}`
    };
  }

  try {
    switch (name) {
      // ---------------------------------------------------------------------
      // Consumer Tools
      // ---------------------------------------------------------------------
      case 'getConsumerBillDetails': {
        const { consumerNo, billNo } = args;
        if (!consumerNo || typeof consumerNo !== 'string') {
          return {
            toolName: name,
            success: false,
            error: 'Parameter "consumerNo" is required.',
            displayChip: 'Query Bill Error'
          };
        }

        // Check ownership: consumer must own the requested consumerNo
        if (session && session.role === 'consumer') {
          const owned = dataStore.getOwnedConsumerNumbers(session.userId);
          if (!owned.has(consumerNo)) {
            return {
              toolName: name,
              success: false,
              error: `Access Denied: Consumer "${session.user.name}" does not own connection "${consumerNo}".`,
              displayChip: 'Access Denied: Billing Record'
            };
          }
        }

        // Pull connection & bills
        let bills: any[] = [];
        if (session?.signedToken) {
          try {
            bills = dataStore.getBills(session.signedToken).filter(b => b.consumerNo === consumerNo);
          } catch {
            bills = [];
          }
        } else if (clientContext?.connections) {
          const matchedConn = clientContext.connections.find((c: any) => c.consumerNo === consumerNo);
          bills = matchedConn?.bills || [];
        }

        if (billNo) {
          bills = bills.filter(b => b.billNo === billNo);
        }

        return {
          toolName: name,
          success: true,
          data: {
            consumerNo,
            recordCount: bills.length,
            bills: bills.slice(0, 4)
          },
          displayChip: `Checked Bill Records (${consumerNo})`
        };
      }

      case 'calculateTariffEstimate': {
        const units = Number(args.units) || 0;
        const category = String(args.category || 'RGPU').toUpperCase();
        const loadKw = Number(args.sanctionedLoadKw) || 2;

        let slabBreakdown: { slab: string; units: number; rate: number; amount: number }[] = [];
        let remaining = units;
        let totalEnergyCharge = 0;

        if (category === 'RGPU') {
          // 0-50 units @ 3.05
          const s1 = Math.min(remaining, 50);
          slabBreakdown.push({ slab: '0-50 units', units: s1, rate: 3.05, amount: Number((s1 * 3.05).toFixed(2)) });
          remaining -= s1;

          // 51-100 units @ 3.50
          if (remaining > 0) {
            const s2 = Math.min(remaining, 50);
            slabBreakdown.push({ slab: '51-100 units', units: s2, rate: 3.50, amount: Number((s2 * 3.50).toFixed(2)) });
            remaining -= s2;
          }

          // 101-250 units @ 4.15
          if (remaining > 0) {
            const s3 = Math.min(remaining, 150);
            slabBreakdown.push({ slab: '101-250 units', units: s3, rate: 4.15, amount: Number((s3 * 4.15).toFixed(2)) });
            remaining -= s3;
          }

          // Above 250 units @ 5.20
          if (remaining > 0) {
            slabBreakdown.push({ slab: 'Above 250 units', units: remaining, rate: 5.20, amount: Number((remaining * 5.20).toFixed(2)) });
          }
        } else {
          // NRGP Commercial estimate
          slabBreakdown.push({ slab: 'Flat Commercial Rate', units, rate: 4.50, amount: Number((units * 4.50).toFixed(2)) });
        }

        totalEnergyCharge = slabBreakdown.reduce((sum, item) => sum + item.amount, 0);
        const fixedCharges = loadKw * 50;
        const fpppa = Number((units * 2.60).toFixed(2));
        const duty = Number(((totalEnergyCharge + fixedCharges) * 0.15).toFixed(2));
        const estimatedTotal = Number((totalEnergyCharge + fixedCharges + fpppa + duty).toFixed(2));

        return {
          toolName: name,
          success: true,
          data: {
            tariffCategory: category,
            billedUnits: units,
            sanctionedLoadKw: loadKw,
            slabBreakdown,
            totalEnergyCharge,
            fixedCharges,
            estimatedFpppa: fpppa,
            electricityDuty: duty,
            estimatedTotalBill: estimatedTotal,
            regulatoryReference: 'GERC Tariff Order FY 2026-27 (UGVCL Distribution Licensee)'
          },
          displayChip: `Calculated GERC Slabs (${units} kWh)`
        };
      }

      case 'getConsumerConnectionDetails': {
        if (args.consumerNo && typeof args.consumerNo === 'string') {
          if (session && session.role === 'consumer') {
            const owned = dataStore.getOwnedConsumerNumbers(session.userId);
            if (!owned.has(args.consumerNo)) {
              return {
                toolName: name,
                success: false,
                error: `Access Denied: Consumer "${session.user.name}" does not own connection "${args.consumerNo}".`,
                displayChip: 'Access Denied: Connection Record'
              };
            }
          } else if (role === 'consumer' && Array.isArray(clientContext?.connections)) {
            const ownsInContext = clientContext.connections.some((c: any) => c.consumerNo === args.consumerNo);
            if (!ownsInContext) {
              return {
                toolName: name,
                success: false,
                error: `Access Denied: Requested connection "${args.consumerNo}" is not linked to the active consumer account.`,
                displayChip: 'Access Denied: Connection Record'
              };
            }
          }
        }

        let conns: any[] = [];
        if (session?.signedToken) {
          try {
            conns = dataStore.getConnections(session.signedToken);
          } catch {
            conns = [];
          }
        } else if (clientContext?.connections) {
          conns = clientContext.connections;
        }

        if (args.consumerNo) {
          conns = conns.filter(c => c.consumerNo === args.consumerNo);
        }

        return {
          toolName: name,
          success: true,
          data: {
            totalAuthorizedConnections: conns.length,
            connections: conns
          },
          displayChip: `Verified Connection Technicals (${conns.length})`
        };
      }

      case 'getConsumerPaymentHistory': {
        if (args.consumerNo && typeof args.consumerNo === 'string') {
          if (session && session.role === 'consumer') {
            const owned = dataStore.getOwnedConsumerNumbers(session.userId);
            if (!owned.has(args.consumerNo)) {
              return {
                toolName: name,
                success: false,
                error: `Access Denied: Consumer "${session.user.name}" does not own connection "${args.consumerNo}".`,
                displayChip: 'Access Denied: Payment Record'
              };
            }
          } else if (role === 'consumer' && Array.isArray(clientContext?.connections)) {
            const ownsInContext = clientContext.connections.some((c: any) => c.consumerNo === args.consumerNo);
            if (!ownsInContext) {
              return {
                toolName: name,
                success: false,
                error: `Access Denied: Requested connection "${args.consumerNo}" is not linked to the active consumer account.`,
                displayChip: 'Access Denied: Payment Record'
              };
            }
          }
        }

        let payments: any[] = [];
        if (session?.signedToken) {
          try {
            payments = dataStore.getPayments(session.signedToken);
          } catch {
            payments = [];
          }
        } else if (clientContext?.payments) {
          payments = clientContext.payments;
        }

        if (args.consumerNo) {
          payments = payments.filter(p => p.consumerNo === args.consumerNo);
        }

        return {
          toolName: name,
          success: true,
          data: {
            recordCount: payments.length,
            payments: payments.slice(0, 5)
          },
          displayChip: `Queried Payment Transactions (${payments.length})`
        };
      }

      case 'getConsumerComplaints': {
        let complaints: any[] = [];
        if (session?.signedToken) {
          try {
            complaints = dataStore.getComplaints(session.signedToken);
          } catch {
            complaints = [];
          }
        } else if (clientContext?.complaints) {
          complaints = clientContext.complaints;
        }

        if (args.statusFilter) {
          complaints = complaints.filter(
            c => c.status?.toLowerCase() === String(args.statusFilter).toLowerCase()
          );
        }

        // Strip internal staff fields (assignedTechnician, assignedWorkOrderId, internal dispatch remarks) for consumers
        const sanitizedComplaints = complaints.slice(0, 5).map(c => ({
          id: c.id,
          consumerNo: c.consumerNo,
          category: c.category,
          description: c.description,
          status: c.status,
          filedAt: c.filedAt,
          slaTargetHours: c.slaTargetHours,
          slaDueTime: c.slaDueTime,
          resolutionRemarks: c.resolutionRemarks || null
        }));

        return {
          toolName: name,
          success: true,
          data: {
            complaints: sanitizedComplaints
          },
          displayChip: `Inspected Grievance Tickets (${sanitizedComplaints.length})`
        };
      }

      case 'getConsumerApplications': {
        let apps: any[] = [];
        if (session?.signedToken) {
          try {
            apps = dataStore.getApplications(session.signedToken);
          } catch {
            apps = [];
          }
        } else if (clientContext?.applications) {
          apps = clientContext.applications;
        }

        if (args.statusFilter) {
          apps = apps.filter(
            a => a.status?.toLowerCase() === String(args.statusFilter).toLowerCase()
          );
        }

        // Strip internal staff assignments and work order references for consumers
        const sanitizedApps = apps.map(a => ({
          id: a.id,
          applicantName: a.applicantName,
          category: a.category,
          requestedLoadKw: a.requestedLoadKw ?? a.loadKw,
          phase: a.phase,
          status: a.status,
          workflowStep: a.workflowStep,
          appliedDate: a.appliedDate,
          targetCompletionDate: a.targetCompletionDate,
          estimatedSanctionCost: a.estimatedSanctionCost,
          documentsSubmitted: a.documentsSubmitted
        }));

        return {
          toolName: name,
          success: true,
          data: {
            applications: sanitizedApps
          },
          displayChip: `Tracked Connection Applications (${sanitizedApps.length})`
        };
      }

      // ---------------------------------------------------------------------
      // Employee Tools
      // ---------------------------------------------------------------------
      case 'listPendingApplications': {
        let apps: any[] = [];
        if (session?.signedToken) {
          try {
            apps = dataStore.getApplications(session.signedToken);
          } catch {
            apps = [];
          }
        }

        if (args.statusFilter) {
          apps = apps.filter(
            a => a.status?.toLowerCase() === String(args.statusFilter).toLowerCase()
          );
        }

        return {
          toolName: name,
          success: true,
          data: {
            queueName: 'Sub-Divisional Application Processing Queue',
            totalPending: apps.length,
            applications: apps
          },
          displayChip: `Scanned Application Queue (${apps.length})`
        };
      }

      case 'getComplaintSlaRisks': {
        let complaints: any[] = [];
        if (session?.signedToken) {
          try {
            complaints = dataStore.getComplaints(session.signedToken);
          } catch {
            complaints = [];
          }
        }

        const slaRisks = complaints.map(c => {
          const isHighPriority = c.priority === 'High' || c.priority === 'Critical';
          const isPending = c.status !== 'Resolved';
          return {
            complaintId: c.id,
            consumerNo: c.consumerNo,
            category: c.category,
            priority: c.priority || 'Medium',
            status: c.status,
            riskLevel: isPending && isHighPriority ? 'HIGH_SLA_BREACH_RISK' : 'NORMAL',
            standardResolutionTimeframe:
              c.category === 'Supply Interruption'
                ? '4 hours (GERC Urban Norm)'
                : '72 hours (Meter / Voltage)'
          };
        });

        return {
          toolName: name,
          success: true,
          data: {
            analyzedCount: complaints.length,
            highRiskItems: slaRisks.filter(r => r.riskLevel === 'HIGH_SLA_BREACH_RISK'),
            allRecords: slaRisks
          },
          displayChip: `Evaluated Complaint SLA Risks (${complaints.length})`
        };
      }

      case 'getConsumerLedgerSummary': {
        return {
          toolName: name,
          success: true,
          data: {
            subdivision: args.subdivision || 'UGVCL Gandhinagar Sub-Division 2',
            activeConsumers: 24890,
            currentDemandAssessed: '₹4.82 Cr',
            totalRealized: '₹4.71 Cr',
            collectionEfficiencyPct: 97.7,
            agingOver90Days: '₹8.4 Lakhs',
            disconnectionNoticesPending: 14
          },
          displayChip: 'Summarized Consumer Ledger'
        };
      }

      case 'listPendingApprovals': {
        return {
          toolName: name,
          success: true,
          data: {
            pendingApprovals: [
              {
                id: 'APPR-2026-901',
                type: 'Load Extension (15kW to 35kW)',
                applicant: 'Torrent Precision Tools',
                officerAssigned: 'AE (Commerce)',
                status: 'Awaiting Sanction Order'
              },
              {
                id: 'APPR-2026-902',
                type: 'Burnt Smart Meter Replacement',
                applicant: 'Kishorebhai Parmar',
                officerAssigned: 'JE (Field)',
                status: 'Test Report Verified'
              }
            ]
          },
          displayChip: 'Checked Approval Queue'
        };
      }

      // ---------------------------------------------------------------------
      // Field Engineer Tools
      // ---------------------------------------------------------------------
      case 'getAssignedWorkOrders': {
        let workOrders: any[] = [];
        if (session?.signedToken) {
          try {
            workOrders = dataStore.getWorkOrders(session.signedToken);
          } catch {
            workOrders = [];
          }
        }

        if (args.statusFilter) {
          workOrders = workOrders.filter(
            w => w.status?.toLowerCase() === String(args.statusFilter).toLowerCase()
          );
        }

        return {
          toolName: name,
          success: true,
          data: {
            assignedWorkOrders: workOrders
          },
          displayChip: `Retrieved Assigned Work Orders (${workOrders.length})`
        };
      }

      case 'getFeederAndTransformerStatus': {
        let feeders = [...FEEDER_METRICS];
        if (args.feederId) {
          feeders = feeders.filter(f => f.id === args.feederId);
        }
        if (typeof args.minLoadPercent === 'number') {
          feeders = feeders.filter(f => f.utilizationPct >= args.minLoadPercent);
        }

        return {
          toolName: name,
          success: true,
          data: {
            monitoredFeeders: feeders
          },
          displayChip: `Queried 11kV Feeder Telemetry (${feeders.length})`
        };
      }

      case 'getSiteFeasibilityQueue': {
        return {
          toolName: name,
          success: true,
          data: {
            feasibilityQueue: [
              {
                applicationId: 'APP-2026-0842',
                applicant: 'Kishorebhai Parmar',
                requestedLoad: '8 kW (Solar Net-Metering)',
                address: 'Plot 29, Sardar Patel Society, Sector 4',
                assignedInspector: 'Vikramaditya Solanki (JE)',
                status: 'Site Visit Scheduled'
              }
            ]
          },
          displayChip: 'Checked Site Feasibility Queue'
        };
      }

      case 'getSafetyProtocolGuidelines': {
        const taskType = String(args.taskType || 'ptw_clearance').toLowerCase();
        let protocol = {
          standard: 'CEA (Measures relating to Safety and Electric Supply) Regulations 2023',
          mandatoryPpe: ['11kV Dielectric Gloves (IS 4770)', 'Safety Helmet with Visor', 'Full Body Safety Harness', 'Non-conductive Safety Boots'],
          procedure: [
            '1. Obtain formal Permit to Work (PTW) from the controlling Substation Engineer.',
            '2. Open and lock out the corresponding 11kV gang-operated air break (AB) switch.',
            '3. Verify absence of nominal voltage using a calibrated 11kV neon voltage detector.',
            '4. Discharge residual capacitive charge by applying standard portable earthing rods on all 3 phases.',
            '5. Barricade the working zone with safety warning tape prior to commencing maintenance.'
          ]
        };

        return {
          toolName: name,
          success: true,
          data: {
            taskType,
            safetyGuidelines: protocol
          },
          displayChip: 'Loaded CEA Safety Protocols'
        };
      }

      // ---------------------------------------------------------------------
      // Management Tools
      // ---------------------------------------------------------------------
      case 'getExecutiveKpiSummary': {
        return {
          toolName: name,
          success: true,
          data: {
            utility: 'Uttar Gujarat Vij Company Limited (UGVCL)',
            discomAggregateLossPct: 11.4,
            gercBenchmarkTargetPct: 12.0,
            billingEfficiencyPct: 98.6,
            collectionEfficiencyPct: 99.1,
            totalConsumersMln: 4.82,
            peakDemandMw: 4820,
            feederAvailabilityRuralPct: 98.9,
            feederAvailabilityUrbanPct: 99.8,
            solarRooftopInstalledMw: 684.2
          },
          displayChip: 'Synthesized Discom Executive KPIs'
        };
      }

      case 'getFeederOverloadAnalytics': {
        const overloaded = FEEDER_METRICS.filter(f => f.utilizationPct > 80);
        return {
          toolName: name,
          success: true,
          data: {
            totalFeedersAnalyzed: FEEDER_METRICS.length,
            criticalOverloadedFeeders: overloaded
          },
          displayChip: `Analyzed Overloaded Feeders (${overloaded.length})`
        };
      }

      case 'getRevenueRealizationLedger': {
        return {
          toolName: name,
          success: true,
          data: {
            month: args.fiscalMonth || 'October 2026',
            totalEnergyBilledCrores: 842.15,
            totalRealizedCrores: 834.60,
            stateGovtAgriculturalSubsidyCrores: 124.50,
            fpppaReconciliationStatus: 'Audited & Approved by GERC'
          },
          displayChip: 'Inspected Revenue Realization Ledger'
        };
      }

      case 'getDiscomComplaintTrends': {
        return {
          toolName: name,
          success: true,
          data: {
            discomLevelGrievancesLogged30d: 4120,
            resolvedWithinSlaPct: 96.8,
            topCategories: [
              { category: 'Voltage Fluctuation / Neutral Loss', count: 1840, resolvedPct: 97.4 },
              { category: 'Smart Meter Communication Delay', count: 1210, resolvedPct: 98.1 },
              { category: 'Billing Discrepancy & Arrears', count: 1070, resolvedPct: 94.9 }
            ]
          },
          displayChip: 'Computed Discom Grievance Trends'
        };
      }

      // ---------------------------------------------------------------------
      // Admin Tools
      // ---------------------------------------------------------------------
      case 'querySystemAuditLogs': {
        let logs: any[] = [];
        if (session?.signedToken) {
          try {
            logs = dataStore.getAuditLogs(session.signedToken);
          } catch {
            logs = [];
          }
        }

        if (args.roleFilter) {
          logs = logs.filter(l => l.role?.toLowerCase() === String(args.roleFilter).toLowerCase());
        }

        const limit = Math.min(Number(args.limit) || 10, 20);

        return {
          toolName: name,
          success: true,
          data: {
            totalAuditRecords: logs.length,
            records: logs.slice(0, limit)
          },
          displayChip: `Scrutinized Security Audit Trail (${limit})`
        };
      }

      case 'getSecurityAccessMatrix': {
        return {
          toolName: name,
          success: true,
          data: {
            rolesConfigured: ['consumer', 'employee', 'field', 'management', 'admin'],
            rbacRules: [
              { role: 'consumer', permissions: ['READ_OWN_BILLS', 'READ_OWN_CONNECTIONS', 'PAY_OWN_BILLS', 'LOG_GRIEVANCE'] },
              { role: 'employee', permissions: ['READ_SUBDIVISION_QUEUES', 'VERIFY_APPLICATIONS', 'RESOLVE_GRIEVANCES'] },
              { role: 'field', permissions: ['READ_WORK_ORDERS', 'UPDATE_WORK_ORDER_STATUS', 'INSPECT_FEEDERS'] },
              { role: 'management', permissions: ['READ_DISCOM_METRICS', 'EXPORT_STATUTORY_REPORTS'] },
              { role: 'admin', permissions: ['SUPER_ADMIN', 'READ_AUDIT_LOGS', 'MANAGE_USERS', 'ROTATE_KEYS'] }
            ],
            sessionCookiePolicy: 'HttpOnly; SameSite=Lax; Secure (in prod)'
          },
          displayChip: 'Audited RBAC Access Matrix'
        };
      }

      case 'getSystemTelemetryStatus': {
        return {
          toolName: name,
          success: true,
          data: {
            services: SYSTEM_SERVICES,
            overallStatus: 'All Core UGVCL Microservices Healthy',
            averageLatencyMs: 44,
            uptime30dPct: 99.96
          },
          displayChip: 'Polled Infrastructure Telemetry'
        };
      }

      case 'getRecentAuthEvents': {
        return {
          toolName: name,
          success: true,
          data: {
            recentAuthEvents: [
              { timestamp: 'Just now', event: 'SESSION_VERIFIED', actor: session?.user.email || 'demo_session', result: 'ALLOW' },
              { timestamp: '5 mins ago', event: 'RATE_LIMIT_CHECK', actor: '127.0.0.1', result: 'PASS' },
              { timestamp: '14 mins ago', event: 'CSRF_VALIDATION', actor: 'Client Browser', result: 'PASS' }
            ]
          },
          displayChip: 'Checked Authentication Events'
        };
      }

      default:
        return {
          toolName: name,
          success: false,
          error: `Unhandled tool execution: ${name}`,
          displayChip: `Unknown Tool: ${name}`
        };
    }
  } catch (err: any) {
    return {
      toolName: name,
      success: false,
      error: `Tool execution failed: ${err?.message || String(err)}`,
      displayChip: `Tool Failed: ${name}`
    };
  }
}
