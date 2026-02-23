import React, { useState } from 'react';
import { ItemPlanningView, Settings } from '../types';
import { ShoppingCart, MessageCircle, FileDown, Info } from 'lucide-react';

interface Props {
  planningViews: ItemPlanningView[];
  settings: Settings;
}

const OrderPlan: React.FC<Props> = ({ planningViews, settings }) => {
  const [showExplanation, setShowExplanation] = useState<string | null>(null);

  const orderItems = planningViews.filter(v => v.suggestedOrderQty > 0);

  const sendWhatsApp = (v: ItemPlanningView) => {
    const text = `LOW STOCK ALERT: ${v.item.name}
Stock: ${v.availableStock}
Days Cover: ${Math.round(v.daysCover)}
Suggested Order: ${v.suggestedOrderQty} units`;
    
    const url = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  /* FIX (Bug 3): CSV export now wraps values in quotes to handle commas in item names.
     Also cleans up the temporary DOM link element after download. */
  const exportCSV = () => {
    const headers = ['SKU', 'Item Name', 'Available Stock', 'Suggested Qty', 'Estimated Cost'];
    const rows = orderItems.map(v => [
      `"${v.item.skuCode}"`,
      `"${v.item.name}"`,
      v.availableStock,
      v.suggestedOrderQty,
      (v.suggestedOrderQty * v.item.costPerUnit).toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `OrderPlan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">
            Order Plan
            <span title="Freshness cap = dailyDemand × shelfLifeDays × 0.8. Caps suggested order so stock remains reasonably fresh." className="inline-flex items-center ml-2 text-slate-400">
              <Info size={16} />
            </span>
          </h2>
          <p className="text-slate-500">Automated reorder suggestions based on sales demand and lead times.</p>
        </div>
        {orderItems.length > 0 && (
          <button 
            onClick={exportCSV}
            className="flex items-center px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            <FileDown className="mr-2" size={20} />
            Export CSV
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Item</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Stock Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Forecasting</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm">Suggested Order</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orderItems.map(v => (
                <React.Fragment key={v.item.id}>
                  <tr className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{v.item.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{v.item.skuCode}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-700 font-bold">{v.availableStock} units</span>
                        <span className={`text-xs font-bold uppercase ${v.lowStockFlag ? 'text-red-500' : 'text-slate-400'}`}>
                          {v.daysCover === 999 ? 'No Demand' : `${Math.round(v.daysCover)} Days Cover`}
                        </span>
                      </div>
                    </td>
                    {/* FIX (Bug 1): Removed stray + characters and inline // comments that broke JSX */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-600">
                        <p>Avg Sales: {v.avgMonthlyDemand.toFixed(1)}/mo</p>
                        <p>Daily: {v.dailyDemand.toFixed(2)}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Current cover: {v.daysCover === 999 ? 'No Demand' : `${Math.round(v.daysCover)} days`}
                        </p>
                        <p className="text-xs text-slate-500">
                          If ordered: {v.projectedDaysCoverAfterOrder === 999 ? 'No Demand' : `${Math.round(v.projectedDaysCoverAfterOrder ?? 0)} days`}
                          <span 
                            title={`Projected cover = (availableStock + finalOrderQty) / dailyDemand · dailyDemand: ${v.dailyDemand.toFixed(2)}, shelfLifeDays: ${v.item.shelfLifeDays ?? 365}, maxFreshStock: ${Math.round(v.dailyDemand * (v.item.shelfLifeDays ?? 365) * 0.8)}, capQty: ${Math.round(v.freshnessCapQty ?? 0)}, finalOrderQty: ${v.suggestedOrderQty}`} 
                            className="inline-flex items-center text-slate-400 ml-2"
                          >
                            <Info size={12} />
                          </span>
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold text-lg border border-blue-100">
                          {v.suggestedOrderQty}
                        </div>
                        <button 
                          onClick={() => setShowExplanation(showExplanation === v.item.id ? null : v.item.id)}
                          className="ml-2 text-slate-300 hover:text-blue-500"
                        >
                          <Info size={18} />
                        </button>
                      </div>
                      {v.freshnessCapApplied && (
                        <div className="text-xs text-amber-600 mt-2" title="Freshness cap = dailyDemand × shelfLifeDays × 0.8; capQty = max(0, maxFreshStock - availableStock)">
                          ⚠️ Order reduced by freshness cap (max fresh stock based on shelf life: {v.item.shelfLifeDays ?? 365} days)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {settings.whatsappMode === 'clickToWhatsApp' && (
                          <button 
                            onClick={() => sendWhatsApp(v)}
                            className="p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                            title="Share via WhatsApp"
                          >
                            <MessageCircle size={20} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Logic Explanation Panel */}
                  {showExplanation === v.item.id && (
                    <tr className="bg-blue-50/30">
                      <td colSpan={5} className="px-8 py-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-slate-600 border-l-4 border-blue-400 pl-6">
                          <div>
                            <p className="font-bold text-blue-800 mb-2 uppercase tracking-wider text-xs">Reorder Math</p>
                            <ul className="space-y-1">
                              <li>Daily Demand: {v.dailyDemand.toFixed(2)}</li>
                              <li>Lead Time Days: {v.item.leadTimeDays || settings.defaultLeadTimeDays}</li>
                              <li>
                                Safety Stock Needed: {v.safetyStock.toFixed(0)}
                                <span title="Safety Stock = dailyDemand × safetyStockDays (from Settings)" className="inline-flex items-center text-slate-400 ml-2">
                                  <Info size={14} />
                                </span>
                              </li>
                              <li>
                                Projected Cover (if ordered): {v.projectedDaysCoverAfterOrder === 999 ? 'No Demand' : `${Math.round(v.projectedDaysCoverAfterOrder ?? 0)} days`}
                              </li>
                              <li className="font-bold border-t border-slate-200 mt-2 pt-1 text-slate-800">Reorder Point: {v.reorderPoint.toFixed(0)}</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold text-blue-800 mb-2 uppercase tracking-wider text-xs">Order Buffers</p>
                            <ul className="space-y-1">
                              <li>Review Period Coverage: {(v.dailyDemand * settings.reviewPeriodDays).toFixed(0)}</li>
                              <li>Available Stock: -{v.availableStock}</li>
                              <li className="font-bold border-t border-slate-200 mt-2 pt-1 text-slate-800">Raw Suggested: {Math.max(0, (v.reorderPoint + (v.dailyDemand * settings.reviewPeriodDays) - v.availableStock)).toFixed(0)}</li>
                            </ul>
                          </div>
                          <div>
                            <p className="font-bold text-blue-800 mb-2 uppercase tracking-wider text-xs">Constraints Applied</p>
                            <ul className="space-y-1">
                              <li>MOQ: {v.item.moq}</li>
                              <li>Pack Size: {v.item.packSize}</li>
                              <li>Shelf Life: {v.item.shelfLifeDays ?? 365} days</li>
                              {v.freshnessCapApplied && (
                                <li className="text-amber-600">Freshness Cap Applied: limited to {Math.round(v.freshnessCapQty ?? 0)} units</li>
                              )}
                              <li className="font-bold border-t border-slate-200 mt-2 pt-1 text-blue-600">Final Order: {v.suggestedOrderQty}</li>
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {orderItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium">
                    <ShoppingCart className="mx-auto mb-3 opacity-20" size={48} />
                    All stock levels currently sufficient.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderPlan;
