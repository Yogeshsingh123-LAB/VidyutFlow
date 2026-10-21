import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { FEEDER_METRICS } from '../../data/mockData';
import {
  Wrench,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Wifi,
  WifiOff,
  Navigation,
  FileCheck,
  Check,
  Phone,
  HardHat,
  RotateCw,
  Info,
  History,
  Zap
} from 'lucide-react';
import { WorkOrder } from '../../types';

export const FieldPortal: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    workOrders,
    updateWorkOrderStatus,
    openCaseDrawer,
    isOfflineSimulated,
    setIsOfflineSimulated,
    showToast,
    activeUser
  } = useApp();

  const [selectedOrderForInspection, setSelectedOrderForInspection] = useState<WorkOrder | null>(null);

  // Form states for active inspection
  const [meterSerialScanned, setMeterSerialScanned] = useState('GEN-SM-2026-9921');
  const [readingKwh, setReadingKwh] = useState(14820);
  const [sealIntact, setSealIntact] = useState(true);
  const [terminalCondition, setTerminalCondition] = useState<'Normal' | 'Burnt' | 'Loose'>('Normal');
  const [testedVoltageR, setTestedVoltageR] = useState(232);
  const [testedVoltageY, setTestedVoltageY] = useState(231);
  const [testedVoltageB, setTestedVoltageB] = useState(234);
  const [technicianRemarks, setTechnicianRemarks] = useState('Inspected neutral terminal at DP-14 and replaced oxidized aluminium crimp.');
  const [isPhotoUploaded, setIsPhotoUploaded] = useState(true);

  const handleStartInspection = (wo: WorkOrder) => {
    setSelectedOrderForInspection(wo);
    setActiveTab('inspections');
  };

  const handleInspectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForInspection) return;

    updateWorkOrderStatus(selectedOrderForInspection.id, 'Completed', {
      meterSerialScanned,
      readingKwh: Number(readingKwh),
      sealIntact,
      terminalCondition,
      tamperDetected: false,
      testedPhaseVoltage: { r: Number(testedVoltageR), y: Number(testedVoltageY), b: Number(testedVoltageB) },
      technicianRemarks,
      photoUploaded: isPhotoUploaded
    });

    showToast(`Inspection report submitted for ${selectedOrderForInspection.id}!`, 'success');
    setSelectedOrderForInspection(null);
    setActiveTab('workorders');
  };

  const pendingOrders = workOrders.filter(w => w.status !== 'Completed');
  const completedOrders = workOrders.filter(w => w.status === 'Completed');

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0">
      {/* Field Engineer Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-white p-1 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center shrink-0">
            <img src="/assets/ugvcl-logo.png" alt="UGVCL Official Logo" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug break-words">
                Field Operations Console &amp; Inspection App
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Field Lineman / JE
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 leading-relaxed break-words">
              <span>UGVCL Operations · Engineer:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{activeUser.name}</span>
              <span>({activeUser.designation}) · Feeder Wing Mehsana</span>
            </p>
          </div>
        </div>

        {/* Offline Simulation Control */}
        <div className="flex items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80 shrink-0">
          <button
            onClick={() => {
              setIsOfflineSimulated(!isOfflineSimulated);
              showToast(
                !isOfflineSimulated
                  ? 'Simulated Offline Mode enabled (No network). Changes queued in memory.'
                  : 'Simulated Online Mode restored. Queued records flushed.',
                'info'
              );
            }}
            className={`w-full sm:w-auto min-h-11 sm:min-h-[38px] flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              isOfflineSimulated
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 text-amber-900 dark:text-amber-200'
                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {isOfflineSimulated ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>Simulated Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>Online (4G AMR)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Offline Notice */}
      {isOfflineSimulated && (
        <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>UI Simulation Only:</strong> You are testing the field offline experience. Completed inspection forms and photo captures are stored in volatile client state and will simulate synchronization when toggled back to Online.
          </div>
        </div>
      )}

      {/* VIEW 1: FIELD DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Assigned Work Orders Today
              </span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {pendingOrders.length}
              </div>
              <span className="text-xs text-blue-600 font-medium">1 In Progress · 2 Pending Sites</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Emergency Fault Callouts
              </span>
              <div className="text-3xl font-extrabold text-amber-600 tabular-nums">
                1 Active
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">DT Overload Inspection (WO-4403)</span>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Completed Inspections
              </span>
              <div className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                {completedOrders.length}
              </div>
              <span className="text-xs text-slate-500">Synchronized with Sub-division</span>
            </div>
          </div>

          {/* Today's Schedule Card List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Today&apos;s Field Itinerary & Tasks
              </h3>
              <button
                onClick={() => setActiveTab('workorders')}
                className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
              >
                View All Work Orders →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingOrders.map(wo => (
                <div
                  key={wo.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                        {wo.id}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                        {wo.title}
                      </h4>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      wo.priority === 'Emergency'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {wo.priority}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{wo.location}</span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    Feeder: {wo.feederName} · Scheduled: {wo.scheduledDate}
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Status: {wo.status}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openCaseDrawer('workorder', wo.id)}
                        className="min-h-[36px] px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleStartInspection(wo)}
                        className="min-h-[36px] px-3.5 py-1.5 text-xs rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        <span>Perform Inspection</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ASSIGNED WORK ORDERS */}
      {activeTab === 'workorders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Assigned Work Orders
              </h2>
              <p className="text-xs text-slate-500">
                Inspection tasks, fault callouts, and meter replacements
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {workOrders.map(wo => (
              <div
                key={wo.id}
                className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                        {wo.id}
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {wo.title}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Type: {wo.type} · Location: {wo.location}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {wo.status}
                    </span>
                    {wo.status !== 'Completed' ? (
                      <button
                        onClick={() => handleStartInspection(wo)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-600 hover:bg-teal-700 text-white shadow-xs"
                      >
                        Enter Inspection Findings
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                    )}
                  </div>
                </div>

                {wo.inspectionReport && (
                  <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-950 dark:text-emerald-200">
                    <div className="font-semibold mb-1">Inspection Findings Recorded:</div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300">
                      Meter Serial: {wo.inspectionReport.meterSerialScanned} · Reading: {wo.inspectionReport.readingKwh} kWh · Voltage: {wo.inspectionReport.testedPhaseVoltage.r}V / {wo.inspectionReport.testedPhaseVoltage.y}V / {wo.inspectionReport.testedPhaseVoltage.b}V
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 italic">
                      Remarks: &quot;{wo.inspectionReport.technicianRemarks}&quot;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 3: SITE INSPECTION FORM */}
      {activeTab === 'inspections' && (
        <div className="max-w-2xl mx-auto p-4 sm:p-6 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-5 sm:space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
              Field Site Inspection &amp; Feasibility Report
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Task: {selectedOrderForInspection ? selectedOrderForInspection.title : 'WO-4401 (CMP-8821 Rectification)'}
            </p>
          </div>

          <form onSubmit={handleInspectionSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Scanned Meter Serial / Barcode *
                </label>
                <input
                  type="text"
                  value={meterSerialScanned}
                  onChange={e => setMeterSerialScanned(e.target.value)}
                  required
                  className="w-full min-h-11 sm:min-h-9 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Verified Meter Reading (kWh) *
                </label>
                <input
                  type="number"
                  value={readingKwh}
                  onChange={e => setReadingKwh(Number(e.target.value))}
                  required
                  className="w-full min-h-11 sm:min-h-9 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Holographic Optical Seal Status
                </label>
                <select
                  value={sealIntact ? 'intact' : 'broken'}
                  onChange={e => setSealIntact(e.target.value === 'intact')}
                  className="w-full min-h-11 sm:min-h-9 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="intact">Seal Intact &amp; Verified</option>
                  <option value="broken">Seal Broken / Suspicious</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Terminal Block Condition
                </label>
                <select
                  value={terminalCondition}
                  onChange={e => setTerminalCondition(e.target.value as any)}
                  className="w-full min-h-11 sm:min-h-9 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="Normal">Normal Condition</option>
                  <option value="Burnt">Burnt / Flashover Marks</option>
                  <option value="Loose">Loose Neutral Connection</option>
                </select>
              </div>
            </div>

            {/* Voltage Test Inputs */}
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                Tested Phase Voltages (Volts AC)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">R-Phase</span>
                  <input
                    type="number"
                    value={testedVoltageR}
                    onChange={e => setTestedVoltageR(Number(e.target.value))}
                    className="w-full min-h-10 sm:min-h-9 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Y-Phase</span>
                  <input
                    type="number"
                    value={testedVoltageY}
                    onChange={e => setTestedVoltageY(Number(e.target.value))}
                    className="w-full min-h-10 sm:min-h-9 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">B-Phase</span>
                  <input
                    type="number"
                    value={testedVoltageB}
                    onChange={e => setTestedVoltageB(Number(e.target.value))}
                    className="w-full min-h-10 sm:min-h-9 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Photo Attachment Preview */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Site Photo Evidence (Mobile Camera Preview)
              </span>
              <div className="flex flex-col min-[380px]:flex-row min-[380px]:items-center gap-3 min-w-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="text-xs min-w-0">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 break-all sm:break-normal">
                    meter_pole_dp14_inspection.jpg
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    GPS Geotag: 23.6028° N, 72.3984° E · 1.4 MB
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" /> Geotag Timestamp Verified
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Technician Observations &amp; Rectification Remarks *
              </label>
              <textarea
                value={technicianRemarks}
                onChange={e => setTechnicianRemarks(e.target.value)}
                rows={2}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="w-full min-h-11 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              Sign &amp; Transmit Inspection Report
            </button>
          </form>
        </div>
      )}

      {/* VIEW 4: OFFLINE QUEUE */}
      {activeTab === 'offline' && (
        <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                Simulated Offline Queue Status
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Local field buffer for areas with intermittent mobile network coverage
              </p>
            </div>
            <button
              onClick={() => showToast('Simulated flush: All 2 queued inspections transmitted', 'success')}
              className="w-full sm:w-auto min-h-11 sm:min-h-[38px] px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
            >
              Simulate Sync Now
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">WO-4398 Smart Meter Seal</span>
                <p className="text-slate-500 text-[11px] mt-0.5">Sector 4/B · Polycarbonate seal #UGVCL-882191 affixed</p>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-600 shrink-0">Synced to Server</span>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">WO-4401 Voltage Rectification</span>
                <p className="text-slate-500 text-[11px] mt-0.5">14 Anand Nagar · Neutral crimped, 232V tested</p>
              </div>
              <span className="self-start sm:self-auto text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-600 shrink-0">Pending Background Push</span>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: FEEDER PATROL & LINE SURVEILLANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                11kV Feeder Patrol &amp; Line Corridor Surveillance
              </h2>
              <p className="text-xs text-slate-500">
                Distribution feeder loading, transformer clusters, and active field tasks across North Gujarat subdivisions
              </p>
            </div>
            <button
              onClick={() => setActiveTab('workorders')}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto"
            >
              View Assigned Work Orders →
            </button>
          </div>

          {/* Feeder Patrol Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Monitored 11kV Feeders
              </span>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">
                {FEEDER_METRICS.length}
              </div>
              <span className="text-xs text-slate-500">Mehsana &amp; Gandhinagar Circles</span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Feeders Requiring Attention
              </span>
              <div className="text-2xl font-extrabold text-amber-600 tabular-nums">
                {FEEDER_METRICS.filter(f => f.status !== 'Optimal').length}
              </div>
              <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                1 Critical Overload · 1 High Load Warning
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Open Field Work Orders
              </span>
              <div className="text-2xl font-extrabold text-teal-600 tabular-nums">
                {pendingOrders.length}
              </div>
              <span className="text-xs text-slate-500">Scheduled along 11kV corridors</span>
            </div>
          </div>

          {FEEDER_METRICS.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FEEDER_METRICS.map(fdr => {
                const feederOrders = workOrders.filter(wo => wo.feederName === fdr.name);
                return (
                  <div
                    key={fdr.id}
                    className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                          {fdr.id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                          {fdr.name}
                        </h3>
                        <span className="text-xs text-slate-500">{fdr.subdivision}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          fdr.status === 'Critical Overload'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : fdr.status === 'Warning'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {fdr.status}
                      </span>
                    </div>

                    {/* Utilization Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">Conductor Load Utilization</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {fdr.utilizationPct}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fdr.utilizationPct > 100
                              ? 'bg-rose-500'
                              : fdr.utilizationPct > 90
                              ? 'bg-amber-500'
                              : 'bg-teal-500'
                          }`}
                          style={{ width: `${Math.min(fdr.utilizationPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Peak Load</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {fdr.peakLoadAmps}A / {fdr.ratedCapacityAmps}A
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Transformers</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {fdr.transformersCount} DTs
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Consumers</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {fdr.consumersConnected.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Associated Work Orders on this Feeder */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-500">
                        {feederOrders.length > 0 ? (
                          <span>
                            Linked Work Order:{' '}
                            <strong className="font-mono text-slate-800 dark:text-slate-200">
                              {feederOrders.map(o => o.id).join(', ')}
                            </strong>{' '}
                            ({feederOrders[0].status})
                          </span>
                        ) : (
                          <span>No open fault callouts on this feeder</span>
                        )}
                      </div>

                      {feederOrders.length > 0 && feederOrders[0].status !== 'Completed' ? (
                        <button
                          onClick={() => handleStartInspection(feederOrders[0])}
                          className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shrink-0"
                        >
                          Inspect {feederOrders[0].id}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            showToast(
                              `Logged routine corridor patrol check for ${fdr.name} (UI simulation)`,
                              'info'
                            )
                          }
                          className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
                        >
                          Log Patrol Check
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
              <HardHat className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Feeder Patrol Records Available
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                No 11kV feeder telemetry records are currently loaded in the field console.
              </p>
            </div>
          )}
        </div>
      )}

      {/* VIEW 6: COMPLETED JOBS & INSPECTION HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Completed Jobs &amp; Inspection History
              </h2>
              <p className="text-xs text-slate-500">
                Closed field work orders and submitted technical inspection reports
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {completedOrders.length} Completed {completedOrders.length === 1 ? 'Job' : 'Jobs'}
              </span>
              <button
                onClick={() => setActiveTab('workorders')}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                All Work Orders
              </button>
            </div>
          </div>

          {completedOrders.length > 0 ? (
            <div className="space-y-4">
              {completedOrders.map(wo => (
                <div
                  key={wo.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-teal-600 dark:text-teal-400">
                          {wo.id}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {wo.title}
                        </h3>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {wo.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{wo.location}</span>
                        </span>
                        <span>·</span>
                        <span>Feeder: {wo.feederName}</span>
                        <span>·</span>
                        <span>Scheduled: {wo.scheduledDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                      <button
                        onClick={() => openCaseDrawer('workorder', wo.id)}
                        className="px-3 py-1.5 text-xs font-semibold rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        View Case File
                      </button>
                    </div>
                  </div>

                  {wo.inspectionReport ? (
                    <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-950 dark:text-emerald-200">
                          Recorded Site Inspection Report
                        </span>
                        <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                          Engineer: {wo.assignedTo}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Scanned Meter Serial
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.meterSerialScanned}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Verified Reading
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.readingKwh} kWh
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Seal &amp; Terminal
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.sealIntact ? 'Seal Intact' : 'Seal Broken'} ·{' '}
                            {wo.inspectionReport.terminalCondition}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 block">
                            Phase Voltages (R/Y/B)
                          </span>
                          <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {wo.inspectionReport.testedPhaseVoltage.r}V /{' '}
                            {wo.inspectionReport.testedPhaseVoltage.y}V /{' '}
                            {wo.inspectionReport.testedPhaseVoltage.b}V
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 italic">
                        Remarks: &quot;{wo.inspectionReport.technicianRemarks}&quot;
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                      Work order marked completed ({wo.title}).
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-xl bg-white dark:bg-[#101C35] border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
              <History className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No Completed Work Orders Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Completed field inspections and fault rectifications will appear here once submitted.
              </p>
              <button
                onClick={() => setActiveTab('workorders')}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                View Assigned Work Orders
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
