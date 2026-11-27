import { DiscountType, GstTaxMode } from '../types';

export const GST_RATE_OPTIONS = [
  { value: 0, label: '0% (Exempt / Nil)' },
  { value: 5, label: '5% GST' },
  { value: 12, label: '12% GST' },
  { value: 18, label: '18% GST' },
  { value: 28, label: '28% GST' },
];

export const GST_MODE_OPTIONS: { value: GstTaxMode; label: string }[] = [
  { value: 'excluding', label: 'Excluding GST' },
  { value: 'including', label: 'Including GST' },
];

export interface ItemPricingBreakdown {
  baseAmount: number;
  discountAmount: number;
  afterDiscount: number;
  taxableValue: number;
  gstAmount: number;
  finalTotal: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Computes discount and GST (Excluding or Including) for an item/ledger master entry.
 */
export function computeItemPricing(
  basePrice: number,
  gstRate: number,
  gstMode: GstTaxMode,
  discount: number,
  discountType: DiscountType
): ItemPricingBreakdown {
  const safeBase = Math.max(0, Number.isFinite(basePrice) ? basePrice : 0);
  const safeRate = Math.max(0, Number.isFinite(gstRate) ? gstRate : 0);
  const safeDiscount = Math.max(0, Number.isFinite(discount) ? discount : 0);

  const discountAmount =
    discountType === 'percentage'
      ? round2(safeBase * (Math.min(safeDiscount, 100) / 100))
      : round2(Math.min(safeDiscount, safeBase));

  const afterDiscount = round2(Math.max(0, safeBase - discountAmount));

  if (gstMode === 'including') {
    const finalTotal = afterDiscount;
    const taxableValue =
      safeRate > 0 ? round2(finalTotal / (1 + safeRate / 100)) : finalTotal;
    const gstAmount = round2(finalTotal - taxableValue);
    return {
      baseAmount: round2(safeBase),
      discountAmount,
      afterDiscount,
      taxableValue,
      gstAmount,
      finalTotal,
    };
  }

  const taxableValue = afterDiscount;
  const gstAmount = round2(taxableValue * (safeRate / 100));
  const finalTotal = round2(taxableValue + gstAmount);

  return {
    baseAmount: round2(safeBase),
    discountAmount,
    afterDiscount,
    taxableValue,
    gstAmount,
    finalTotal,
  };
}
