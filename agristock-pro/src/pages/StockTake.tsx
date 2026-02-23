import React, { useState } from 'react';
import { InventoryLot, Item, StockCountEntry } from '../types';
import { COUNT_REASONS } from '../constants';
import { db } from '../db';
import { ClipboardCheck, Save, Search, CheckCircle } from 'lucide-react';

interface Props {
  lots: InventoryLot[];
  items: Item[];
  onRefresh: () => void;
}

const StockTake: React.FC<Props> = ({ lots, items, onRefresh }) => {
  const [selectedLotId, setSelectedLotId] = useState('');
  const [countedQty, setCountedQty] = useState('');
  const [reason, setReason] = useState<'adjustment' | 'damage' | 'correction' | 'routine'>('routine');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // FIX (Issue 6): Inline status messages instead of alert()
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown';

  const availableLots = lots
    .filter(l => l.status === 'available')
    .filter(l => {
      const name = getItemName(l.itemId).toLowerCase();
      const num = l.lotNumber.toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || num.includes(searchTerm.toLowerCase());
    })
    .slice(0, 10);

  const handleSave = async () => {
    setStatusMessage(null);

    // FIX (Issue 8): Proper validation
    if (!selectedLotId) {
      setStatusMessage({ type: 'error', text: 'Please select a lot to count.' });
      return;
    }
    if (countedQty === '' || Number(countedQty) < 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid counted quantity (0 or greater).' });
      return;
    }

    setIsSubmitting(true);
    try {
      const lot = lots.find(l => l.id === selectedLotId);
      if (!lot) throw new Error("Lot not found");

      // 1) Record Audit Entry
      const entry: StockCountEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        lotId: selectedLotId,
        countedQty: Number(countedQty),
        reason,
        notes
      };
      await db.put('stockCounts', entry);

      // 2) Update Lot Qty
      const updatedLot: InventoryLot = {
        ...lot,
        quantityRemaining: Number(countedQty)
      };
      await db.put('lots', updatedLot);

      // Reset
      setSelectedLotId('');
      setCountedQty('');
      setNotes('');
      setReason('routine');
      onRefresh();
      setStatusMessage({ type: 'success', text: 'Stock count updated successfully!' });
      
      // Clear success message after 4 seconds
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error updating stock count. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2 flex items-center">
          <ClipboardCheck className="text-green-600 mr-3" size={32} />
          Fast Stock Take
        </h2>
        <p className="text-slate-500">Update warehouse quantities quickly. Every entry is logged for audit history.</p>
      </div>

      {/* FIX: Inline status messages instead of browser alert() */}
      {statusMessage && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center ${
          statusMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {statusMessage.type === 'success' && <CheckCircle size={18} className="mr-2 flex-shrink-0" />}
          {statusMessage.text}
        </div>
      )}

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Lot Selection with search */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Select Lot to Count</label>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter lots by item name or lot #..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-600/20"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2">
            {availableLots.map(l => (
              <button
                key={l.id}
                onClick={() => { setSelectedLotId(l.id); setStatusMessage(null); }}
                className={`flex items-center justify-between p-4 rounded-xl border text-left transition-all ${
                  selectedLotId === l.id 
                    ? 'border-green-600 bg-green-50 ring-2 ring-green-600/10' 
                    : 'border-slate-100 hover:border-slate-300 bg-slate-50'
                }`}
              >
                <div>
                  <p className="font-bold text-slate-800">{getItemName(l.itemId)}</p>
                  <p className="text-xs text-slate-500">Lot: {l.lotNumber} | Current: {l.quantityRemaining}</p>
                </div>
                {selectedLotId === l.id && <div className="w-5 h-5 bg-green-600 rounded-full flex items-center justify-center text-white"><Save size={12}/></div>}
              </button>
            ))}
            {availableLots.length === 0 && <p className="text-center py-4 text-slate-400">No matching lots found.</p>}
          </div>
        </div>

        {selectedLotId && (
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Counted Quantity *</label>
                <input 
                  type="number"
                  min="0"
                  placeholder="Enter exact count..."
                  className="w-full px-4 py-3 text-lg font-bold border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/20"
                  value={countedQty}
                  onChange={e => setCountedQty(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Reason</label>
                <select
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/20 bg-white"
                  value={reason}
                  onChange={e => setReason(e.target.value as typeof reason)}
                >
                  {COUNT_REASONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Notes (Optional)</label>
              <textarea 
                placeholder="e.g. Minor bag damage, standard check..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/20 h-24"
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-50"
            >
              <Save size={20} className="mr-2" />
              {isSubmitting ? 'Updating DB...' : 'Save Stock Count'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockTake;
