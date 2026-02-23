import React, { useState } from 'react';
import { InventoryAlert, Item, Settings, ItemPlanningView } from '../types';
import { db } from '../db';
import { Bell, MessageCircle, Check, X, Send, CheckCircle, AlertTriangle } from 'lucide-react';

interface Props {
  alerts: InventoryAlert[];
  items: Item[];
  settings: Settings;
  onRefresh: () => void;
  planningViews: ItemPlanningView[];
}

const AlertsPage: React.FC<Props> = ({ alerts, items, settings, onRefresh, planningViews }) => {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  // FIX (Issue 6): Inline toast message instead of browser alert()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const getItemName = (id: string) => items.find(i => i.id === id)?.name || 'Unknown Item';

  const filteredAlerts = alerts
    .filter(a => filter === 'all' || a.status === 'pending')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleAction = async (alertObj: InventoryAlert, status: 'sent' | 'dismissed') => {
    const updatedAlert: InventoryAlert = {
      ...alertObj,
      status,
      lastSentAt: status === 'sent' ? new Date().toISOString() : alertObj.lastSentAt,
      recipientsSnapshot: status === 'sent' ? [settings.whatsappNumber, ...settings.whatsappRecipients] : alertObj.recipientsSnapshot
    };
    await db.put('alerts', updatedAlert);
    onRefresh();
  };

  const sendWhatsApp = (alertObj: InventoryAlert) => {
    const view = planningViews.find(v => v.item.id === alertObj.itemId);
    if (!view) return;

    const text = `⚠️ AGRI-INVENTORY ALERT
Item: ${view.item.name}
Alert: ${alertObj.type === 'lowStock' ? 'Low Stock' : 'Expiry Warning'}
Stock Level: ${view.availableStock}
Days Cover: ${Math.round(view.daysCover)}
Suggested Order: ${view.suggestedOrderQty} units
${view.expiringSoonLots.length > 0 ? `Lots expiring soon: ${view.expiringSoonLots.map(l => l.lotNumber).join(', ')}` : ''}`;

    const url = `https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
    handleAction(alertObj, 'sent');
  };

  const triggerWebhook = async (alertObj: InventoryAlert) => {
    if (!settings.webhookUrl) return;
    try {
      const response = await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': settings.webhookApiKey ? `Bearer ${settings.webhookApiKey}` : ''
        },
        body: JSON.stringify({
          alertId: alertObj.id,
          type: alertObj.type,
          message: alertObj.message,
          timestamp: new Date().toISOString()
        })
      });
      if (response.ok) {
        handleAction(alertObj, 'sent');
        showToast('success', 'Webhook sent successfully.');
      } else {
        throw new Error('Server responded with error');
      }
    } catch (err) {
      showToast('error', 'Webhook failed: ' + (err as Error).message);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">Alerts Center</h2>
          <p className="text-slate-500">Automated detection of inventory risks and expiry events.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === 'pending' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${filter === 'all' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            History
          </button>
        </div>
      </div>

      {/* FIX: Toast notification instead of browser alert() */}
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

      <div className="grid grid-cols-1 gap-4">
        {filteredAlerts.map(alertItem => (
          <div key={alertItem.id} className={`bg-white p-6 rounded-2xl border-2 transition-all shadow-sm ${alertItem.status === 'pending' ? 'border-red-100' : 'border-slate-50 opacity-75'}`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl flex-shrink-0 ${alertItem.type === 'lowStock' ? 'bg-orange-100 text-orange-600' : 'bg-red-100 text-red-600'}`}>
                  <Bell size={24} />
                </div>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold uppercase tracking-wider">{alertItem.type}</span>
                    <span className="text-xs text-slate-400 font-medium">{new Date(alertItem.createdAt).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{getItemName(alertItem.itemId)}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{alertItem.message}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:ml-auto">
                {alertItem.status === 'pending' && (
                  <>
                    {settings.whatsappMode === 'clickToWhatsApp' && (
                      <button 
                        onClick={() => sendWhatsApp(alertItem)}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        <MessageCircle size={16} className="mr-2" />
                        WhatsApp
                      </button>
                    )}
                    {settings.whatsappMode === 'webhookAPI' && (
                      <button 
                        onClick={() => triggerWebhook(alertItem)}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                      >
                        <Send size={16} className="mr-2" />
                        Webhook
                      </button>
                    )}
                    <button 
                      onClick={() => handleAction(alertItem, 'sent')}
                      className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200"
                      title="Mark as Processed"
                    >
                      <Check size={18} />
                    </button>
                    <button 
                      onClick={() => handleAction(alertItem, 'dismissed')}
                      className="p-2.5 bg-slate-100 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-600"
                      title="Dismiss"
                    >
                      <X size={18} />
                    </button>
                  </>
                )}
                {alertItem.status === 'sent' && (
                  <div className="flex items-center text-green-600 text-sm font-bold bg-green-50 px-4 py-2 rounded-xl">
                    <Check size={16} className="mr-2" />
                    Alert Sent
                  </div>
                )}
                {alertItem.status === 'dismissed' && (
                  <div className="flex items-center text-slate-400 text-sm font-medium bg-slate-50 px-4 py-2 rounded-xl">
                    Dismissed
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
            <Bell className="mx-auto mb-4 text-slate-200" size={48} />
            <h3 className="text-xl font-bold text-slate-300">No {filter} alerts</h3>
            <p className="text-slate-400">Your inventory is currently within safe parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
