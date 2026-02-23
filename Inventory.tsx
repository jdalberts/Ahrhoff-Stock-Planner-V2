import React, { useState } from 'react';
import { InventoryLot, Item } from '../types';
import { LOT_STATUSES } from '../constants';
import { db } from '../db';
import { Search, Trash2, Calendar, Archive, Plus, X, AlertTriangle } from 'lucide-react';

interface Props {
  lots: InventoryLot[];
  items: Item[];
  onRefresh: () => void;
  initialItemId?: string;
}

const Inventory: React.FC<Props> = ({ lots, items, onRefresh, initialItemId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAdding, setIsAdding] = useState(!!initialItemId);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [newLot, setNewLot] = useState<Partial<InventoryLot>>({
    itemId: initialItemId || '',
    lotNumber: '',
    expiryDate: '',
    receivedDate: new Date().toISOString().split('T')[0],
    quantityReceived: 0,
    quantityRemaining: 0,
    status: 'available',
    notes: ''
  });
  const [showDuplicateWarning, setShowDuplicateWarning] = useState<InventoryLot | null>(null);

  const filteredLots = lots.filter(lot => {
    const item = items.find(i => i.id === lot.itemId);
    const matchesSearch = item?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lot.lotNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  });

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown Item';

  const resetForm = () => {
    setNewLot({
      itemId: '',
      lotNumber: '',
      expiryDate: '',
      receivedDate: new Date().toISOString().split('T')[0],
      quantityReceived: 0,
      quantityRemaining: 0,
      status: 'available',
      notes: ''
    });
    setValidationError(null);
  };

  // FIX (Issue 8): Proper validation with inline error messages instead of alert()
  const handlePreSave = () => {
    setValidationError(null);

    if (!newLot.itemId) {
      setValidationError('Please select a product.');
      return;
    }
    if (!newLot.lotNumber?.trim()) {
      setValidationError('Lot number is required.');
      return;
    }
    if (newLot.quantityRemaining === undefined || newLot.quantityRemaining < 0) {
      setValidationError('Quantity must be 0 or greater.');
      return;
    }

    const existing = lots.find(l => l.itemId === newLot.itemId && l.lotNumber === newLot.lotNumber);
    if (existing) {
      setShowDuplicateWarning(existing);
    } else {
      saveLot();
    }
  };

  const saveLot = async (existingId?: string) => {
    setIsSaving(true);
    try {
      const id = existingId || crypto.randomUUID();
      const lotToSave = {
        ...newLot,
        id,
      } as InventoryLot;

      await db.put('lots', lotToSave);
      setIsAdding(false);
      setShowDuplicateWarning(null);
      resetForm();
      onRefresh();
    } catch (err) {
      setValidationError('Failed to save lot. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLot = async (id: string) => {
    if (confirm('Are you sure you want to delete this lot record? This cannot be undone.')) {
      await db.delete('lots', id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Inventory Lots</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => { resetForm(); setIsAdding(true); }}
            className="flex items-center px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Add Lot
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search item or lot..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-green-600/20 w-full md:w-64"
            />
          </div>
          <select 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-slate-200 focus:outline-none bg-white font-medium text-slate-600"
          >
            <option value="all">All Statuses</option>
            {LOT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>

      {/* Lot Creation Form Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Record New Physical Lot</h3>
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* FIX: Inline validation error */}
              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                  {validationError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Definition *</label>
                  <select 
                    disabled={!!initialItemId}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-600/20"
                    value={newLot.itemId}
                    onChange={e => setNewLot({...newLot, itemId: e.target.value})}
                  >
                    <option value="">-- Select Product --</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Lot Number *</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                    placeholder="e.g. BAT-2024-X"
                    value={newLot.lotNumber}
                    onChange={e => setNewLot({...newLot, lotNumber: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Unique identifier for this batch.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expiry Date</label>
                  <input 
                    type="date"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl"
                    value={newLot.expiryDate || ''}
                    onChange={e => setNewLot({...newLot, expiryDate: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty if no expiry.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quantity Remaining *</label>
                  <input 
                    type="number"
                    min="0"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bold text-slate-800"
                    value={newLot.quantityRemaining}
                    onChange={e => setNewLot({...newLot, quantityRemaining: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Status</label>
                  <select 
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white"
                    value={newLot.status}
                    onChange={e => setNewLot({...newLot, status: e.target.value as InventoryLot['status']})}
                  >
                    {LOT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Internal Notes</label>
                <textarea 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl h-20"
                  placeholder="e.g. Received from primary supplier..."
                  value={newLot.notes}
                  onChange={e => setNewLot({...newLot, notes: e.target.value})}
                />
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-4">
              <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-6 py-2.5 text-slate-500 font-bold">Cancel</button>
              <button 
                onClick={handlePreSave} 
                disabled={isSaving}
                className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-600/20 hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Commit Lot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Alert Modal */}
      {showDuplicateWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-red-100 w-full max-w-md overflow-hidden p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Duplicate Lot Detected</h3>
            <p className="text-slate-500 mb-8">
              A lot with number <span className="font-mono font-bold text-slate-800">"{showDuplicateWarning.lotNumber}"</span> 
              already exists for this item. Do you want to update the existing record or change your lot number?
            </p>
            <div className="flex flex-col space-y-3">
              <button 
                onClick={() => saveLot(showDuplicateWarning.id)}
                disabled={isSaving}
                className="w-full py-3 bg-red-600 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Overwrite Existing Record'}
              </button>
              <button 
                onClick={() => setShowDuplicateWarning(null)}
                className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-xl"
              >
                Go Back and Change Number
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Lot Number</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Expiry</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-slate-500 text-sm uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLots.map(lot => {
                const isExpired = lot.expiryDate ? new Date(lot.expiryDate) < new Date() : false;
                return (
                  <tr key={lot.id} className={`hover:bg-slate-50/50 transition-colors ${isExpired || lot.status === 'expired' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 font-medium text-slate-800">{getItemName(lot.itemId)}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-sm">{lot.lotNumber}</td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center text-sm font-medium ${isExpired ? 'text-red-500' : 'text-slate-600'}`}>
                        <Calendar size={14} className="mr-1.5" />
                        {lot.expiryDate ? new Date(lot.expiryDate).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">{lot.quantityRemaining}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        lot.status === 'available' ? 'bg-green-100 text-green-700 border-green-200' : 
                        lot.status === 'expired' || isExpired ? 'bg-red-100 text-red-700 border-red-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {lot.status === 'available' && isExpired ? 'expired' : lot.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => deleteLot(lot.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredLots.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-slate-400 font-medium">
                    <Archive className="mx-auto mb-3 opacity-20" size={48} />
                    No inventory records matching your criteria.
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

export default Inventory;
