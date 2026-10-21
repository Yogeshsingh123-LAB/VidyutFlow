export type UserRole = 'consumer' | 'employee' | 'field' | 'management' | 'admin';

export interface RoleConfig {
  id: UserRole;
  label: string;
  badge: string;
  personaName: string;
  personaDesignation: string;
  personaAvatar: string;
  description: string;
  division: string;
  primaryFocus: string;
}

export type TariffCategory = 'Residential (RGPU)' | 'Commercial (NRGP)' | 'Industrial (LTMD)' | 'Agricultural (AG)';

export interface ElectricityConnection {
  consumerNo: string;
  connectionId: string;
  consumerName: string;
  meterNo: string;
  sanctionedLoadKw: number;
  phase: '1-Phase' | '3-Phase';
  tariffCategory: TariffCategory;
  address: string;
  subdivision: string;
  feederName: string;
  status: 'Active' | 'Disconnection Notice' | 'Suspended' | 'New Installation';
  connectedDate: string;
  lastReadingDate: string;
  currentReadingKwh: number;
  previousReadingKwh: number;
  averageMonthlyKwh: number;
  securityDeposit: number;
  accountId?: string;
  accountEmail?: string;
}

export interface ElectricityBill {
  billNo: string;
  consumerNo: string;
  billMonth: string;
  billDate: string;
  dueDate: string;
  unitsConsumed: number;
  energyCharges: number;
  fixedCharges: number;
  fuelPriceAdjustment: number;
  electricityDuty: number;
  rebateOrSubsidy: number;
  totalAmount: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
  paidDate?: string;
  transactionRef?: string;
  slabBreakdown: { slab: string; units: number; rate: number; amount: number }[];
  accountId?: string;
}

export interface PaymentTransaction {
  txId: string;
  consumerNo: string;
  billNo: string;
  date: string;
  amount: number;
  paymentMethod: 'UPI / BHIM' | 'Net Banking' | 'Debit Card' | 'RTGS/NEFT' | 'Bill Desk Counter';
  status: 'Successful' | 'Pending Verification' | 'Failed';
  bankReference: string;
  accountId?: string;
}

export interface NewConnectionApplication {
  id: string;
  applicantName: string;
  phone: string;
  email: string;
  address: string;
  subdivision: string;
  category: TariffCategory;
  requestedLoadKw: number;
  phase: '1-Phase' | '3-Phase';
  premisesType: 'Owned' | 'Rented' | 'Government Leased';
  status: 'Submitted' | 'Document Verification' | 'Site Inspection' | 'Sanction Approval' | 'Meter Installed' | 'Rejected';
  appliedDate: string;
  targetCompletionDate: string;
  assignedOfficer: string;
  assignedEngineer?: string;
  estimatedSanctionCost: number;
  documentsSubmitted: string[];
  workflowStep: number; // 1 to 5
  notesHistory: { timestamp: string; author: string; note: string }[];
  accountId?: string;
}

export interface ComplaintRecord {
  id: string;
  consumerNo: string;
  consumerName: string;
  phone: string;
  category: 'Power Outage' | 'Voltage Fluctuation' | 'Meter Fault' | 'Billing Dispute' | 'Sparking / Hazardous Wire' | 'Streetlight Failure';
  description: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Registered' | 'In Review' | 'Dispatched' | 'In Progress' | 'Resolved' | 'Closed';
  subdivision: string;
  feederName: string;
  filedAt: string;
  slaTargetHours: number;
  slaDueTime: string;
  slaBreached: boolean;
  assignedTechnician?: string;
  resolutionRemarks?: string;
  resolvedAt?: string;
  timeline: { time: string; stage: string; actor: string; remark: string }[];
  accountId?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  type: 'New Connection Verification' | 'Meter Replacement' | 'Feeder Patrol & Maintenance' | 'Transformer Overload Inspection' | 'Disconnection Order';
  subdivision: string;
  feederName: string;
  location: string;
  gpsCoordinates: { lat: number; lng: number };
  consumerNo?: string;
  consumerName?: string;
  priority: 'Emergency' | 'High' | 'Routine';
  scheduledDate: string;
  status: 'Pending' | 'En Route' | 'On Site' | 'Completed' | 'Deferred';
  assignedTo: string;
  materialsNeeded: string[];
  inspectionReport?: {
    meterSerialScanned: string;
    readingKwh: number;
    sealIntact: boolean;
    terminalCondition: 'Normal' | 'Burnt' | 'Loose';
    tamperDetected: boolean;
    testedPhaseVoltage: { r: number; y: number; b: number };
    technicianRemarks: string;
    photoUploaded: boolean;
  };
}

export interface FeederHealth {
  id: string;
  name: string;
  subdivision: string;
  voltageKv: number;
  peakLoadAmps: number;
  ratedCapacityAmps: number;
  utilizationPct: number;
  status: 'Optimal' | 'Warning' | 'Critical Overload';
  transformersCount: number;
  consumersConnected: number;
  trippingEventsPast30d: number;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  resource: string;
  ipAddress: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  metaDetail: string;
}

export interface SystemServiceStatus {
  name: string;
  category: 'Core ERP' | 'Metering & AMR' | 'Billing & Rev' | 'Citizen Portals' | 'Security';
  status: 'Operational' | 'Degraded' | 'Maintenance' | 'Down';
  latencyMs: number;
  uptime90d: number;
  lastIncident: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  targetRole: UserRole | 'all';
  type: 'info' | 'alert' | 'success' | 'warning';
  read: boolean;
  category: 'Billing' | 'Outage' | 'Approval' | 'Inspection' | 'Security';
  actionUrl?: string;
}

export interface ConsumerProfile {
  consumerNo: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  subdivision: string;
  aadhaarMasked?: string;
  panMasked?: string;
  totalConnections: number;
}

export interface EmployeeRecord {
  id: string;
  name: string;
  designation: string;
  department: string;
  subdivision: string;
  email: string;
  phone: string;
  activeCases: number;
}

export interface FieldEngineerRecord {
  id: string;
  name: string;
  designation: string;
  assignedFeeder: string;
  subdivision: string;
  phone: string;
  status: 'Available' | 'On Site' | 'Offline';
  activeWorkOrders: number;
  completedToday: number;
}

