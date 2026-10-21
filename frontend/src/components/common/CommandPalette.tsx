import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Search,
  Zap,
  FileText,
  AlertTriangle,
  Wrench,
  ArrowRight,
  Shield,
  Activity,
  Layers,
  CheckCircle2,
  Clock,
  XCircle,
  Tag
} from 'lucide-react';

type RecordCategory = 'All' | 'Connections' | 'Bills' | 'Applications' | 'Complaints' | 'Work Orders';

interface SearchResultItem {
  id: string;
  recordIdentifier: string;
  title: string;
  subtitle: string;
  meta: string;
  category: 'Connections' | 'Bills' | 'Applications' | 'Complaints' | 'Work Orders' | 'System';
  status: string;
  statusColor: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate';
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    currentRole,
    demoSession,
    activeUser,
    // Scoped consumer records
    userConnections,
    userApplications,
    userBills,
    userComplaints,
    // Operational global records for staff/admin
    applications,
    complaints,
    workOrders,
    bills,
    connections,
    setActiveTab,
    openCaseDrawer
  } = useApp();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecordCategory>('All');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 40);
      setQuery('');
      setSelectedCategory('All');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  // Status color helper
  const getStatusBadge = (status: string): { label: string; color: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' } => {
    const s = (status || '').toLowerCase();
    if (s.includes('active') || s.includes('paid') || s.includes('resolved') || s.includes('completed') || s.includes('approved')) {
      return { label: status, color: 'emerald' };
    }
    if (s.includes('pending') || s.includes('unpaid') || s.includes('in progress') || s.includes('investigation') || s.includes('review')) {
      return { label: status, color: 'amber' };
    }
    if (s.includes('rejected') || s.includes('overdue') || s.includes('critical') || s.includes('failed')) {
      return { label: status, color: 'rose' };
    }
    if (s.includes('assigned') || s.includes('scheduled') || s.includes('dispatched')) {
      return { label: status, color: 'blue' };
    }
    return { label: status, color: 'slate' };
  };

  // Build role-authorized record dataset
  const records = useMemo<SearchResultItem[]>(() => {
    const isConsumer = currentRole === 'consumer';
    const items: SearchResultItem[] = [];

    // 1. Electricity Connections
    // Consumer: Only linked connections. Utility: All circle connections.
    const accessibleConnections = isConsumer ? userConnections : connections;
    accessibleConnections.forEach(conn => {
      const st = getStatusBadge(conn.status);
      items.push({
        id: `conn-${conn.consumerNo}`,
        recordIdentifier: conn.consumerNo,
        title: `${conn.consumerNo} · ${conn.consumerName}`,
        subtitle: `${conn.subdivision} · Meter: ${conn.meterNo} (${conn.tariffCategory}, ${conn.sanctionedLoadKw} kW)`,
        meta: `Feeder: ${conn.feederName}`,
        category: 'Connections',
        status: conn.status,
        statusColor: st.color,
        icon: <Zap className="w-4 h-4 text-blue-600" />,
        action: () => {
          setActiveTab('dashboard');
          setIsCommandPaletteOpen(false);
        }
      });
    });

    // 2. Electricity Bills
    // Consumer: Only their bills. Staff: Operational bills.
    const accessibleBills = isConsumer ? userBills : bills;
    accessibleBills.forEach(bill => {
      const st = getStatusBadge(bill.status);
      items.push({
        id: `bill-${bill.billNo}`,
        recordIdentifier: bill.billNo,
        title: `Bill ${bill.billNo} · ₹${bill.totalAmount.toLocaleString('en-IN')}`,
        subtitle: `Consumer No: ${bill.consumerNo} · Cycle: ${bill.billMonth} · Due: ${bill.dueDate}`,
        meta: `Units: ${bill.unitsConsumed} kWh · Energy: ₹${bill.energyCharges.toLocaleString('en-IN')}`,
        category: 'Bills',
        status: bill.status,
        statusColor: st.color,
        icon: <FileText className="w-4 h-4 text-indigo-600" />,
        action: () => {
          setActiveTab('bills');
          setIsCommandPaletteOpen(false);
        }
      });
    });

    // 3. New Connection Applications
    // Consumer: Only their submitted applications. Utility roles: Operational applications.
    const accessibleApps = isConsumer ? userApplications : applications;
    accessibleApps.forEach(app => {
      const st = getStatusBadge(app.status);
      items.push({
        id: `app-${app.id}`,
        recordIdentifier: app.id,
        title: `${app.id} · ${app.applicantName}`,
        subtitle: `${app.category} (${app.requestedLoadKw} kW) · ${app.subdivision}`,
        meta: `Applied: ${app.appliedDate} · Tracking: ${app.id}`,
        category: 'Applications',
        status: app.status,
        statusColor: st.color,
        icon: <Layers className="w-4 h-4 text-emerald-600" />,
        action: () => {
          if (isConsumer) {
            setActiveTab('connections');
          } else {
            openCaseDrawer('application', app.id);
          }
          setIsCommandPaletteOpen(false);
        }
      });
    });

    // 4. Grievance & Complaints
    // Consumer: Only their complaints. Utility roles: Operational complaints.
    const accessibleComplaints = isConsumer ? userComplaints : complaints;
    accessibleComplaints.forEach(cmp => {
      const st = getStatusBadge(cmp.status);
      items.push({
        id: `cmp-${cmp.id}`,
        recordIdentifier: cmp.id,
        title: `${cmp.id} · ${cmp.category}`,
        subtitle: `Consumer: ${cmp.consumerName} (${cmp.consumerNo}) · ${cmp.subdivision}`,
        meta: `Priority: ${cmp.priority} · Feeder: ${cmp.feederName}`,
        category: 'Complaints',
        status: cmp.status,
        statusColor: st.color,
        icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
        action: () => {
          if (isConsumer) {
            setActiveTab('complaints');
          } else {
            openCaseDrawer('complaint', cmp.id);
          }
          setIsCommandPaletteOpen(false);
        }
      });
    });

    // 5. Work Orders (Only accessible by utility employee, field engineer, management, and admin)
    if (!isConsumer) {
      workOrders.forEach(wo => {
        const st = getStatusBadge(wo.status);
        items.push({
          id: `wo-${wo.id}`,
          recordIdentifier: wo.id,
          title: `${wo.id} · ${wo.title}`,
          subtitle: `Location: ${wo.location} · Assigned: ${wo.assignedTo}`,
          meta: `Priority: ${wo.priority} · Scheduled: ${wo.scheduledDate}`,
          category: 'Work Orders',
          status: wo.status,
          statusColor: st.color,
          icon: <Wrench className="w-4 h-4 text-teal-600" />,
          action: () => {
            openCaseDrawer('workorder', wo.id);
            setIsCommandPaletteOpen(false);
          }
        });
      });
    }

    return items;
  }, [
    currentRole,
    userConnections,
    userApplications,
    userBills,
    userComplaints,
    connections,
    applications,
    complaints,
    workOrders,
    bills,
    setActiveTab,
    openCaseDrawer,
    setIsCommandPaletteOpen
  ]);

  // Filtered and queried results
  const filteredResults = useMemo(() => {
    const q = query.toLowerCase().trim();

    let list = records;
    if (selectedCategory !== 'All') {
      list = list.filter(item => item.category === selectedCategory);
    }

    if (!q) {
      return list.slice(0, 15);
    }

    return list.filter(item => {
      return (
        item.recordIdentifier.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.meta.toLowerCase().includes(q) ||
        item.status.toLowerCase().includes(q)
      );
    }).slice(0, 20);
  }, [records, query, selectedCategory]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        filteredResults[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false);
    }
  };

  if (!isCommandPaletteOpen) return null;

  const categories: RecordCategory[] = currentRole === 'consumer'
    ? ['All', 'Connections', 'Bills', 'Applications', 'Complaints']
    : ['All', 'Connections', 'Bills', 'Applications', 'Complaints', 'Work Orders'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => setIsCommandPaletteOpen(false)}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Header */}
        <div className="px-4 pt-3.5 pb-2.5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                VidyutFlow Record Search
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                Role: {currentRole.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {currentRole === 'consumer'
                  ? `Authorized for: ${activeUser.name}`
                  : 'Authorized Utility Search'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={
                currentRole === 'consumer'
                  ? 'Search consumer number, bill number, application ID, or complaint ID...'
                  : 'Search consumer no, applicant name, complaint ID, bill no, or work order...'
              }
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none py-1 font-medium"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 px-1"
                aria-label="Clear query"
              >
                Clear
              </button>
            )}
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 rounded border border-slate-200">
              ESC
            </kbd>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 text-xs">
            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
            {categories.map(cat => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-2xs font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[420px] overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredResults.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-5 h-5" />
              </div>
              <div className="text-xs font-semibold text-slate-700">
                No matching records found
              </div>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                {query
                  ? `No records match "${query}". Try searching by Consumer No (e.g., 04281-99231), Bill ID (e.g., BILL-), Application (e.g., APP-), or Complaint ID (e.g., CMP-).`
                  : currentRole === 'consumer'
                    ? 'No records linked to this consumer account yet.'
                    : 'Enter an identifier to search across utility databases.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResults.map((item, index) => {
                const isSelected = index === selectedIndex;
                const statusBadgeClasses = {
                  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                  amber: 'bg-amber-50 text-amber-700 border-amber-200',
                  rose: 'bg-rose-50 text-rose-700 border-rose-200',
                  blue: 'bg-blue-50 text-blue-700 border-blue-200',
                  slate: 'bg-slate-100 text-slate-700 border-slate-200'
                }[item.statusColor];

                return (
                  <button
                    key={`${item.id}-${index}`}
                    onClick={() => item.action()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border border-blue-200/80 text-blue-950'
                        : 'border border-transparent hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-semibold ${statusBadgeClasses}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {item.subtitle}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                          {item.meta}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {item.category}
                      </span>
                      {isSelected ? (
                        <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↑</kbd>{' '}
              <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px]">↵</kbd> to open record
            </span>
          </div>
          <span className="font-medium text-slate-400">
            Showing {filteredResults.length} authorized record{filteredResults.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
