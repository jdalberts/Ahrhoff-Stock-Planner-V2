import React from 'react';
import { ItemPlanningView, Settings } from '../types';
import { AlertTriangle, TrendingDown, ShoppingCart, Clock, Bell } from 'lucide-react';

interface Props {
  planningViews: ItemPlanningView[];
  settings: Settings;
  setActiveTab: (tab: string) => void;
  pendingAlertCount: number;
}

// FIX (Improvement 1): Proper TypeScript interface instead of `any`
interface CardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  onClick: () => void;
  badge?: number;
}

const Card: React.FC<CardProps> = ({ title, value, icon: Icon, color, onClick, badge }) => (
  <div 
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-shadow group relative"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color} text-white group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-bounce">
          {badge}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 font-medium mb-1">{title}</h3>
    <p className="text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const Dashboard: React.FC<Props> = ({ planningViews, settings, setActiveTab, pendingAlertCount }) => {
  const lowStockCount = planningViews.filter(v => v.lowStockFlag).length;
  const expiringSoonCount = planningViews.reduce((sum, v) => sum + v.expiringSoonLots.length, 0);
  const itemsNeedingOrder = planningViews.filter(v => v.suggestedOrderQty > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Inventory Overview</h2>
        <p className="text-slate-500">Welcome back. Here is your current stock status based on lot analysis.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          title="Active Alerts" 
          value={pendingAlertCount} 
          icon={Bell} 
          color="bg-red-500"
          onClick={() => setActiveTab('alerts')}
        />
        <Card 
          title="Low Stock" 
          value={lowStockCount} 
          icon={TrendingDown} 
          color="bg-orange-500"
          onClick={() => setActiveTab('orderplan')}
        />
        <Card 
          title="Expiring Soon" 
          value={expiringSoonCount} 
          icon={Clock} 
          color="bg-yellow-500"
          onClick={() => setActiveTab('inventory')}
        />
        <Card 
          title="Potential Orders" 
          value={itemsNeedingOrder} 
          icon={ShoppingCart} 
          color="bg-blue-500"
          onClick={() => setActiveTab('orderplan')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-10">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <AlertTriangle className="text-red-500 mr-2" size={20} />
            Supply Chain Risks
          </h3>
          <div className="space-y-4">
            {planningViews.filter(v => v.lowStockFlag).slice(0, 5).map(v => (
              <div key={v.item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800">{v.item.name}</h4>
                  <p className="text-sm text-slate-500">
                    {v.availableStock} units remaining (
                    {v.daysCover === 999 ? '∞' : Math.round(v.daysCover)} days cover)
                  </p>
                </div>
                <button 
                  onClick={() => setActiveTab('orderplan')}
                  className="px-4 py-2 bg-white text-slate-700 text-sm font-semibold rounded-lg border border-slate-200 hover:bg-slate-50"
                >
                  Solve
                </button>
              </div>
            ))}
            {lowStockCount === 0 && <p className="text-slate-400 text-center py-10">Supply chain is healthy.</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
            <Clock className="text-yellow-500 mr-2" size={20} />
            Expiry Risks
          </h3>
          <div className="space-y-4">
            {planningViews.flatMap(v => v.expiringSoonLots.map(l => ({ ...l, itemName: v.item.name }))).slice(0, 5).map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800">{l.itemName}</h4>
                  <p className="text-sm text-slate-500">Lot: {l.lotNumber} | Qty: {l.quantityRemaining}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-orange-600 uppercase">Warning</p>
                  <p className="text-xs text-slate-500">{l.expiryDate ? new Date(l.expiryDate).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>
            ))}
            {expiringSoonCount === 0 && <p className="text-slate-400 text-center py-10">No upcoming expiries.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
