/**
 * Ahrhoff Futtergut Product Catalog
 * 
 * Master list of all 20 products with pre-filled metadata.
 * Used by the Excel import feature to auto-match product names
 * and fill in pack sizes, categories, and supplier info.
 * 
 * Name normalization: extra spaces are collapsed so
 * "Browser  Silage Cool" matches "Browser Silage Cool".
 */

import { Item } from './types';

export interface ProductTemplate {
  name: string;              // Canonical product name
  aliases: string[];         // Alternative spellings found in Excel exports
  category: 'Clex' | 'Browser' | 'Segawean' | 'Other';
  packSize: number;          // kg per unit (parsed from Xero description)
  packDescription: string;   // Human-readable pack info
  preferredSupplier: string;
  defaultLeadTimeDays: number;
  defaultMOQ: number;
  defaultCostPerUnit: number;
  defaultShelfLifeDays: number;
}

export const PRODUCT_CATALOG: ProductTemplate[] = [
  // ── Browser Range ──────────────────────────────────────────
  {
    name: 'Browser Beef Pro',
    aliases: ['Browser Beef Pro'],
    category: 'Browser',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 40.50,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser DryLac FL',
    aliases: ['Browser DryLac FL'],
    category: 'Browser',
    packSize: 25,
    packDescription: 'x 25kg canister',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 20,
    defaultCostPerUnit: 62.12,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser K6 Pro',
    aliases: ['Browser K6 Pro'],
    category: 'Browser',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 31.08,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser K60 A2',
    aliases: ['Browser K60 A2'],
    category: 'Browser',
    packSize: 1000,
    packDescription: 'x 1000kg IBC',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 21,
    defaultMOQ: 1,
    defaultCostPerUnit: 34.41,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser K7 Pro Pasture',
    aliases: ['Browser K7 Pro Pasture'],
    category: 'Browser',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 35.00,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser Silage Cool',
    aliases: ['Browser Silage Cool', 'Browser  Silage Cool'],
    category: 'Browser',
    packSize: 0.2,
    packDescription: 'Gebinde a 0.2kg',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 4382.75,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Browser Steam Up 20',
    aliases: ['Browser Steam Up 20'],
    category: 'Browser',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 27.61,
    defaultShelfLifeDays: 365,
  },

  // ── Clex Range ─────────────────────────────────────────────
  {
    name: 'Clex Activarom',
    aliases: ['Clex Activarom'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 25,
    defaultCostPerUnit: 142.40,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex Eukatol drink',
    aliases: ['Clex Eukatol drink'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg canister',
    preferredSupplier: 'Ahrhoff GMBH Germany',
    defaultLeadTimeDays: 42,
    defaultMOQ: 25,
    defaultCostPerUnit: 28.03,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex Green drink',
    aliases: ['Clex Green drink'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg canister',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 25,
    defaultCostPerUnit: 35.89,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex Inulin Smart',
    aliases: ['Clex Inulin Smart'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 32.21,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex Pro drink',
    aliases: ['Clex Pro drink'],
    category: 'Clex',
    packSize: 25,
    packDescription: '25kg canister',
    preferredSupplier: 'Ahrhoff GMBH Germany',
    defaultLeadTimeDays: 42,
    defaultMOQ: 25,
    defaultCostPerUnit: 49.11,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex SECH 3 drink',
    aliases: ['Clex SECH 3 drink'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg canister',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 25,
    defaultCostPerUnit: 90.02,
    defaultShelfLifeDays: 365,
  },
  {
    name: 'Clex V Hefe 4',
    aliases: ['Clex V Hefe 4'],
    category: 'Clex',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'Ahrhoff GMBH Germany',
    defaultLeadTimeDays: 42,
    defaultMOQ: 25,
    defaultCostPerUnit: 47.10,
    defaultShelfLifeDays: 365,
  },

  // ── Segawean Range ─────────────────────────────────────────
  {
    name: 'Segawean F 49',
    aliases: ['Segawean F 49'],
    category: 'Segawean',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 69.42,
    defaultShelfLifeDays: 730,
  },
  {
    name: 'Segawean F Boost',
    aliases: ['Segawean F Boost'],
    category: 'Segawean',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 90.37,
    defaultShelfLifeDays: 730,
  },
  {
    name: 'Segawean S Dry Sow',
    aliases: ['Segawean S Dry Sow'],
    category: 'Segawean',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 71.65,
    defaultShelfLifeDays: 730,
  },
  {
    name: 'Segawean S Lactating Sow',
    aliases: ['Segawean S Lactating Sow', 'Segawean  S Lactating Sow'],
    category: 'Segawean',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 87.97,
    defaultShelfLifeDays: 730,
  },

  // ── Other ──────────────────────────────────────────────────
  {
    name: 'SOW Day 7 Farrow Feed',
    aliases: ['SOW Day 7 Farrow Feed'],
    category: 'Other',
    packSize: 25,
    packDescription: 'x 25kg bags',
    preferredSupplier: 'CIPC',
    defaultLeadTimeDays: 14,
    defaultMOQ: 50,
    defaultCostPerUnit: 54.37,
    defaultShelfLifeDays: 365,
  },
];

/**
 * Normalize a product name by collapsing multiple spaces and trimming.
 */
export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/**
 * Find a product template by matching against name or aliases.
 * Returns undefined if no match found.
 */
export function findProductTemplate(rawName: string): ProductTemplate | undefined {
  const normalized = normalizeName(rawName);
  return PRODUCT_CATALOG.find(p =>
    normalizeName(p.name) === normalized ||
    p.aliases.some(a => normalizeName(a) === normalized)
  );
}

/**
 * Auto-detect category from a product name prefix.
 * Falls back to 'Other' if no known prefix matches.
 */
export function detectCategory(name: string): 'Clex' | 'Browser' | 'Segawean' | 'Other' {
  const n = normalizeName(name).toLowerCase();
  if (n.startsWith('browser')) return 'Browser';
  if (n.startsWith('clex')) return 'Clex';
  if (n.startsWith('segawean')) return 'Segawean';
  return 'Other';
}

/**
 * Try to parse pack size from a Xero description string.
 * Examples:
 *   "( x 25kg bags)" → 25
 *   "(x 25kg canister)" → 25
 *   "(x 1000kg  IBC)" → 1000
 *   "(ab 50 Gebinde a 0,2kg)" → 0.2
 *   "(1-49 Gebinde a 0,2kg)" → 0.2
 */
export function parsePackSize(description: string): number | null {
  if (!description) return null;
  // Try "a X,Ykg" pattern (German decimal comma)
  const germanMatch = description.match(/a\s+(\d+)[,.](\d+)\s*kg/i);
  if (germanMatch) return parseFloat(`${germanMatch[1]}.${germanMatch[2]}`);
  // Try "x NNNkg" pattern
  const stdMatch = description.match(/x?\s*(\d+)\s*kg/i);
  if (stdMatch) return parseFloat(stdMatch[1]);
  return null;
}

/**
 * Non-product rows in the Xero Sales export that should be skipped.
 */
export const SALES_SKIP_NAMES = [
  'asset sold',
  'customs documentation',
  'discount',
  'transport',
  'not specified',
  'total',
];

/**
 * Check if a sales row name should be skipped (not a real product).
 */
export function isSalesSkipRow(name: string): boolean {
  const n = normalizeName(name).toLowerCase();
  return SALES_SKIP_NAMES.some(skip => n.includes(skip));
}
