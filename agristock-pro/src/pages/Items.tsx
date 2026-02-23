import React, { useState } from 'react';
import { Item } from '../types';
import { CATEGORIES } from '../constants';
import { db } from '../db';
import { Plus, Trash2, Edit2, Search, Info } from 'lucide-react';

interface Props {
  items: Item[];
  onRefresh: () => void;
  // FIX (Improvement 8): Removed unused `lots` prop
}

const Items: React.FC<Props> = ({ items, onRefresh }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newItem, setNewItem] = useState<Partial<Item>>({
    id: '',
    skuCode: '',
    name: '',
    category: 'Other',
    packSize: 25,
    leadTimeDays: 14,
    moq: 0,
    costPerUnit: 0,
    shelfLifeDays: 365
  });

  const resetForm = () => {
    setNewItem({ id: '', skuCode: '', name: '', category: 'Other', packSize: 25, leadTimeDays: 14, moq: 0, costPerUnit: 0, shelfLifeDays: 365 });
    setValidationError(null);
  };

  // FIX (Issue 8): Proper input validation before saving
  const handleSave = async () => {
    setValidationError(null);

    if (!newItem.name?.trim()) { setValidationError('Product name is required.'); return; }
    if (!newItem.skuCode?.trim()) { setValidationError('SKU code is required.'); return; }
    if ((newItem.packSize ?? 0) <= 0) { setValidationError('Pack size must be greater than 0.'); return; }
    if ((newItem.leadTimeDays ?? 0) < 0) { setValidationError('Lead time cannot be negative.'); return; }
    if ((newItem.moq ?? 0) < 0) { setValidationError('MOQ cannot be negative.'); return; }
    if ((newItem.costPerUnit ?? 0) < 0) { setValidationError('Cost per unit cannot be negative.'); return; }
    if ((newItem.shelfLifeDays ?? 0) <= 0) { setValidationError('Shelf life must be greater than 0.'); return; }

    setIsSaving(true);
    try {
      const itemToSave = {
        ...newItem,
        id: newItem.id || crypto.randomUUID(),
        shelfLifeDays: newItem.shelfLifeDays ?? 365,
      } as Item;
      
      await db.put('items', itemToSave);
      setIsAdding(false);
      resetForm();
      onRefresh();
    } catch (err) {
      setValidationError('Failed to save. Please try again.');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (confirm('Delete this item? Warning: Lots and sales associated may become orphans.')) {
      await db.delete('items', id);
      onRefresh();
    }
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.skuCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Product Master</h2>
          <p className="text-slate-500">Define your catalog items and their supply chain parameters.</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsAdding(true); }}
          className="flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 active:scale-95 transition-all"
        >
          <Plus size={20} className="mr-2" />
          Add New Product
        </button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by name or SKU..."
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-green-600/20"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {isAdding && (
        <div className="bg-white p-8 rounded-2xl border-2 border-green-600 shadow-xl space-y-6">
          <h3 className="text-xl font-bold text-slate-800">
            {newItem.id ? 'Edit Product' : 'Add Item Definition'}
          </h3>

          {/* FIX (Issue 8): Show validation errors inline */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {validationError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">SKU Code *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.skuCode}
                onChange={e => setNewItem({...newItem, skuCode: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Name *</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.name}
                onChange={e => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Category</label>
              <select 
                className="w-full px-4 py-2 border rounded-lg"
                value={newItem.category}
                onChange={e => setNewItem({...newItem, category: e.target.value as Item['category']})}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Pack Size (kg) *</label>
              <input 
                type="number" 
                min="1"
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.packSize}
                onChange={e => setNewItem({...newItem, packSize: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Lead Time (Days)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.leadTimeDays}
                onChange={e => setNewItem({...newItem, leadTimeDays: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">MOQ</label>
              <input 
                type="number"
                min="0"
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.moq}
                onChange={e => setNewItem({...newItem, moq: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Cost Per Unit</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.costPerUnit}
                onChange={e => setNewItem({...newItem, costPerUnit: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Shelf Life (Days) *</span>
                <span className="text-xs text-slate-400 flex items-center" title="Used to cap fresh stock: maxFreshStock = dailyDemand × shelfLifeDays × 0.8">
                  <Info size={14} className="mr-1" />
                  <span>Used for freshness cap</span>
                </span>
              </label>
              <input 
                type="number"
                min="1"
                className="w-full px-4 py-2 border rounded-lg" 
                value={newItem.shelfLifeDays}
                onChange={e => setNewItem({...newItem, shelfLifeDays: Number(e.target.value)})}
              />
              <p className="text-xs text-slate-400 mt-1">Max fresh stock = dailyDemand × shelf life × 0.8</p>
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button onClick={() => { setIsAdding(false); resetForm(); }} className="px-6 py-2 text-slate-500 font-bold">Cancel</button>
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              className="px-8 py-2 bg-green-600 text-white rounded-lg font-bold disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-widest">{item.category}</span>
              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => {setNewItem(item); setIsAdding(true);}} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                <button onClick={() => deleteItem(item.id)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-1">{item.name}</h3>
            <p className="text-sm font-mono text-slate-400 mb-4">{item.skuCode}</p>
            <div className="grid grid-cols-3 gap-4 text-sm border-t border-slate-50 pt-4">
              <div>
                <p className="text-slate-400">Pack Size</p>
                <p className="font-bold text-slate-700">{item.packSize}kg</p>
              </div>
              <div>
                <p className="text-slate-400">Lead Time</p>
                <p className="font-bold text-slate-700">{item.leadTimeDays} days</p>
              </div>
              <div>
                <p className="text-slate-400">Shelf Life</p>
                <p className="font-bold text-slate-700">{item.shelfLifeDays ?? 365} days</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Items;
