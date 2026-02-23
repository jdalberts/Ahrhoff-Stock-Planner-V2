
import { Item, InventoryLot, SalesHistory, Settings, ItemPlanningView, InventoryAlert } from './types';

/**
 * Logic for calculating inventory requirements.
 * COMMENT: Updated to handle weighted forecasting and configurable low-stock rules.
 */
export function calculateItemPlanning(
  item: Item,
  lots: InventoryLot[],
  sales: SalesHistory[],
  settings: Settings,
  currentDate: Date = new Date()
): ItemPlanningView {
  
  // 1) Filter Lots
  const activeLots = lots.filter(l => l.itemId === item.id && l.status === 'available');
  const nonExpiredLots = activeLots.filter(l => l.expiryDate ? new Date(l.expiryDate) > currentDate : true);
  const expiringSoonLots = activeLots.filter(l => {
    if (!l.expiryDate) return false;
    const expDate = new Date(l.expiryDate);
    const diff = (expDate.getTime() - currentDate.getTime()) / (1000 * 3600 * 24);
    return diff <= settings.expiryWarningDays && diff > 0;
  });

  // 2) Available Stock
  const availableStock = nonExpiredLots.reduce((sum, lot) => sum + lot.quantityRemaining, 0);

  // 3) Demand Forecasting
  // COMMENT: Added weighted average calculation. 
  // Formula: Sum(Val_i * Weight_i) / Sum(Weights)
  const itemSales = sales.filter(s => s.itemId === item.id);
  // Prepare a map of YYYY-MM for the last 6 months
  const last6Months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    last6Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  last6Months.reverse();

  let avgMonthlyDemand = 0;
  if (settings.forecastMethod === 'simpleAverage6Months') {
    const totalSold = itemSales.reduce((sum, s) => sum + s.quantitySold, 0);
    avgMonthlyDemand = itemSales.length > 0 ? totalSold / Math.max(itemSales.length, 1) : 0;
  } else if (settings.forecastMethod === 'weightedAverage') {
    let weightedSum = 0;
    let weightSum = 0;
    last6Months.forEach((month, idx) => {
      const monthSale = itemSales.find(s => s.month === month)?.quantitySold || 0;
      const weight = settings.weights[idx] || 0;
      weightedSum += monthSale * weight;
      weightSum += weight;
    });
    avgMonthlyDemand = weightSum > 0 ? weightedSum / weightSum : 0;
  }
  
  const dailyDemand = avgMonthlyDemand / 30.4;

  // 4) Planning Parameters
  const safetyStock = dailyDemand * settings.safetyStockDays;
  const leadTime = item.leadTimeDays || settings.defaultLeadTimeDays;
  const reorderPoint = (dailyDemand * leadTime) + safetyStock;

  // 5) Suggested Order Qty
  let suggested = reorderPoint + (dailyDemand * settings.reviewPeriodDays) - availableStock;
  suggested = Math.max(0, suggested);

  // ADDED: Freshness cap calculation - do not exceed maximum fresh stock
  const shelfLifeDays = item.shelfLifeDays ?? 365; // default 1 year if not set
  const maxFreshStock = dailyDemand * shelfLifeDays * 0.8; // 80% of shelf life coverage
  const capQty = Math.max(0, maxFreshStock - availableStock);
  const preCapSuggested = suggested;
  suggested = Math.min(suggested, capQty);
  const freshnessCapApplied = suggested < preCapSuggested;

  // Apply existing MOQ and pack rounding AFTER freshness cap (per requirement)
  if (suggested > 0 && suggested < item.moq) {
    suggested = item.moq;
  }
  if (suggested > 0 && item.packSize > 0) {
    suggested = Math.ceil(suggested / item.packSize) * item.packSize;
  }

  // 6) Cover Indicators
  const daysCover = dailyDemand > 0 ? availableStock / dailyDemand : 999;
  // ADDED: projected cover after ordering suggested quantity
  const projectedDaysCoverAfterOrder = dailyDemand > 0 ? (availableStock + suggested) / dailyDemand : 999;
  
  // Low Stock Detection Rule Selection (Upgrade 2)
  let lowStockFlag = false;
  if (settings.lowStockRule === 'belowDaysCover') {
    lowStockFlag = daysCover < settings.lowStockDaysCoverThreshold;
  } else {
    lowStockFlag = availableStock < reorderPoint;
  }

  return {
    item,
    lots: activeLots,
    sales: itemSales,
    availableStock,
    avgMonthlyDemand,
    dailyDemand,
    safetyStock,
    reorderPoint,
    suggestedOrderQty: suggested,
    // ADDED: freshness cap info to communicate to UI
    freshnessCapApplied: freshnessCapApplied,
    freshnessCapQty: capQty,
    // ADDED: projected days cover after ordering suggested qty
    projectedDaysCoverAfterOrder: projectedDaysCoverAfterOrder,
    daysCover,
    lowStockFlag,
    expiringSoonLots
  };
}

/**
 * Alert Detection Logic (Upgrade 3)
 * COMMENT: Scans items for low stock and expiring lots, respects cooldown.
 */
export function detectAlerts(
  planningViews: ItemPlanningView[],
  existingAlerts: InventoryAlert[],
  settings: Settings
): InventoryAlert[] {
  const newAlerts: InventoryAlert[] = [];
  const now = new Date();

  planningViews.forEach(view => {
    // 1) Low Stock Check
    if (view.lowStockFlag) {
      const recentAlert = existingAlerts.find(a => 
        a.itemId === view.item.id && 
        a.type === 'lowStock' && 
        (a.status === 'pending' || 
          (a.lastSentAt && (now.getTime() - new Date(a.lastSentAt).getTime()) / (1000 * 3600) < settings.notificationCooldownHours))
      );

      if (!recentAlert) {
        newAlerts.push({
          id: `lowStock_${view.item.id}_${now.getTime()}`,
          createdAt: now.toISOString(),
          itemId: view.item.id,
          type: 'lowStock',
          message: `Low Stock: ${view.item.name} | Current: ${view.availableStock} | Days Cover: ${Math.round(view.daysCover)}`,
          status: 'pending'
        });
      }
    }

    // 2) Expiry Check
    if (view.expiringSoonLots.length > 0) {
      // Create alert if no pending or cooling-down alert exists for this item
      const recentExpiryAlert = existingAlerts.find(a => 
        a.itemId === view.item.id && 
        a.type === 'expiry' && 
        (a.status === 'pending' || 
          (a.lastSentAt && (now.getTime() - new Date(a.lastSentAt).getTime()) / (1000 * 3600) < settings.notificationCooldownHours))
      );

      if (!recentExpiryAlert) {
        const lotSummaries = view.expiringSoonLots.map(l => `${l.lotNumber} (exp. ${l.expiryDate})`).join(', ');
        newAlerts.push({
          id: `expiry_${view.item.id}_${now.getTime()}`,
          createdAt: now.toISOString(),
          itemId: view.item.id,
          type: 'expiry',
          message: `Expiry Warning: ${view.item.name} | Lots: ${lotSummaries}`,
          status: 'pending'
        });
      }
    }
  });

  return newAlerts;
}
