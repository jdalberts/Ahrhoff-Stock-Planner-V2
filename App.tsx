import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from './db';
import { Item, InventoryLot, SalesHistory, Settings, ItemPlanningView, InventoryAlert } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { calculateItemPlanning, detectAlerts } from './calculations';
import { 
  LayoutDashboard, 
  Package, 
  ClipboardCheck, 
  TrendingUp, 
  ShoppingCart, 
  Settings as SettingsIcon,
  Bell,
  Menu,
  X,
  Upload
} from 'lucide-react';

// --- Page Components ---
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Items from './pages/Items';
import StockTake from './pages/StockTake';
import SalesEntry from './pages/SalesEntry';
import OrderPlan from './pages/OrderPlan';
import SettingsPage from './pages/SettingsPage';
import AlertsPage from './pages/Alerts';
import ExcelImport from './pages/ExcelImport';

// --- FIX (Issue 7): Error Boundary to catch crashes gracefully ---
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AgriStock Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 p-8">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
            <p className="text-slate-500 mb-6">
              An unexpected error occurred. Your data is safe in the local database.
            </p>
            <p className="text-xs text-slate-400 bg-slate-100 p-3 rounded-lg mb-6 font-mono text-left break-all">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- FIX (Improvement 1): Proper TypeScript interface for NavItem ---
interface NavItemProps {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  activeTab: string;
  onSelect: (id: string) => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, label, icon: Icon, badge, activeTab, onSelect }) => (
  <button
    onClick={() => onSelect(id)}
    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg transition-colors ${
      activeTab === id ? 'bg-green-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
    }`}
  >
    <div className="flex items-center">
      <Icon size={20} className="mr-3" />
      <span className="font-medium">{label}</span>
    </div>
    {badge !== undefined && badge > 0 && (
      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${activeTab === id ? 'bg-white text-green-600' : 'bg-red-500 text-white'}`}>
        {badge}
      </span>
    )}
  </button>
);

const AppContent: React.FC = () => {
  // Global States
  const [items, setItems] = useState<Item[]>([]);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [sales, setSales] = useState<SalesHistory[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // FIX (Improvement 4): Tab persists in localStorage so refresh keeps your place
  const [activeTab, setActiveTab] = useState<string>(
    () => {
      try { return localStorage.getItem('agristock_activeTab') || 'dashboard'; }
      catch { return 'dashboard'; }
    }
  );
  useEffect(() => {
    try { localStorage.setItem('agristock_activeTab', activeTab); }
    catch { /* localStorage unavailable — ignore */ }
  }, [activeTab]);

  // FIX (Bug 2): Use a ref to track the latest alerts without triggering re-renders.
  // This prevents the infinite loop where setAlerts → alerts changes → useEffect re-runs.
  const alertsRef = useRef<InventoryAlert[]>(alerts);
  alertsRef.current = alerts;

  // Initial Data Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const storedItems = await db.getAll<Item>('items');
        const storedLots = await db.getAll<InventoryLot>('lots');
        const storedSales = await db.getAll<SalesHistory>('sales');
        const storedSettings = await db.getAll<Settings>('settings');
        const storedAlerts = await db.getAll<InventoryAlert>('alerts');

        setItems(storedItems);
        setLots(storedLots);
        setSales(storedSales);
        setAlerts(storedAlerts);
        if (storedSettings.length > 0) setSettings(storedSettings[0]);
        
        setLoading(false);
      } catch (err) {
        console.error("DB Load Error", err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Planning View Generation
  const planningViews: ItemPlanningView[] = useMemo(() => {
    return items.map(item => calculateItemPlanning(item, lots, sales, settings));
  }, [items, lots, sales, settings]);

  // FIX (Bug 2): Alert detection uses alertsRef instead of alerts in deps.
  // This breaks the infinite loop: planningViews/settings change → detect → update alerts,
  // but the effect does NOT re-run because alerts is not a dependency.
  useEffect(() => {
    if (loading) return;
    const now = new Date();
    const currentAlerts = alertsRef.current;
    const newAlerts = detectAlerts(planningViews, currentAlerts, settings);

    if (newAlerts.length > 0) {
      // Filter out any alerts that already exist (pending) or were recently sent within cooldown
      const uniqueAlerts = newAlerts.filter(na => {
        const existing = currentAlerts.find(a =>
          a.itemId === na.itemId &&
          a.type === na.type &&
          (
            a.status === 'pending' ||
            ((a.lastSentAt || a.createdAt) && ((now.getTime() - new Date(a.lastSentAt || a.createdAt).getTime()) / (1000 * 3600) < settings.notificationCooldownHours))
          )
        );
        return !existing;
      });

      if (uniqueAlerts.length === 0) return;

      // Persist new alerts to DB
      uniqueAlerts.forEach(async (alert) => {
        await db.put('alerts', alert);
      });

      setAlerts(prev => [...prev, ...uniqueAlerts]);
    }
  }, [planningViews, settings, loading]); // FIX: alerts removed from deps — use ref instead


  // DB Sync Functions
  const refreshData = async () => {
    setItems(await db.getAll<Item>('items'));
    setLots(await db.getAll<InventoryLot>('lots'));
    setSales(await db.getAll<SalesHistory>('sales'));
    setAlerts(await db.getAll<InventoryAlert>('alerts'));
  };

  const updateSettings = async (newSettings: Settings) => {
    await db.put('settings', { ...newSettings, id: 'global' });
    setSettings(newSettings);
  };

  // FIX (Issue 4): Debug code removed — no more window.__runAlertDebug or visible debug button.

  const pendingAlertCount = alerts.filter(a => a.status === 'pending').length;

  const handleTabSelect = (id: string) => {
    setActiveTab(id);
    setIsSidebarOpen(false);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Initialising Inventory Engine...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      
      {/* Mobile Top Header — FIX (Issue 4): Debug button removed */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <Package className="text-green-600" />
          <h1 className="font-bold text-lg text-slate-800 tracking-tight">AgriStock</h1>
        </div>
        <div className="flex items-center space-x-2">
           {pendingAlertCount > 0 && (
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-0 z-50 md:relative md:flex flex-col w-72 bg-white border-r border-slate-200 p-6 space-y-2 transform transition-transform duration-200
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="hidden md:flex items-center space-x-3 mb-10 px-2">
          <div className="bg-green-600 p-2 rounded-lg text-white">
            <Package size={24} />
          </div>
          <h1 className="font-bold text-xl text-slate-800 tracking-tight">AgriStock <span className="text-green-600">Pro</span></h1>
        </div>

        <nav className="space-y-1">
          <NavItem id="dashboard" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="alerts" label="Alerts Center" icon={Bell} badge={pendingAlertCount} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="inventory" label="Inventory Lots" icon={Package} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="items" label="Product Master" icon={ClipboardCheck} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="stocktake" label="Stock Take" icon={ClipboardCheck} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="sales" label="Sales Entry" icon={TrendingUp} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="orderplan" label="Order Plan" icon={ShoppingCart} activeTab={activeTab} onSelect={handleTabSelect} />
          <NavItem id="import" label="Excel Import" icon={Upload} activeTab={activeTab} onSelect={handleTabSelect} />
          <div className="pt-4 mt-4 border-t border-slate-100">
            <NavItem id="settings" label="Settings" icon={SettingsIcon} activeTab={activeTab} onSelect={handleTabSelect} />
          </div>
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center text-green-600 text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Offline Mode Active
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'dashboard' && <Dashboard planningViews={planningViews} settings={settings} setActiveTab={setActiveTab} pendingAlertCount={pendingAlertCount} />}
          {activeTab === 'alerts' && <AlertsPage alerts={alerts} items={items} onRefresh={refreshData} settings={settings} planningViews={planningViews} />}
          {activeTab === 'inventory' && <Inventory lots={lots} items={items} onRefresh={refreshData} />}
          {activeTab === 'items' && <Items items={items} onRefresh={refreshData} />}
          {activeTab === 'stocktake' && <StockTake lots={lots} items={items} onRefresh={refreshData} />}
          {activeTab === 'sales' && <SalesEntry items={items} sales={sales} onRefresh={refreshData} />}
          {activeTab === 'orderplan' && <OrderPlan planningViews={planningViews} settings={settings} />}
          {activeTab === 'import' && <ExcelImport items={items} lots={lots} sales={sales} onRefresh={refreshData} />}
          {activeTab === 'settings' && <SettingsPage settings={settings} onUpdate={updateSettings} />}
        </div>
      </main>
    </div>
  );
};

// FIX (Issue 7): Wrap the whole app in ErrorBoundary
const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);

export default App;
