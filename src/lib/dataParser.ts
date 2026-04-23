import { RawPortfolioItem, PortfolioItem, ValidationResult } from './types';
import { classifyProductType } from './productTypeClassifier';

// Column name mappings for flexible CSV parsing - expanded for Collectr variations
const COLUMN_MAPPINGS: Record<string, string[]> = {
  productName: [
    'product name', 'product', 'item name', 'item', 'name', 'title', 'description',
    'card name', 'card', 'product title', 'item title'
  ],
  category: [
    'category', 'type', 'product type'
  ],
  setName: [
    'set', 'set name', 'series', 'collection', 'set/series', 'expansion', 'release'
  ],
  quantity: [
    'quantity', 'qty', 'count', 'amount', 'units', 'total qty', 'total quantity',
    '# owned', 'owned', 'holdings'
  ],
  marketPrice: [
    'market price', 'market value', 'current price', 'price', 'value', 'current value',
    'est. market value', 'estimated value', 'est value', 'est. value', 'market',
    'current market value', 'current market price', 'unit price', 'unit value',
    'fair market value', 'fmv', 'tcgplayer price', 'tcg price', 'low price',
    'market price (each)', 'price each', 'each price'
  ],
  averageCostPaid: [
    'average cost paid', 'avg cost', 'cost', 'purchase price', 'paid', 'cost basis',
    'avg cost paid', 'average cost', 'cost paid', 'buy price', 'acquisition cost',
    'total cost', 'cost each', 'unit cost', 'avg. cost', 'average price paid',
    'purchase cost', 'bought for', 'bought at'
  ],
  grade: [
    'grade', 'condition', 'grading', 'psa', 'bgs', 'cgc', 'sgc', 'graded',
    'cert grade', 'grade/condition', 'psa grade', 'bgs grade', 'cgc grade'
  ],
  cardNumber: [
    'card number', 'card #', 'card no', 'number', '#', 'card no.', 'collector number',
    'set number', 'card num', 'no.', 'num', 'cert number', 'cert #', 'certification number'
  ],
  dateAdded: [
    'date added', 'date', 'added', 'purchase date', 'acquired', 'acquisition date',
    'add date', 'created', 'date created', 'date purchased', 'bought date'
  ],
  printing: [
    'printing', 'variance', 'variant', 'finish', 'foil', 'edition',
    'print type', 'card type', 'holofoil', 'reverse', 'print',
    'product variance', 'card finish'
  ],
  language: [
    'language', 'lang', 'locale', 'region'
  ],
  condition: [
    'condition', 'cond', 'card condition', 'item condition'
  ],
};

export interface ColumnMapping {
  detected: Record<string, string | null>;
  headers: string[];
}

/**
 * Sanitize a numeric string by removing currency symbols, commas, and whitespace
 */
export function sanitizeNumeric(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value;
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = String(value)
    .replace(/[$€£¥]/g, '')
    .replace(/,/g, '')
    .replace(/\s/g, '')
    .trim();

  if (cleaned === '' || cleaned === '-') {
    return 0;
  }

  const parsed = parseFloat(cleaned);
  
  if (isNaN(parsed)) {
    throw new Error(`Cannot parse numeric value: "${value}"`);
  }

  return parsed;
}

/**
 * Parse a date string into a Date object
 */
export function parseDate(value: string | undefined | null): Date | null {
  if (!value || value.trim() === '') {
    return null;
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Find the matching column name from CSV headers
 * Uses partial matching for better flexibility
 */
function findColumn(headers: string[], targetField: string): string | null {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  const mappings = COLUMN_MAPPINGS[targetField] || [];

  // First try exact match
  for (const mapping of mappings) {
    const index = normalizedHeaders.indexOf(mapping.toLowerCase());
    if (index !== -1) {
      return headers[index];
    }
  }

  // Then try partial/contains match
  for (const mapping of mappings) {
    const mappingLower = mapping.toLowerCase();
    const index = normalizedHeaders.findIndex(h => 
      h.includes(mappingLower) || mappingLower.includes(h)
    );
    if (index !== -1) {
      return headers[index];
    }
  }

  return null;
}

/**
 * Detect column mappings from CSV headers
 */
export function detectColumnMappings(csvContent: string): ColumnMapping {
  const { headers } = parseCSV(csvContent);
  
  return {
    headers,
    detected: {
      productName: findColumn(headers, 'productName'),
      category: findColumn(headers, 'category'),
      setName: findColumn(headers, 'setName'),
      quantity: findColumn(headers, 'quantity'),
      marketPrice: findColumn(headers, 'marketPrice'),
      averageCostPaid: findColumn(headers, 'averageCostPaid'),
      grade: findColumn(headers, 'grade'),
      cardNumber: findColumn(headers, 'cardNumber'),
      dateAdded: findColumn(headers, 'dateAdded'),
      printing: findColumn(headers, 'printing'),
      language: findColumn(headers, 'language'),
      condition: findColumn(headers, 'condition'),
    }
  };
}

/**
 * Classify asset type based on grade, card number, AND product name.
 * Product name keywords take priority for sealed detection so that
 * items like "151 Booster Bundle" or "Crown Zenith Elite Trainer Box"
 * are never misclassified as Raw Cards even when they have a card number.
 */
export function classifyAssetType(grade: string, cardNumber: string, productName?: string): 'Slab' | 'Raw Card' | 'Sealed' {
  const normalizedGrade = grade?.toLowerCase().trim() || '';
  const isUngraded = normalizedGrade === '' || normalizedGrade === 'ungraded' || normalizedGrade === 'n/a' || normalizedGrade === 'none';

  // Check graded first (highest priority)
  if (!isUngraded && normalizedGrade !== '') {
    // Even graded items: check if the name says "sealed" — extremely rare but be safe
    if (productName && classifyProductType(productName) === 'graded') return 'Slab';
    return 'Slab';
  }

  // Use product name keywords to detect sealed products before falling back to card-number heuristic
  if (productName) {
    const productType = classifyProductType(productName);
    if (productType === 'sealed') return 'Sealed';
    if (productType === 'graded') return 'Slab';
  }

  const hasCardNumber = cardNumber?.trim().length > 0;
  if (hasCardNumber && isUngraded) {
    return 'Raw Card';
  }

  return 'Sealed';
}

/**
 * Determine liquidity tier based on asset characteristics
 */
export function classifyLiquidityTier(
  assetType: 'Slab' | 'Raw Card' | 'Sealed',
  marketValue: number,
  quantity: number,
  productName: string
): 'High' | 'Medium' | 'Low' {
  const normalizedName = productName.toLowerCase();

  // High liquidity: Graded cards (slabs) and high-value singles
  if (assetType === 'Slab') {
    return 'High';
  }

  // High-value raw cards
  if (assetType === 'Raw Card' && marketValue > 50) {
    return 'High';
  }

  // Common sealed products
  const highDemandSealed = ['etb', 'elite trainer', 'booster box', 'bundle', 'collection box'];
  if (assetType === 'Sealed' && highDemandSealed.some(term => normalizedName.includes(term))) {
    return 'Medium';
  }

  // Large quantities = lower liquidity
  if (quantity > 10) {
    return 'Low';
  }

  // Bulk or niche items
  if (normalizedName.includes('bulk') || normalizedName.includes('lot')) {
    return 'Low';
  }

  return 'Medium';
}

/**
 * Parse CSV content into raw portfolio items
 */
export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain headers and at least one data row');
  }

  // Parse headers
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Process raw CSV data into validated portfolio items
 */
export function processPortfolioData(
  csvContent: string,
  customMapping?: Record<string, string | null>
): { items: PortfolioItem[]; validation: ValidationResult; detectedColumns: ColumnMapping } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const items: PortfolioItem[] = [];

  try {
    const { headers, rows } = parseCSV(csvContent);

    // Find column mappings (use custom if provided)
    const columnMap: Record<string, string | null> = customMapping || {
      productName: findColumn(headers, 'productName'),
      category: findColumn(headers, 'category'),
      setName: findColumn(headers, 'setName'),
      quantity: findColumn(headers, 'quantity'),
      marketPrice: findColumn(headers, 'marketPrice'),
      averageCostPaid: findColumn(headers, 'averageCostPaid'),
      grade: findColumn(headers, 'grade'),
      cardNumber: findColumn(headers, 'cardNumber'),
      dateAdded: findColumn(headers, 'dateAdded'),
      printing: findColumn(headers, 'printing'),
      language: findColumn(headers, 'language'),
      condition: findColumn(headers, 'condition'),
    };

    const detectedColumns: ColumnMapping = { headers, detected: columnMap };

    // Log detected columns for debugging
    console.log('CSV Headers found:', headers);
    console.log('Column mappings:', columnMap);

    // Validate required columns with helpful error messages
    const missingColumns: string[] = [];
    if (!columnMap.productName) {
      missingColumns.push('Product Name');
    }
    if (!columnMap.quantity) {
      missingColumns.push('Quantity');
    }
    if (!columnMap.marketPrice) {
      missingColumns.push('Market Price');
    }

    if (missingColumns.length > 0) {
      errors.push(`Missing required column(s): ${missingColumns.join(', ')}`);
      errors.push(`Detected columns: ${headers.join(', ')}`);
      return { items: [], validation: { isValid: false, errors, warnings }, detectedColumns };
    }

    // Process each row
    let totalMarketValueSum = 0;

    rows.forEach((row, index) => {
      try {
        const quantity = sanitizeNumeric(row[columnMap.quantity!]);
        const marketPrice = sanitizeNumeric(row[columnMap.marketPrice!]);
        const averageCostPaid = sanitizeNumeric(row[columnMap.averageCostPaid || ''] || '0');
        const grade = row[columnMap.grade || ''] || '';
        const cardNumber = row[columnMap.cardNumber || ''] || '';

        // Skip empty rows
        if (!row[columnMap.productName!]?.trim()) {
          return;
        }

        // Calculate derived fields
        // Determine if values are per-unit or totals based on header text.
        // Headers with "value" (e.g. "est. market value", "market value", "current value")
        // are typically TOTAL values for the position, NOT per-unit prices.
        // Headers with "price", "cost each", "unit" are per-unit.
        const marketHeader = String(columnMap.marketPrice ?? '').toLowerCase();
        const costHeader = String(columnMap.averageCostPaid ?? '').toLowerCase();

        const looksPerUnit = (h: string) => /\b(each|per|unit)\b/.test(h);
        const marketLooksTotal = !looksPerUnit(marketHeader) && (/\btotal\b/.test(marketHeader) || /\bvalue\b/.test(marketHeader));
        const costLooksTotal = !looksPerUnit(costHeader) && (/\btotal\b/.test(costHeader) || /\bvalue\b/.test(costHeader));

        // Market price: default to per-unit (multiply by quantity) unless header indicates total
        const totalMarketValue = marketLooksTotal ? marketPrice : quantity * marketPrice;
        const unitMarketPrice = quantity > 0 ? totalMarketValue / quantity : marketPrice;

        // Cost basis: default to per-unit (multiply by quantity) unless header says "total"
        // If cost is 0, treat it as null (not entered) - cost equals market price, profit is 0
        const isCostZero = averageCostPaid === 0;
        const effectiveCostPaid = isCostZero ? marketPrice : averageCostPaid;
        const totalCostBasis = costLooksTotal ? effectiveCostPaid : quantity * effectiveCostPaid;
        const unitCostBasis = quantity > 0 ? totalCostBasis / quantity : effectiveCostPaid;

        // If original cost was 0, profit is 0 (cost wasn't entered, not that it was free)
        const profitDollars = isCostZero ? 0 : totalMarketValue - totalCostBasis;
        const gainPercent = isCostZero ? 0 : (totalCostBasis > 0 ? ((totalMarketValue - totalCostBasis) / totalCostBasis) * 100 : 0);

        // Classify asset
        const assetType = classifyAssetType(grade, cardNumber, row[columnMap.productName!]);
        const liquidityTier = classifyLiquidityTier(assetType, totalMarketValue, quantity, row[columnMap.productName!]);

        const rawPrinting = row[columnMap.printing || ''] || '';
        const rawLanguage = row[columnMap.language || ''] || '';
        const rawCondition = row[columnMap.condition || ''] || '';

        const item: PortfolioItem = {
          id: `item-${index}-${Date.now()}`,
          productName: row[columnMap.productName!],
          category: row[columnMap.category || ''] || 'Uncategorized',
          setName: row[columnMap.setName || ''] || undefined,
          quantity,
          marketPrice: unitMarketPrice,
          averageCostPaid: unitCostBasis,
          grade,
          cardNumber,
          dateAdded: parseDate(row[columnMap.dateAdded || '']),
          printing: rawPrinting || undefined,
          language: rawLanguage || undefined,
          condition: rawCondition || undefined,
          totalMarketValue,
          totalCostBasis,
          profitDollars,
          gainPercent,
          portfolioWeightPercent: 0,
          assetType,
          liquidityTier,
        };

        items.push(item);
        totalMarketValueSum += totalMarketValue;
      } catch (err) {
        errors.push(`Row ${index + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });

    // Calculate portfolio weight percentages
    items.forEach(item => {
      item.portfolioWeightPercent = totalMarketValueSum > 0 
        ? (item.totalMarketValue / totalMarketValueSum) * 100 
        : 0;
    });

    // Validation check: Verify totals match independent aggregation
    const recalculatedTotal = items.reduce((sum, item) => sum + item.totalMarketValue, 0);
    const tolerance = totalMarketValueSum * 0.001; // 0.1% tolerance

    if (Math.abs(recalculatedTotal - totalMarketValueSum) > tolerance) {
      errors.push(`Data parsing mismatch: Aggregated total ($${recalculatedTotal.toFixed(2)}) differs from sum ($${totalMarketValueSum.toFixed(2)})`);
    }

    if (items.length === 0) {
      errors.push('No valid items found in the CSV file');
    }

    return {
      items,
      validation: {
        isValid: errors.length === 0,
        errors,
        warnings,
      },
      detectedColumns: { headers, detected: columnMap },
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to parse CSV file');
    return { items: [], validation: { isValid: false, errors, warnings }, detectedColumns: { headers: [], detected: {} } };
  }
}
