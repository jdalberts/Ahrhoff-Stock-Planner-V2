import React, { useState } from 'react';
import { Settings } from '../types';
import { FORECAST_METHODS, LOW_STOCK_RULES } from '../constants';
import { db } from '../db';
import { Save, Download, Upload, Sliders, Bell, Share2, Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  settings: Settings;
  onUpdate: (s: Settings) => void;
}

const SettingsPage: React.FC<Props> = ({ settings, onUpdate }) => {
  // FIX (Issue 6): Inline toast instead of browser alert()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (field: keyof Settings, value: any) => {
    onUpdate({ ...settings, [field]: value });
  };

  const updateWeight = (idx: number, val: number) => {
    const newWeights = [...settings.weights];
    newWeights[idx] = val;
    handleChange('weights', newWeights);
  };

  const exportBackup = async () => {
    try {
      const data = {
        items: await db.getAll('items'),
        lots: await db.getAll('lots'),
        sales: await db.getAll('sales'),
        settings: await db.getAll('settings'),
        stockCounts: await db.getAll('stockCounts'),
        alerts: await db.getAll('alerts'),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AgriStock_Backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url); // FIX: clean up object URL
      showToast('success', 'Backup exported successfully.');
    } catch (err) {
      showToast('error', 'Failed to export backup.');
      console.error(err);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('Are you sure? This will OVERWRITE existing data with the backup.')) {
          for (const key of ['items', 'lots', 'sales', 'settings', 'stockCounts', 'alerts']) {
            const list = data[key] || [];
            for (const item of list) {
              await db.put(key, item);
            }
          }
          showToast('success', 'Data restored. Reloading...');
          setTimeout(() => window.location.reload(), 1500);
        }
      } catch (err) {
        showToast('error', 'Invalid backup file. Please check the JSON format.');
        console.error(err);
      }
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">System Control</h2>
        <p className="text-slate-500">Global logic overrides and communication configuration.</p>
      </div>

      {/* FIX: Toast notification */}
      {toast && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center ${
          toast.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={18} className="mr-2" /> : <AlertTriangle size={18} className="mr-2" />}
          {toast.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logic Configuration */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 text-green-600 mb-2">
            <Sliders size={20} />
            <h3 className="text-xl font-bold text-slate-800">Supply Chain Logic</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Forecast Methodology</label>
              <select 
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 font-medium"
                value={settings.forecastMethod}
                onChange={e => handleChange('forecastMethod', e.target.value)}
              >
                {FORECAST_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>

            {settings.forecastMethod === 'weightedAverage' && (
              <div className="p-4 bg-slate-50 rounded-xl space-y-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <Info size={12} className="mr-1" />
                  Weights (Oldest to Newest)
                </p>
                <div className="grid grid-cols-6 gap-2">
                  {settings.weights.map((w, idx) => (
                    <div key={idx}>
                      <input 
                        type="number"
                        min="0"
                        className="w-full px-2 py-1 text-center border rounded-lg text-sm"
                        value={w}
                        onChange={e => updateWeight(idx, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">Total Influence: {settings.weights.reduce((a,b) => a+b, 0)}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Low Stock Rule</label>
              <select 
                className="w-full px-4 py-2 border rounded-xl bg-slate-50 font-medium"
                value={settings.lowStockRule}
                onChange={e => handleChange('lowStockRule', e.target.value)}
              >
                {LOW_STOCK_RULES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Safety Buffer (Days)</label>
                <input 
                  type="number"
                  min="0"
                  className="w-full px-4 py-2 border rounded-xl"
                  value={settings.safetyStockDays}
                  onChange={e => handleChange('safetyStockDays', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Review Frequency</label>
                <input 
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border rounded-xl"
                  value={settings.reviewPeriodDays}
                  onChange={e => handleChange('reviewPeriodDays', Number(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Configuration */}
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center space-x-2 text-red-600 mb-2">
            <Bell size={20} />
            <h3 className="text-xl font-bold text-slate-800">Alert Configuration</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Expiry Warning Threshold (Days)</label>
              <input 
                type="number"
                min="1"
                className="w-full px-4 py-2 border rounded-xl"
                value={settings.expiryWarningDays}
                onChange={e => handleChange('expiryWarningDays', Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Alert Cooldown (Hours)</label>
              <input 
                type="number"
                min="1"
                className="w-full px-4 py-2 border rounded-xl"
                value={settings.notificationCooldownHours}
                onChange={e => handleChange('notificationCooldownHours', Number(e.target.value))}
              />
              <p className="text-[10px] text-slate-400 mt-1">Prevents repeated alerts for the same item within this window.</p>
            </div>
            
            <div className="pt-4 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Distribution Mode</label>
              <select 
                className="w-full px-4 py-2 border rounded-xl bg-white font-medium"
                value={settings.whatsappMode}
                onChange={e => handleChange('whatsappMode', e.target.value)}
              >
                <option value="disabled">Disabled</option>
                <option value="clickToWhatsApp">Click to WhatsApp (Manual)</option>
                <option value="webhookAPI">Cloud Webhook (API)</option>
              </select>
            </div>

            {settings.whatsappMode === 'webhookAPI' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Webhook Endpoint URL</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm"
                    placeholder="https://your-api.com/notify"
                    value={settings.webhookUrl || ''}
                    onChange={e => handleChange('webhookUrl', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">API Key (Bearer)</label>
                  <input 
                    type="password" 
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg text-sm"
                    value={settings.webhookApiKey || ''}
                    onChange={e => handleChange('webhookApiKey', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center space-x-2">
          <Share2 className="text-blue-400" size={20} />
          <h3 className="text-xl font-bold">Data Interchange</h3>
        </div>
        <p className="text-slate-400 text-sm">AgriStock is locally persistent. Regularly export your database to prevent data loss in case of browser cache clearance.</p>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={exportBackup}
            className="flex items-center px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-colors"
          >
            <Download className="mr-2" size={20} />
            Snapshot Database
          </button>
          <label className="flex items-center px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
            <Upload className="mr-2" size={20} />
            Restore from JSON
            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
          </label>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
