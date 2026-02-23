
import React, { useState } from 'react';
import { Item, SalesHistory } from '../types';
import { db } from '../db';
import { TrendingUp, Save, Search } from 'lucide-react';

interface Props {
  items: Item[];
  sales: SalesHistory[];
  onRefresh: () => void;
}

const SalesEntry: React.FC<Props> = ({ items, sales, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [tempSales, setTempSales] = useState<Record<string, string>>({}); // itemId_month -> value

  // Last 6 months calculation
  const getMonthKeys = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return months.reverse();
  };

  const monthKeys = getMonthKeys();

  const handleEdit = (item: Item) => {
    setEditingItemId(item.id);
    const initialValues: Record<string, string> = {};
    monthKeys.forEach(m => {
      const existing = sales.find(s => s.itemId === item.id && s.month === m);
      initialValues[`${item.id}_${m}`] = existing?.quantitySold.toString() || '0';
    });
    setTempSales(initialValues);
  };

  const handleSave = async (itemId: string) => {
    const updates = monthKeys.map(m => ({
      id: `${itemId}_${m}`,
      itemId,
      month: m,
      quantitySold: Number(tempSales[`${itemId}_${m}`] || 0)
    }));

    for (const update of updates) {
      await db.put('sales', update);
    }

    setEditingItemId(null);
    onRefresh();
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.skuCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Demand Forecast Entry</h2>
          <p className="text-slate-500">Manually record last 6 months sales to calculate average demand.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search products..."
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/20 w-64"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Product</th>
                {monthKeys.map(m => (
                  <th key={m} className="px-4 py-4 font-semibold text-slate-500 text-sm text-center">{m}</th>
                ))}
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.skuCode}</div>
                  </td>
                  {monthKeys.map(m => {
                    const isEditing = editingItemId === item.id;
                    const val = isEditing 
                      ? tempSales[`${item.id}_${m}`] 
                      : sales.find(s => s.itemId === item.id && s.month === m)?.quantitySold || 0;
                    
                    return (
                      <td key={m} className="px-4 py-4 text-center">
                        {isEditing ? (
                          <input 
                            type="number"
                            className="w-20 px-2 py-1 text-center border border-slate-200 rounded focus:ring-2 focus:ring-green-600/20"
                            value={String(val ?? '')}
                            onChange={e => {
                              setTempSales(prev => ({ ...prev, [`${item.id}_${m}`]: e.target.value }));
                            }}
                            min={0}
                            step={1}
                          />
                        ) : (
                          <span className="text-slate-600 font-medium">{val}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 text-right">
                    {editingItemId === item.id ? (
                      <button 
                        onClick={() => handleSave(item.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold shadow-sm"
                      >
                        Save
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleEdit(item)}
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <TrendingUp size={20} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesEntry;
