import React, { useState, useRef } from 'react';
import { Item, InventoryLot, SalesHistory } from '../types';
import { db } from '../db';
import {
  findProductTemplate,
  normalizeName,
  detectCategory,
  parsePackSize,
  isSalesSkipRow,
} from '../productCatalog';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Package,
  TrendingUp,
  Info,
  ArrowRight,
  X,
  RotateCcw,
} from 'lucide-react';

// SheetJS loaded via CDN in index.html
declare const XLSX: any;

// ── Helpers ──────────────────────────────────────────────────
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function generateSKU(name: string, category: string): string {
  const prefix = category.slice(0, 3).toUpperCase();
  const words = name.split(/\s+/).filter(w => w.length > 1);
  const suffix = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
  const num = String(Math.floor(Math.random() * 900) + 100);
  return `${prefix}-${suffix}-${num}`;
}

// ── Parsed row types ─────────────────────────────────────────
interface ParsedStockItem {
  name: string;
  matched: boolean;
  category: string;
  packSize: number;
  supplier: string;
  description: string;
  quantityOnHand: number;
  skip: boolean;
}

interface ParsedSalesRow {
  name: string;
  matched: boolean;
  quantity: number;
  amount: number;
  avgPrice: number;
  grossMarginPct: number;
  skip: boolean;
  isServiceRow: boolean;
}

interface ImportResult {
  type: 'stock' | 'sales';
  itemsCreated: number;
  lotsCreated: number;
  salesCreated: number;
  skippedRows: number;
  existingItems: number;
}

// ── Props ────────────────────────────────────────────────────
interface ExcelImportProps {
  items: Item[];
  lots: InventoryLot[];
  sales: SalesHistory[];
  onRefresh: () => Promise<void>;
}

// ══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ══════════════════════════════════════════════════════════════
const ExcelImport: React.FC<ExcelImportProps> = ({ items, lots, sales, onRefresh }) => {
  const [mode, setMode] = useState<'choose' | 'stock' | 'sales'>('choose');
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

  // Stock state
  const [stockRows, setStockRows] = useState<ParsedStockItem[]>([]);
  const [stockFileName, setStockFileName] = useState('');

  // Sales state
  const [salesRows, setSalesRows] = useState<ParsedSalesRow[]>([]);
  const [salesFileName, setSalesFileName] = useState('');
  const [salesDateRange, setSalesDateRange] = useState('');

  // Shared
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'success' | 'error' | 'warning', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const resetAll = () => {
    setMode('choose');
    setStep('upload');
    setStockRows([]);
    setSalesRows([]);
    setStockFileName('');
    setSalesFileName('');
    setSalesDateRange('');
    setResult(null);
    setParseError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  // ════════════════════════════════════════════════════════════
  //  STEP 1A: Parse Stocktake Excel
  // ════════════════════════════════════════════════════════════
  const handleStockFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setStockFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Find "Product/Service" header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        const cell = String(raw[i]?.[0] || '').toLowerCase();
        if (cell.includes('product') && cell.includes('service')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        setParseError('Could not find "Product/Service" header. Make sure this is a Xero Stocktake Worksheet.');
        return;
      }

      const parsed: ParsedStockItem[] = [];
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        const name = String(row[0] || '').trim();
        if (!name) continue;

        const description = String(row[1] || '').trim();
        const supplier = String(row[3] || '').trim();
        const qtyRaw = String(row[4] || '0').replace(/,/g, '');
        const qtyOnHand = parseFloat(qtyRaw) || 0;

        const template = findProductTemplate(name);
        const packFromDesc = parsePackSize(description);

        parsed.push({
          name: normalizeName(name),
          matched: !!template,
          category: template?.category || detectCategory(name),
          packSize: template?.packSize || packFromDesc || 25,
          supplier: supplier || template?.preferredSupplier || '',
          description,
          quantityOnHand: qtyOnHand,
          skip: false,
        });
      }

      if (parsed.length === 0) {
        setParseError('No product rows found below the header. Check your file has data.');
        return;
      }

      setStockRows(parsed);
      setStep('preview');
    } catch (err: any) {
      setParseError(`Error reading file: ${err.message || 'Unknown error'}`);
    }
  };

  // ════════════════════════════════════════════════════════════
  //  STEP 1B: Parse Sales Excel
  // ════════════════════════════════════════════════════════════
  const handleSalesFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError('');
    setSalesFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      // Try to find date range from header area (row 2 usually)
      for (let i = 0; i < Math.min(raw.length, 5); i++) {
        const cell = String(raw[i]?.[0] || '');
        if (cell.match(/\d{1,2}\s+\w+,?\s+\d{4}\s*-/)) {
          setSalesDateRange(cell.trim());
          break;
        }
      }

      // Find data header row (contains "Quantity" and "Amount")
      let headerIdx = -1;
      for (let i = 0; i < Math.min(raw.length, 10); i++) {
        const cells = (raw[i] || []).map((c: any) => String(c).toLowerCase());
        if (cells.includes('quantity') && cells.includes('amount')) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        setParseError('Could not find the header row with "Quantity" and "Amount". Make sure this is a Xero Sales by Product/Service report.');
        return;
      }

      const parsed: ParsedSalesRow[] = [];
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const row = raw[i];
        const name = String(row[0] || '').trim();
        if (!name) continue;
        // Stop at TOTAL row
        if (name.toUpperCase() === 'TOTAL') break;

        const isService = isSalesSkipRow(name);
        const template = findProductTemplate(name);

        const parseNum = (v: any) => {
          const s = String(v || '0').replace(/[R,\s%]/g, '');
          return parseFloat(s) || 0;
        };

        parsed.push({
          name: normalizeName(name),
          matched: !!template,
          quantity: parseNum(row[1]),
          amount: parseNum(row[2]),
          avgPrice: parseNum(row[4]),
          grossMarginPct: parseNum(row[7]),
          skip: isService,
          isServiceRow: isService,
        });
      }

      if (parsed.length === 0) {
        setParseError('No product rows found. Check the file has data below the header.');
        return;
      }

      setSalesRows(parsed);
      setStep('preview');
    } catch (err: any) {
      setParseError(`Error reading file: ${err.message || 'Unknown error'}`);
    }
  };

  // ════════════════════════════════════════════════════════════
  //  STEP 2A: Save Stock to Database
  // ════════════════════════════════════════════════════════════
  const saveStockImport = async () => {
    setSaving(true);
    let itemsCreated = 0;
    let lotsCreated = 0;
    let skippedRows = 0;
    let existingItems = 0;

    try {
      const activeRows = stockRows.filter(r => !r.skip);

      for (const row of activeRows) {
        // Check if item already exists by name
        const existing = items.find(
          i => normalizeName(i.name).toLowerCase() === row.name.toLowerCase()
        );

        let itemId: string;

        if (existing) {
          itemId = existing.id;
          existingItems++;
        } else {
          // Create new item
          const template = findProductTemplate(row.name);
          const newItem: Item = {
            id: uid(),
            skuCode: generateSKU(row.name, row.category),
            name: row.name,
            category: row.category as Item['category'],
            packSize: row.packSize,
            leadTimeDays: template?.defaultLeadTimeDays || 14,
            moq: template?.defaultMOQ || 25,
            costPerUnit: template?.defaultCostPerUnit || 0,
            shelfLifeDays: template?.defaultShelfLifeDays || 365,
            notes: row.supplier ? `Supplier: ${row.supplier}` : undefined,
          };
          await db.put('items', newItem);
          itemsCreated++;
          itemId = newItem.id;
        }

        // Create lot for stock on hand (if positive)
        if (row.quantityOnHand > 0) {
          const today = new Date().toISOString().split('T')[0];
          const newLot: InventoryLot = {
            id: uid(),
            itemId,
            lotNumber: `IMPORT-${today}-${uid().slice(-4).toUpperCase()}`,
            expiryDate: null,
            quantityRemaining: row.quantityOnHand,
            receivedDate: today,
            quantityReceived: row.quantityOnHand,
            status: 'available',
            notes: `Imported from stocktake: ${stockFileName}`,
          };
          await db.put('lots', newLot);
          lotsCreated++;
        } else {
          skippedRows++;
        }
      }

      skippedRows += stockRows.filter(r => r.skip).length;
      await onRefresh();
      setResult({ type: 'stock', itemsCreated, lotsCreated, salesCreated: 0, skippedRows, existingItems });
      setStep('done');
      showToast('success', `Stock import complete! ${itemsCreated} products created, ${lotsCreated} lots added.`);
    } catch (err: any) {
      showToast('error', `Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  //  STEP 2B: Save Sales to Database
  // ════════════════════════════════════════════════════════════
  const saveSalesImport = async () => {
    setSaving(true);
    let itemsCreated = 0;
    let salesCreated = 0;
    let skippedRows = 0;
    let existingItems = 0;

    try {
      // Parse month from the date range string
      // Example: "1 September, 2025 - 23 February, 2026"
      // We'll create one total sales record — user can break down monthly later
      // For now, detect how many months the range covers and compute monthly avg
      let months = 6; // default assumption
      let monthKey = ''; // e.g. "2025-09" to "2026-02"

      if (salesDateRange) {
        const dateMatch = salesDateRange.match(/(\d{1,2})\s+(\w+),?\s+(\d{4})\s*-\s*(\d{1,2})\s+(\w+),?\s+(\d{4})/);
        if (dateMatch) {
          const monthNames: Record<string, number> = {
            january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
            july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
          };
          const startMonth = monthNames[dateMatch[2].toLowerCase()] || 1;
          const startYear = parseInt(dateMatch[3]);
          const endMonth = monthNames[dateMatch[5].toLowerCase()] || 12;
          const endYear = parseInt(dateMatch[6]);
          months = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
          if (months < 1) months = 1;
          if (months > 24) months = 24; // sanity cap
        }
      }

      const activeRows = salesRows.filter(r => !r.skip);

      for (const row of activeRows) {
        // Find or create the item
        let existing = items.find(
          i => normalizeName(i.name).toLowerCase() === row.name.toLowerCase()
        );

        let itemId: string;

        if (existing) {
          itemId = existing.id;
          existingItems++;
        } else {
          const template = findProductTemplate(row.name);
          const cat = template?.category || detectCategory(row.name);
          const newItem: Item = {
            id: uid(),
            skuCode: generateSKU(row.name, cat),
            name: row.name,
            category: cat,
            packSize: template?.packSize || 25,
            leadTimeDays: template?.defaultLeadTimeDays || 14,
            moq: template?.defaultMOQ || 25,
            costPerUnit: row.avgPrice > 0 ? Math.round(row.avgPrice * 0.65) : (template?.defaultCostPerUnit || 0),
            shelfLifeDays: template?.defaultShelfLifeDays || 365,
          };
          await db.put('items', newItem);
          itemsCreated++;
          itemId = newItem.id;
          // Re-fetch so subsequent lookups work
          items = [...items, newItem];
        }

        // Create monthly sales records
        // Distribute total quantity evenly across the months in range
        const monthlyQty = Math.round(row.quantity / months);
        if (monthlyQty <= 0) { skippedRows++; continue; }

        const today = new Date();
        for (let m = 0; m < months; m++) {
          const d = new Date(today.getFullYear(), today.getMonth() - (months - 1 - m), 1);
          const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

          // Check if sales record already exists for this item + month
          const existingSale = sales.find(s => s.itemId === itemId && s.month === mk);
          if (existingSale) continue;

          const newSale: SalesHistory = {
            id: uid(),
            itemId,
            month: mk,
            quantitySold: monthlyQty,
          };
          await db.put('sales', newSale);
          salesCreated++;
        }
      }

      skippedRows += salesRows.filter(r => r.skip).length;
      await onRefresh();
      setResult({ type: 'sales', itemsCreated, lotsCreated: 0, salesCreated, skippedRows, existingItems });
      setStep('done');
      showToast('success', `Sales import complete! ${salesCreated} monthly records created across ${months} months.`);
    } catch (err: any) {
      showToast('error', `Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════
  //  RENDER
  // ════════════════════════════════════════════════════════════

  // ── Toast ────────────────────────────────────────────────
  const ToastBar = () => {
    if (!toast) return null;
    const colors = {
      success: 'bg-green-50 border-green-200 text-green-700',
      error: 'bg-red-50 border-red-200 text-red-700',
      warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    };
    const icons = {
      success: <CheckCircle size={16} className="mr-2 flex-shrink-0" />,
      error: <X size={16} className="mr-2 flex-shrink-0" />,
      warning: <AlertTriangle size={16} className="mr-2 flex-shrink-0" />,
    };
    return (
      <div className={`p-3 rounded-xl border font-medium text-sm flex items-center ${colors[toast.type]}`}>
        {icons[toast.type]}{toast.text}
      </div>
    );
  };

  // ── Mode Chooser ─────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-1">Excel Import</h2>
          <p className="text-slate-500 text-sm">Import data from your Xero exports to populate the database automatically.</p>
        </div>
        <ToastBar />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {/* Stock Import Card */}
          <button
            onClick={() => setMode('stock')}
            className="bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-green-400 hover:shadow-lg transition-all text-left group"
          >
            <div className="bg-green-100 text-green-600 p-3.5 rounded-xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <Package size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Import Stocktake</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload your <span className="font-semibold text-slate-700">Xero Stocktake Worksheet</span> to create products and set opening stock levels.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Creates: Products + Inventory Lots</p>
              <p>Columns: Product, Description, Supplier, Qty on Hand</p>
            </div>
            <div className="mt-4 flex items-center text-green-600 font-bold text-sm">
              Start <ArrowRight size={16} className="ml-1.5" />
            </div>
          </button>

          {/* Sales Import Card */}
          <button
            onClick={() => setMode('sales')}
            className="bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all text-left group"
          >
            <div className="bg-blue-100 text-blue-600 p-3.5 rounded-xl w-fit mb-5 group-hover:scale-110 transition-transform">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Import Sales Data</h3>
            <p className="text-sm text-slate-500 mb-4">
              Upload your <span className="font-semibold text-slate-700">Xero Sales by Product/Service Summary</span> to populate demand history.
            </p>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Creates: Products (if new) + Sales History</p>
              <p>Columns: Product, Quantity, Amount, Avg Price</p>
            </div>
            <div className="mt-4 flex items-center text-blue-600 font-bold text-sm">
              Start <ArrowRight size={16} className="ml-1.5" />
            </div>
          </button>
        </div>

        {/* Info box */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-3xl">
          <div className="flex items-start space-x-3">
            <Info size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-slate-500 space-y-2">
              <p><span className="font-bold text-slate-700">Recommended import order:</span> Stocktake first (creates products), then Sales (links to existing products).</p>
              <p>All 19 Ahrhoff products are pre-configured with pack sizes, categories, lead times, and supplier info. Unknown products will be auto-detected where possible.</p>
              <p>Existing products won't be duplicated — the importer matches by name.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Upload Step ──────────────────────────────────────────
  if (step === 'upload') {
    const isStock = mode === 'stock';
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-1">
              {isStock ? 'Import Stocktake' : 'Import Sales Data'}
            </h2>
            <p className="text-slate-500 text-sm">
              {isStock
                ? 'Upload your Xero Stocktake Worksheet (.xlsx)'
                : 'Upload your Xero Sales by Product/Service Summary (.xlsx)'}
            </p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center">
            <RotateCcw size={16} className="mr-1.5" />Back
          </button>
        </div>

        <ToastBar />

        {parseError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start">
            <AlertTriangle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>{parseError}</div>
          </div>
        )}

        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-green-400 transition-colors p-12 text-center max-w-2xl">
          <div className={`mx-auto mb-5 p-4 rounded-2xl w-fit ${isStock ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
            <FileSpreadsheet size={40} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">Drop your .xlsx file here</h3>
          <p className="text-slate-500 text-sm mb-6">or click the button below to browse</p>
          <label className={`inline-flex items-center px-6 py-3 font-bold text-white rounded-xl cursor-pointer text-sm ${isStock ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
            <Upload size={18} className="mr-2" />
            Choose Excel File
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={isStock ? handleStockFile : handleSalesFile}
              className="hidden"
            />
          </label>

          <div className="mt-6 text-xs text-slate-400">
            <p>Expected format: <span className="font-medium text-slate-500">
              {isStock ? 'Xero → Reports → Stocktake Worksheet' : 'Xero → Reports → Sales by Product/Service Summary'}
            </span></p>
          </div>
        </div>
      </div>
    );
  }

  // ── Preview Step: Stocktake ──────────────────────────────
  if (step === 'preview' && mode === 'stock') {
    const matched = stockRows.filter(r => r.matched && !r.skip).length;
    const unmatched = stockRows.filter(r => !r.matched && !r.skip).length;
    const total = stockRows.filter(r => !r.skip).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-1">Preview: Stocktake Import</h2>
            <p className="text-slate-500 text-sm">File: {stockFileName}</p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center">
            <RotateCcw size={16} className="mr-1.5" />Start Over
          </button>
        </div>

        <ToastBar />

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{matched}</p>
            <p className="text-xs text-green-600 font-medium">Matched</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-yellow-700">{unmatched}</p>
            <p className="text-xs text-yellow-600 font-medium">New Products</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">{total}</p>
            <p className="text-xs text-slate-500 font-medium">Will Import</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase w-8">Use</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Pack</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Supplier</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Qty on Hand</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockRows.map((row, idx) => (
                  <tr key={idx} className={`${row.skip ? 'opacity-40' : 'hover:bg-slate-50/50'}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!row.skip}
                        onChange={() => {
                          const copy = [...stockRows];
                          copy[idx] = { ...copy[idx], skip: !copy[idx].skip };
                          setStockRows(copy);
                        }}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        row.category === 'Browser' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        row.category === 'Clex' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                        row.category === 'Segawean' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                      }`}>{row.category}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.packSize}kg</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.supplier}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {row.quantityOnHand.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {row.matched ? (
                        <span className="flex items-center text-green-600 text-xs font-medium">
                          <CheckCircle size={14} className="mr-1" />Catalog Match
                        </span>
                      ) : (
                        <span className="flex items-center text-yellow-600 text-xs font-medium">
                          <AlertTriangle size={14} className="mr-1" />New Product
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={saveStockImport}
            disabled={saving || total === 0}
            className="flex items-center px-6 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Importing...</>
            ) : (
              <><CheckCircle size={18} className="mr-2" />Import {total} Products</>
            )}
          </button>
          <button onClick={resetAll} className="px-6 py-3 text-slate-600 font-medium text-sm hover:text-slate-800">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Preview Step: Sales ──────────────────────────────────
  if (step === 'preview' && mode === 'sales') {
    const products = salesRows.filter(r => !r.skip && !r.isServiceRow);
    const serviceRows = salesRows.filter(r => r.isServiceRow);
    const totalQty = products.reduce((s, r) => s + r.quantity, 0);
    const totalAmt = products.reduce((s, r) => s + r.amount, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-800 mb-1">Preview: Sales Import</h2>
            <p className="text-slate-500 text-sm">
              File: {salesFileName}
              {salesDateRange && <span className="ml-2 text-slate-400">| Range: {salesDateRange}</span>}
            </p>
          </div>
          <button onClick={resetAll} className="px-4 py-2 text-slate-500 hover:text-slate-700 text-sm font-medium flex items-center">
            <RotateCcw size={16} className="mr-1.5" />Start Over
          </button>
        </div>

        <ToastBar />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-blue-700">{products.length}</p>
            <p className="text-xs text-blue-600 font-medium">Products</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-700">{totalQty.toLocaleString()}</p>
            <p className="text-xs text-green-600 font-medium">Total Qty Sold</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-slate-700">R{Math.round(totalAmt).toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium">Total Revenue</p>
          </div>
        </div>

        {salesDateRange && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm flex items-start">
            <Info size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Date range detected:</span> {salesDateRange}.
              The total quantity for each product will be split evenly across the months in this range to create monthly demand records.
            </div>
          </div>
        )}

        {/* Skipped service rows warning */}
        {serviceRows.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700 text-sm flex items-start">
            <AlertTriangle size={16} className="mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{serviceRows.length} non-product rows</span> auto-skipped: {serviceRows.map(r => r.name).join(', ')}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase w-8">Use</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Qty Sold</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Revenue (R)</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Avg Price</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase text-right">Margin %</th>
                  <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesRows.map((row, idx) => (
                  <tr key={idx} className={`${row.skip ? 'opacity-40' : 'hover:bg-slate-50/50'} ${row.isServiceRow ? 'bg-slate-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={!row.skip}
                        onChange={() => {
                          const copy = [...salesRows];
                          copy[idx] = { ...copy[idx], skip: !copy[idx].skip };
                          setSalesRows(copy);
                        }}
                        className="rounded border-slate-300"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.name}
                      {row.isServiceRow && (
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold uppercase rounded">Service</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">{row.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">R{Math.round(row.amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">R{row.avgPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.grossMarginPct.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      {row.isServiceRow ? (
                        <span className="text-slate-400 text-xs">Skipped</span>
                      ) : row.matched ? (
                        <span className="flex items-center text-green-600 text-xs font-medium">
                          <CheckCircle size={14} className="mr-1" />Matched
                        </span>
                      ) : (
                        <span className="flex items-center text-yellow-600 text-xs font-medium">
                          <AlertTriangle size={14} className="mr-1" />New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={saveSalesImport}
            disabled={saving || products.length === 0}
            className="flex items-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>Importing...</>
            ) : (
              <><CheckCircle size={18} className="mr-2" />Import {products.length} Products' Sales</>
            )}
          </button>
          <button onClick={resetAll} className="px-6 py-3 text-slate-600 font-medium text-sm hover:text-slate-800">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Done Step ────────────────────────────────────────────
  if (step === 'done' && result) {
    const isStock = result.type === 'stock';
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 mb-1">Import Complete</h2>
        </div>

        <ToastBar />

        <div className={`bg-white p-8 rounded-2xl border-2 max-w-xl ${isStock ? 'border-green-200' : 'border-blue-200'}`}>
          <div className={`mx-auto mb-5 p-4 rounded-2xl w-fit ${isStock ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
            <CheckCircle size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 text-center mb-6">
            {isStock ? 'Stocktake Data Loaded' : 'Sales Data Loaded'}
          </h3>

          <div className="space-y-3 text-sm">
            {result.itemsCreated > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">New products created</span>
                <span className="font-bold text-green-700">{result.itemsCreated}</span>
              </div>
            )}
            {result.existingItems > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Existing products matched</span>
                <span className="font-bold text-slate-700">{result.existingItems}</span>
              </div>
            )}
            {result.lotsCreated > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Inventory lots created</span>
                <span className="font-bold text-green-700">{result.lotsCreated}</span>
              </div>
            )}
            {result.salesCreated > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Monthly sales records created</span>
                <span className="font-bold text-blue-700">{result.salesCreated}</span>
              </div>
            )}
            {result.skippedRows > 0 && (
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-600">Rows skipped</span>
                <span className="font-bold text-slate-400">{result.skippedRows}</span>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col space-y-3">
            <button
              onClick={resetAll}
              className={`w-full px-6 py-3 font-bold text-white rounded-xl text-sm ${isStock ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isStock ? 'Import Sales Data Next' : 'Import More Data'}
            </button>
            <p className="text-center text-xs text-slate-400">
              Check the {isStock ? 'Product Master and Inventory' : 'Sales Entry'} pages to verify your data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default ExcelImport;
