import { jsPDF } from 'jspdf';
import { LedgerTransaction } from '../types';

export type GstSupplyType = 'intra' | 'inter';
export type GstPriceBasis = 'exclusive' | 'inclusive';
export type GstSupplyClass = 'B2B' | 'B2C' | 'EXEMPT';

export interface GstProfile {
  gstin: string;
  legalName: string;
  stateCode: string;
  defaultRate: number; // e.g. 18
  defaultSupplyType: GstSupplyType;
  priceBasis: GstPriceBasis;
  includeTaxableExpenses: boolean;
}

export interface GstVoucherOverride {
  rate?: number;
  supplyType?: GstSupplyType;
  supplyClass?: GstSupplyClass;
  partyGstin?: string;
  hsnCode?: string;
  itcEligible?: boolean;
}

export interface GstComputedVoucher {
  id: string;
  date: string;
  reference: string;
  description: string;
  partyName: string;
  partyGstin: string;
  direction: 'outward' | 'inward';
  supplyType: GstSupplyType;
  supplyClass: GstSupplyClass;
  hsnCode: string;
  rate: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
  invoiceValue: number;
  itcEligible: boolean;
  fromTaggedMetadata: boolean;
}

export interface GstTaxBucket {
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  totalTax: number;
}

export interface GstSetOffRow {
  head: 'IGST' | 'CGST' | 'SGST';
  outputLiability: number;
  paidViaIgst: number;
  paidViaCgst: number;
  paidViaSgst: number;
  totalItcUsed: number;
  cashPayable: number;
  itcCarryForward: number;
}

export interface GstRateSlabRow {
  rate: number;
  outwardCount: number;
  outwardTaxable: number;
  outwardIgst: number;
  outwardCgst: number;
  outwardSgst: number;
  inwardCount: number;
  inwardTaxable: number;
  inwardItc: number;
}

export interface GstHsnSummaryRow {
  hsnCode: string;
  description: string;
  uqc: string;
  voucherCount: number;
  totalValue: number;
  taxableValue: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

export interface GstComputationSummary {
  outwardRows: GstComputedVoucher[];
  inwardRows: GstComputedVoucher[];
  outwardTaxable: GstTaxBucket;
  outwardExempt: GstTaxBucket;
  inwardEligibleItc: GstTaxBucket;
  inwardIneligibleItc: GstTaxBucket;
  setOffRows: GstSetOffRow[];
  totalOutputGst: number;
  totalEligibleItc: number;
  totalItcUtilized: number;
  netCashPayable: number;
  totalItcCarryForward: number;
  rateSlabs: GstRateSlabRow[];
  hsnRows: GstHsnSummaryRow[];
}

export const GST_RATES = [0, 5, 12, 18, 28];

export const INDIAN_STATE_CODES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '14', name: 'Manipur' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export const getStateLabel = (code: string): string => {
  const found = INDIAN_STATE_CODES.find(s => s.code === code);
  return found ? `${found.code}-${found.name}` : `${code}-Local`;
};

const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const emptyBucket = (): GstTaxBucket => ({
  taxableValue: 0,
  igst: 0,
  cgst: 0,
  sgst: 0,
  cess: 0,
  totalTax: 0,
});

const addToBucket = (bucket: GstTaxBucket, row: GstComputedVoucher) => {
  bucket.taxableValue = round2(bucket.taxableValue + row.taxableValue);
  bucket.igst = round2(bucket.igst + row.igst);
  bucket.cgst = round2(bucket.cgst + row.cgst);
  bucket.sgst = round2(bucket.sgst + row.sgst);
  bucket.cess = round2(bucket.cess + row.cess);
  bucket.totalTax = round2(bucket.totalTax + row.totalTax);
};

const inferDefaultHsn = (tx: LedgerTransaction): string => {
  const lower = `${tx.description} ${tx.debitAccount} ${tx.creditAccount}`.toLowerCase();
  if (lower.includes('consult') || lower.includes('service') || lower.includes('software') || lower.includes('saas')) {
    return '998314';
  }
  if (lower.includes('rent') || lower.includes('lease')) return '997212';
  if (lower.includes('utilit') || lower.includes('telecom') || lower.includes('internet')) return '998422';
  if (lower.includes('hardware') || lower.includes('laptop') || lower.includes('computer')) return '847130';
  if (lower.includes('furniture') || lower.includes('chair') || lower.includes('desk')) return '940330';
  return tx.type === 'sales' ? '998311' : '847190';
};

const inferPartyName = (tx: LedgerTransaction, direction: 'outward' | 'inward'): string => {
  const cleanDesc = tx.description.split('[GST Rule Compliant:')[0].trim();
  const byPreposition = cleanDesc.match(/\b(?:to|from)\s+([A-Z][A-Za-z0-9&.\-\s]{2,40})/i);
  if (byPreposition && byPreposition[1]) {
    return byPreposition[1].trim();
  }
  const candidate = direction === 'outward' ? tx.debitAccount : tx.creditAccount;
  if (
    candidate &&
    !candidate.toLowerCase().includes('bank') &&
    !candidate.toLowerCase().includes('cash')
  ) {
    return candidate;
  }
  return cleanDesc.slice(0, 36) || (direction === 'outward' ? 'Walk-in Customer' : 'General Vendor');
};

const parseTaggedGst = (tx: LedgerTransaction) => {
  if (!tx.description.includes('[GST Rule Compliant:')) return null;
  const gstPart = tx.description.split('[GST Rule Compliant:')[1]?.split(']')[0] || '';
  const isInter = gstPart.includes('Inter-State');
  const gstInMatch = gstPart.match(/GSTIN=([A-Z0-9]+)/i);
  const taxableMatch = gstPart.match(/Taxable=([\d.]+)/);
  const cgstMatch = gstPart.match(/CGST=([\d.]+)/);
  const sgstMatch = gstPart.match(/SGST=([\d.]+)/);
  const igstMatch = gstPart.match(/IGST=([\d.]+)/);

  const taxable = taxableMatch ? parseFloat(taxableMatch[1]) : 0;
  const cgst = cgstMatch ? parseFloat(cgstMatch[1]) : 0;
  const sgst = sgstMatch ? parseFloat(sgstMatch[1]) : 0;
  const igst = igstMatch ? parseFloat(igstMatch[1]) : 0;
  const totalTax = round2(cgst + sgst + igst);
  const derivedRate = taxable > 0 ? Math.round((totalTax / taxable) * 100) : 18;

  return {
    partyGstin: gstInMatch ? gstInMatch[1].toUpperCase() : '',
    supplyType: (isInter ? 'inter' : 'intra') as GstSupplyType,
    taxable: round2(taxable),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    rate: derivedRate,
  };
};

export const computeGstFromLedger = (
  ledger: LedgerTransaction[],
  profile: GstProfile,
  overrides: Record<string, GstVoucherOverride>,
  dateRange?: { from?: string; to?: string }
): GstComputationSummary => {
  const filtered = ledger.filter(tx => {
    if (dateRange?.from && tx.date < dateRange.from) return false;
    if (dateRange?.to && tx.date > dateRange.to) return false;
    return true;
  });

  const outwardRows: GstComputedVoucher[] = [];
  const inwardRows: GstComputedVoucher[] = [];

  for (const tx of filtered) {
    const isOutward =
      tx.type === 'sales' ||
      (tx.type === 'other_income' &&
        (tx.creditAccount.toLowerCase().includes('sales') ||
          tx.creditAccount.toLowerCase().includes('revenue') ||
          tx.description.includes('[GST Rule Compliant:')));

    const isInward =
      tx.type === 'purchase' ||
      (profile.includeTaxableExpenses &&
        tx.type === 'other_expense' &&
        !tx.debitAccount.toLowerCase().includes('depreciation') &&
        !tx.debitAccount.toLowerCase().includes('bank') &&
        !tx.debitAccount.toLowerCase().includes('cash'));

    if (!isOutward && !isInward) continue;

    const direction: 'outward' | 'inward' = isOutward ? 'outward' : 'inward';
    const override = overrides[tx.id] || {};
    const tagged = parseTaggedGst(tx);

    const partyGstin = (override.partyGstin ?? tagged?.partyGstin ?? '').trim().toUpperCase();
    const hasValidGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(partyGstin);
    const derivedSupplyType: GstSupplyType =
      override.supplyType ??
      (hasValidGstin
        ? partyGstin.slice(0, 2) === profile.stateCode
          ? 'intra'
          : 'inter'
        : tagged?.supplyType ?? profile.defaultSupplyType);

    const rate =
      override.rate !== undefined
        ? override.rate
        : tagged
          ? tagged.rate
          : profile.defaultRate;

    const supplyClass: GstSupplyClass =
      override.supplyClass ??
      (rate === 0 ? 'EXEMPT' : partyGstin.length >= 15 ? 'B2B' : 'B2C');

    const effectiveRate = supplyClass === 'EXEMPT' ? 0 : rate;

    let taxableValue = 0;
    let totalTax = 0;
    let invoiceValue = 0;
    let igst = 0;
    let cgst = 0;
    let sgst = 0;

    if (tagged && override.rate === undefined && override.supplyType === undefined && override.supplyClass === undefined) {
      taxableValue = tagged.taxable > 0 ? tagged.taxable : round2(tx.amount / (1 + effectiveRate / 100));
      igst = tagged.igst;
      cgst = tagged.cgst;
      sgst = tagged.sgst;
      totalTax = round2(igst + cgst + sgst);
      invoiceValue = round2(taxableValue + totalTax);
    } else if (profile.priceBasis === 'inclusive') {
      invoiceValue = round2(tx.amount);
      taxableValue = effectiveRate > 0 ? round2(tx.amount / (1 + effectiveRate / 100)) : invoiceValue;
      totalTax = round2(invoiceValue - taxableValue);
      if (derivedSupplyType === 'inter') {
        igst = totalTax;
      } else {
        cgst = round2(totalTax / 2);
        sgst = round2(totalTax - cgst);
      }
    } else {
      taxableValue = round2(tx.amount);
      totalTax = round2((taxableValue * effectiveRate) / 100);
      invoiceValue = round2(taxableValue + totalTax);
      if (derivedSupplyType === 'inter') {
        igst = totalTax;
      } else {
        cgst = round2(totalTax / 2);
        sgst = round2(totalTax - cgst);
      }
    }

    const row: GstComputedVoucher = {
      id: tx.id,
      date: tx.date,
      reference: tx.reference || `${direction === 'outward' ? 'INV' : 'BILL'}-${tx.id.slice(-4)}`,
      description: tx.description.split('[GST Rule Compliant:')[0].trim(),
      partyName: inferPartyName(tx, direction),
      partyGstin,
      direction,
      supplyType: derivedSupplyType,
      supplyClass,
      hsnCode: (override.hsnCode || inferDefaultHsn(tx)).trim(),
      rate: effectiveRate,
      taxableValue,
      igst,
      cgst,
      sgst,
      cess: 0,
      totalTax,
      invoiceValue,
      itcEligible: override.itcEligible ?? true,
      fromTaggedMetadata: Boolean(tagged),
    };

    if (direction === 'outward') {
      outwardRows.push(row);
    } else {
      inwardRows.push(row);
    }
  }

  outwardRows.sort((a, b) => b.date.localeCompare(a.date));
  inwardRows.sort((a, b) => b.date.localeCompare(a.date));

  const outwardTaxable = emptyBucket();
  const outwardExempt = emptyBucket();
  const inwardEligibleItc = emptyBucket();
  const inwardIneligibleItc = emptyBucket();

  outwardRows.forEach(r => {
    if (r.supplyClass === 'EXEMPT' || r.rate === 0) {
      addToBucket(outwardExempt, r);
    } else {
      addToBucket(outwardTaxable, r);
    }
  });

  inwardRows.forEach(r => {
    if (r.itcEligible && r.rate > 0) {
      addToBucket(inwardEligibleItc, r);
    } else {
      addToBucket(inwardIneligibleItc, r);
    }
  });

  // Strict GSTN Table 6.1 ITC Utilization Order:
  // 1) IGST credit must be exhausted first: against IGST -> CGST -> SGST
  // 2) CGST credit offsets CGST -> remaining IGST
  // 3) SGST credit offsets SGST -> remaining IGST (never CGST)
  let remIgstLiability = outwardTaxable.igst;
  let remCgstLiability = outwardTaxable.cgst;
  let remSgstLiability = outwardTaxable.sgst;

  let availIgstCredit = inwardEligibleItc.igst;
  let availCgstCredit = inwardEligibleItc.cgst;
  let availSgstCredit = inwardEligibleItc.sgst;

  const igstOnIgst = round2(Math.min(remIgstLiability, availIgstCredit));
  remIgstLiability = round2(remIgstLiability - igstOnIgst);
  availIgstCredit = round2(availIgstCredit - igstOnIgst);

  const igstOnCgst = round2(Math.min(remCgstLiability, availIgstCredit));
  remCgstLiability = round2(remCgstLiability - igstOnCgst);
  availIgstCredit = round2(availIgstCredit - igstOnCgst);

  const igstOnSgst = round2(Math.min(remSgstLiability, availIgstCredit));
  remSgstLiability = round2(remSgstLiability - igstOnSgst);
  availIgstCredit = round2(availIgstCredit - igstOnSgst);

  const cgstOnCgst = round2(Math.min(remCgstLiability, availCgstCredit));
  remCgstLiability = round2(remCgstLiability - cgstOnCgst);
  availCgstCredit = round2(availCgstCredit - cgstOnCgst);

  const cgstOnIgst = round2(Math.min(remIgstLiability, availCgstCredit));
  remIgstLiability = round2(remIgstLiability - cgstOnIgst);
  availCgstCredit = round2(availCgstCredit - cgstOnIgst);

  const sgstOnSgst = round2(Math.min(remSgstLiability, availSgstCredit));
  remSgstLiability = round2(remSgstLiability - sgstOnSgst);
  availSgstCredit = round2(availSgstCredit - sgstOnSgst);

  const sgstOnIgst = round2(Math.min(remIgstLiability, availSgstCredit));
  remIgstLiability = round2(remIgstLiability - sgstOnIgst);
  availSgstCredit = round2(availSgstCredit - sgstOnIgst);

  const setOffRows: GstSetOffRow[] = [
    {
      head: 'IGST',
      outputLiability: outwardTaxable.igst,
      paidViaIgst: igstOnIgst,
      paidViaCgst: cgstOnIgst,
      paidViaSgst: sgstOnIgst,
      totalItcUsed: round2(igstOnIgst + cgstOnIgst + sgstOnIgst),
      cashPayable: remIgstLiability,
      itcCarryForward: availIgstCredit,
    },
    {
      head: 'CGST',
      outputLiability: outwardTaxable.cgst,
      paidViaIgst: igstOnCgst,
      paidViaCgst: cgstOnCgst,
      paidViaSgst: 0,
      totalItcUsed: round2(igstOnCgst + cgstOnCgst),
      cashPayable: remCgstLiability,
      itcCarryForward: availCgstCredit,
    },
    {
      head: 'SGST',
      outputLiability: outwardTaxable.sgst,
      paidViaIgst: igstOnSgst,
      paidViaCgst: 0,
      paidViaSgst: sgstOnSgst,
      totalItcUsed: round2(igstOnSgst + sgstOnSgst),
      cashPayable: remSgstLiability,
      itcCarryForward: availSgstCredit,
    },
  ];

  // Rate slab aggregation
  const slabMap = new Map<number, GstRateSlabRow>();
  GST_RATES.forEach(rate => {
    slabMap.set(rate, {
      rate,
      outwardCount: 0,
      outwardTaxable: 0,
      outwardIgst: 0,
      outwardCgst: 0,
      outwardSgst: 0,
      inwardCount: 0,
      inwardTaxable: 0,
      inwardItc: 0,
    });
  });

  const ensureSlab = (rate: number) => {
    if (!slabMap.has(rate)) {
      slabMap.set(rate, {
        rate,
        outwardCount: 0,
        outwardTaxable: 0,
        outwardIgst: 0,
        outwardCgst: 0,
        outwardSgst: 0,
        inwardCount: 0,
        inwardTaxable: 0,
        inwardItc: 0,
      });
    }
    return slabMap.get(rate)!;
  };

  outwardRows.forEach(r => {
    const s = ensureSlab(r.rate);
    s.outwardCount += 1;
    s.outwardTaxable = round2(s.outwardTaxable + r.taxableValue);
    s.outwardIgst = round2(s.outwardIgst + r.igst);
    s.outwardCgst = round2(s.outwardCgst + r.cgst);
    s.outwardSgst = round2(s.outwardSgst + r.sgst);
  });

  inwardRows.forEach(r => {
    const s = ensureSlab(r.rate);
    s.inwardCount += 1;
    s.inwardTaxable = round2(s.inwardTaxable + r.taxableValue);
    if (r.itcEligible) {
      s.inwardItc = round2(s.inwardItc + r.totalTax);
    }
  });

  const rateSlabs = Array.from(slabMap.values())
    .filter(s => s.outwardCount > 0 || s.inwardCount > 0)
    .sort((a, b) => a.rate - b.rate);

  // HSN / SAC Table 12 Summary (Outward supplies)
  const hsnMap = new Map<string, GstHsnSummaryRow>();
  outwardRows.forEach(r => {
    const key = r.hsnCode || '998311';
    const existing = hsnMap.get(key) || {
      hsnCode: key,
      description: r.description.slice(0, 42) || 'Taxable Goods / Services',
      uqc: key.startsWith('99') ? 'OTH-OTHERS' : 'NOS-NUMBERS',
      voucherCount: 0,
      totalValue: 0,
      taxableValue: 0,
      igst: 0,
      cgst: 0,
      sgst: 0,
      cess: 0,
    };
    existing.voucherCount += 1;
    existing.totalValue = round2(existing.totalValue + r.invoiceValue);
    existing.taxableValue = round2(existing.taxableValue + r.taxableValue);
    existing.igst = round2(existing.igst + r.igst);
    existing.cgst = round2(existing.cgst + r.cgst);
    existing.sgst = round2(existing.sgst + r.sgst);
    existing.cess = round2(existing.cess + r.cess);
    hsnMap.set(key, existing);
  });

  const hsnRows = Array.from(hsnMap.values()).sort((a, b) => b.taxableValue - a.taxableValue);

  const totalOutputGst = outwardTaxable.totalTax;
  const totalEligibleItc = inwardEligibleItc.totalTax;
  const totalItcUtilized = round2(setOffRows.reduce((s, r) => s + r.totalItcUsed, 0));
  const netCashPayable = round2(setOffRows.reduce((s, r) => s + r.cashPayable, 0));
  const totalItcCarryForward = round2(setOffRows.reduce((s, r) => s + r.itcCarryForward, 0));

  return {
    outwardRows,
    inwardRows,
    outwardTaxable,
    outwardExempt,
    inwardEligibleItc,
    inwardIneligibleItc,
    setOffRows,
    totalOutputGst,
    totalEligibleItc,
    totalItcUtilized,
    netCashPayable,
    totalItcCarryForward,
    rateSlabs,
    hsnRows,
  };
};

// ------------------------------------------------------------------
// PORTAL-COMPATIBLE EXPORT HELPERS (GSTR-1 JSON, GSTR-3B JSON, CSV, PDF)
// ------------------------------------------------------------------

const formatDateDDMMYYYY = (isoDate: string): string => {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

const formatCsvCell = (val: string | number): string => {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

const triggerFileDownload = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// 1. GSTR-1 Portal Offline Utility Compatible JSON
export const downloadGstr1Json = (
  summary: GstComputationSummary,
  profile: GstProfile,
  periodCode: string
) => {
  // Group B2B outward invoices by counterparty GSTIN (ctin)
  const b2bMap = new Map<string, any[]>();
  summary.outwardRows
    .filter(r => r.supplyClass === 'B2B' && r.partyGstin)
    .forEach(r => {
      const pos = r.partyGstin.length >= 2 ? r.partyGstin.slice(0, 2) : profile.stateCode;
      const itmDet: Record<string, number> = {
        rt: r.rate,
        txval: r.taxableValue,
      };
      if (r.supplyType === 'inter') {
        itmDet.iamt = r.igst;
      } else {
        itmDet.camt = r.cgst;
        itmDet.samt = r.sgst;
      }
      itmDet.csamt = r.cess;

      const invObj = {
        inum: r.reference,
        idt: formatDateDDMMYYYY(r.date),
        val: r.invoiceValue,
        pos,
        rchrg: 'N',
        inv_typ: 'R',
        itms: [
          {
            num: Number(`${r.rate}01`),
            itm_det: itmDet,
          },
        ],
      };
      const existing = b2bMap.get(r.partyGstin) || [];
      existing.push(invObj);
      b2bMap.set(r.partyGstin, existing);
    });

  const b2b = Array.from(b2bMap.entries()).map(([ctin, inv]) => ({ ctin, inv }));

  // Aggregate B2CS by supplyType + rate
  const b2csMap = new Map<string, any>();
  summary.outwardRows
    .filter(r => r.supplyClass === 'B2C' && r.rate > 0)
    .forEach(r => {
      const sply_ty = r.supplyType === 'inter' ? 'INTER' : 'INTRA';
      const pos = r.supplyType === 'inter' ? '96' : profile.stateCode;
      const key = `${sply_ty}_${pos}_${r.rate}`;
      const existing = b2csMap.get(key) || {
        sply_ty,
        rt: r.rate,
        typ: 'OE',
        pos,
        txval: 0,
        iamt: 0,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
      existing.txval = round2(existing.txval + r.taxableValue);
      existing.iamt = round2(existing.iamt + r.igst);
      existing.camt = round2(existing.camt + r.cgst);
      existing.samt = round2(existing.samt + r.sgst);
      existing.csamt = round2(existing.csamt + r.cess);
      b2csMap.set(key, existing);
    });

  const payload = {
    gstin: profile.gstin || 'UNREGISTERED',
    fp: periodCode,
    version: 'GST3.1.6',
    hash: 'hash',
    b2b,
    b2cs: Array.from(b2csMap.values()),
    nil: {
      inv: [
        {
          sply_ty: 'INTRB2C',
          expt_amt: summary.outwardExempt.taxableValue,
          nil_amt: 0,
          ngsup_amt: 0,
        },
      ],
    },
    hsn: {
      data: summary.hsnRows.map((h, i) => ({
        num: i + 1,
        hsn_sc: h.hsnCode,
        desc: h.description,
        uqc: h.uqc.split('-')[0],
        qty: h.voucherCount,
        val: h.totalValue,
        txval: h.taxableValue,
        iamt: h.igst,
        camt: h.cgst,
        samt: h.sgst,
        csamt: h.cess,
      })),
    },
  };

  triggerFileDownload(
    JSON.stringify(payload, null, 2),
    `GSTR1_${profile.gstin || 'TUNZUA'}_${periodCode}.json`,
    'application/json'
  );
};

// 2. GSTR-3B Portal Compatible JSON
export const downloadGstr3bJson = (
  summary: GstComputationSummary,
  profile: GstProfile,
  periodCode: string
) => {
  const igstRow = summary.setOffRows.find(r => r.head === 'IGST')!;
  const cgstRow = summary.setOffRows.find(r => r.head === 'CGST')!;
  const sgstRow = summary.setOffRows.find(r => r.head === 'SGST')!;

  const payload = {
    gstin: profile.gstin || 'UNREGISTERED',
    ret_period: periodCode,
    sup_details: {
      osup_det: {
        txval: summary.outwardTaxable.taxableValue,
        iamt: summary.outwardTaxable.igst,
        camt: summary.outwardTaxable.cgst,
        samt: summary.outwardTaxable.sgst,
        csamt: summary.outwardTaxable.cess,
      },
      osup_zero: { txval: 0, iamt: 0, csamt: 0 },
      osup_nil_exmp: { txval: summary.outwardExempt.taxableValue },
      isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      osup_nongst: { txval: 0 },
    },
    itc_elg: {
      itc_avl: [
        {
          ty: 'OTH',
          iamt: summary.inwardEligibleItc.igst,
          camt: summary.inwardEligibleItc.cgst,
          samt: summary.inwardEligibleItc.sgst,
          csamt: summary.inwardEligibleItc.cess,
        },
      ],
      itc_rev: [],
      itc_net: {
        iamt: summary.inwardEligibleItc.igst,
        camt: summary.inwardEligibleItc.cgst,
        samt: summary.inwardEligibleItc.sgst,
        csamt: summary.inwardEligibleItc.cess,
      },
      itc_inelg: [
        {
          ty: 'OTH',
          iamt: summary.inwardIneligibleItc.igst,
          camt: summary.inwardIneligibleItc.cgst,
          samt: summary.inwardIneligibleItc.sgst,
          csamt: summary.inwardIneligibleItc.cess,
        },
      ],
    },
    tx_pmt: {
      tx_py: [
        {
          liab_ldg_id: 1,
          trans_typ: 30002,
          igst: { tx: igstRow.outputLiability },
          cgst: { tx: cgstRow.outputLiability },
          sgst: { tx: sgstRow.outputLiability },
        },
      ],
      pdcash: [
        {
          liab_ldg_id: 1,
          ipd: igstRow.cashPayable,
          cpd: cgstRow.cashPayable,
          spd: sgstRow.cashPayable,
          cspd: 0,
        },
      ],
      pditc: {
        liab_ldg_id: 1,
        i_pdi: igstRow.paidViaIgst,
        i_pdc: igstRow.paidViaCgst,
        i_pds: igstRow.paidViaSgst,
        c_pdi: cgstRow.paidViaIgst,
        c_pdc: cgstRow.paidViaCgst,
        s_pdi: sgstRow.paidViaIgst,
        s_pds: sgstRow.paidViaSgst,
      },
    },
  };

  triggerFileDownload(
    JSON.stringify(payload, null, 2),
    `GSTR3B_${profile.gstin || 'TUNZUA'}_${periodCode}.json`,
    'application/json'
  );
};

// 3. GSTR-1 Portal Offline Tool CSV (B2B / Outward Invoices)
export const downloadGstr1Csv = (
  summary: GstComputationSummary,
  profile: GstProfile,
  periodLabel: string
) => {
  const headers = [
    'Supply Class',
    'GSTIN/UIN of Recipient',
    'Receiver Name',
    'Invoice Number',
    'Invoice date',
    'Invoice Value',
    'Place Of Supply',
    'Reverse Charge',
    'Invoice Type',
    'HSN/SAC',
    'Rate',
    'Taxable Value',
    'IGST Amount',
    'CGST Amount',
    'SGST Amount',
    'Cess Amount',
  ];

  const rows = summary.outwardRows.map(r => [
    r.supplyClass,
    r.partyGstin || '',
    r.partyName,
    r.reference,
    formatDateDDMMYYYY(r.date),
    r.invoiceValue.toFixed(2),
    r.supplyType === 'inter'
      ? r.partyGstin.length >= 2
        ? getStateLabel(r.partyGstin.slice(0, 2))
        : '96-Inter-State'
      : getStateLabel(profile.stateCode),
    'N',
    'Regular',
    r.hsnCode,
    r.rate,
    r.taxableValue.toFixed(2),
    r.igst.toFixed(2),
    r.cgst.toFixed(2),
    r.sgst.toFixed(2),
    r.cess.toFixed(2),
  ]);

  const csv = [
    headers.map(formatCsvCell).join(','),
    ...rows.map(row => row.map(formatCsvCell).join(',')),
  ].join('\n');

  const safePeriod = periodLabel.replace(/[^A-Za-z0-9_-]/g, '_');
  triggerFileDownload(csv, `GSTR1_Outward_${safePeriod}.csv`, 'text/csv;charset=utf-8;');
};

// 4. GSTR-3B & ITC Summary CSV
export const downloadGstr3bCsv = (
  summary: GstComputationSummary,
  profile: GstProfile,
  periodLabel: string
) => {
  const lines: (string | number)[][] = [
    ['GSTR-3B Tax Summary & ITC Reconciliation'],
    ['Legal Name', profile.legalName, 'GSTIN', profile.gstin || 'Not Set', 'Period', periodLabel],
    [],
    ['Table 3.1 - Outward Supplies', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Cess', 'Total Tax'],
    [
      '(a) Outward Taxable Supplies',
      summary.outwardTaxable.taxableValue.toFixed(2),
      summary.outwardTaxable.igst.toFixed(2),
      summary.outwardTaxable.cgst.toFixed(2),
      summary.outwardTaxable.sgst.toFixed(2),
      summary.outwardTaxable.cess.toFixed(2),
      summary.outwardTaxable.totalTax.toFixed(2),
    ],
    [
      '(c) Nil Rated / Exempt Supplies',
      summary.outwardExempt.taxableValue.toFixed(2),
      '0.00',
      '0.00',
      '0.00',
      '0.00',
      '0.00',
    ],
    [],
    ['Table 4 - Input Tax Credit (ITC)', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'Cess', 'Total ITC'],
    [
      '(A) Eligible ITC Available',
      summary.inwardEligibleItc.taxableValue.toFixed(2),
      summary.inwardEligibleItc.igst.toFixed(2),
      summary.inwardEligibleItc.cgst.toFixed(2),
      summary.inwardEligibleItc.sgst.toFixed(2),
      summary.inwardEligibleItc.cess.toFixed(2),
      summary.inwardEligibleItc.totalTax.toFixed(2),
    ],
    [
      '(D) Ineligible ITC',
      summary.inwardIneligibleItc.taxableValue.toFixed(2),
      summary.inwardIneligibleItc.igst.toFixed(2),
      summary.inwardIneligibleItc.cgst.toFixed(2),
      summary.inwardIneligibleItc.sgst.toFixed(2),
      summary.inwardIneligibleItc.cess.toFixed(2),
      summary.inwardIneligibleItc.totalTax.toFixed(2),
    ],
    [],
    [
      'Table 6.1 - Tax Payment & ITC Set-Off',
      'Output Tax',
      'Paid via IGST',
      'Paid via CGST',
      'Paid via SGST',
      'Cash Payable',
      'ITC Carry Forward',
    ],
    ...summary.setOffRows.map(r => [
      r.head,
      r.outputLiability.toFixed(2),
      r.paidViaIgst.toFixed(2),
      r.paidViaCgst.toFixed(2),
      r.paidViaSgst.toFixed(2),
      r.cashPayable.toFixed(2),
      r.itcCarryForward.toFixed(2),
    ]),
    [
      'TOTAL',
      summary.totalOutputGst.toFixed(2),
      summary.setOffRows.reduce((s, r) => s + r.paidViaIgst, 0).toFixed(2),
      summary.setOffRows.reduce((s, r) => s + r.paidViaCgst, 0).toFixed(2),
      summary.setOffRows.reduce((s, r) => s + r.paidViaSgst, 0).toFixed(2),
      summary.netCashPayable.toFixed(2),
      summary.totalItcCarryForward.toFixed(2),
    ],
  ];

  const csv = lines.map(row => row.map(formatCsvCell).join(',')).join('\n');
  const safePeriod = periodLabel.replace(/[^A-Za-z0-9_-]/g, '_');
  triggerFileDownload(csv, `GSTR3B_Summary_${safePeriod}.csv`, 'text/csv;charset=utf-8;');
};

// 5. Formatted GST Filing Statement PDF
export const downloadGstStatementPdf = (
  summary: GstComputationSummary,
  profile: GstProfile,
  periodLabel: string,
  currencySymbol: string
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const fmt = (n: number) =>
    `${currencySymbol}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  let y = margin;

  // Forest Ink top rule
  doc.setFillColor(27, 77, 62);
  doc.rect(0, 0, pageWidth, 4.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 29, 26);
  doc.text('GST COMPUTATION & PORTAL RETURN SUMMARY', margin, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 101, 92);
  doc.text(
    `${profile.legalName || 'Tunzua'}   |   GSTIN: ${profile.gstin || 'Unregistered'}   |   Place of Supply: ${getStateLabel(profile.stateCode)}`,
    margin,
    y + 13
  );
  doc.text(
    `Return Period: ${periodLabel}   |   Basis: ${profile.priceBasis === 'inclusive' ? 'Tax Inclusive' : 'Tax Exclusive'}   |   Generated: ${new Date().toISOString().split('T')[0]}`,
    margin,
    y + 18
  );

  doc.setDrawColor(229, 224, 213);
  doc.setLineWidth(0.4);
  doc.line(margin, y + 22, pageWidth - margin, y + 22);
  y += 28;

  // 4-Metric Summary Band
  const cardW = (contentWidth - 9) / 4;
  const metrics = [
    { label: 'OUTPUT GST (3.1)', value: fmt(summary.totalOutputGst) },
    { label: 'ELIGIBLE ITC (4A)', value: fmt(summary.totalEligibleItc) },
    { label: 'NET CASH PAYABLE', value: fmt(summary.netCashPayable) },
    { label: 'ITC CARRY FORWARD', value: fmt(summary.totalItcCarryForward) },
  ];

  metrics.forEach((m, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(248, 246, 241);
    doc.setDrawColor(229, 224, 213);
    doc.rect(x, y, cardW, 17, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(107, 101, 92);
    doc.text(m.label, x + 3, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(31, 29, 26);
    doc.text(m.value, x + 3, y + 13);
  });
  y += 25;

  const drawSectionHeading = (title: string) => {
    if (y > pageHeight - 35) {
      doc.addPage();
      doc.setFillColor(27, 77, 62);
      doc.rect(0, 0, pageWidth, 4.5, 'F');
      y = margin + 6;
    }
    doc.setFillColor(242, 239, 233);
    doc.rect(margin, y, contentWidth, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(31, 29, 26);
    doc.text(title, margin + 3, y + 5.5);
    y += 12;
  };

  // Table 6.1 Set-Off Matrix
  drawSectionHeading('GSTR-3B TABLE 6.1 — TAX LIABILITY, ITC SET-OFF & NET CASH PAYABLE');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 101, 92);
  doc.text('Tax Head', margin + 2, y);
  doc.text('Output Tax', margin + 52, y, { align: 'right' });
  doc.text('Paid via IGST', margin + 80, y, { align: 'right' });
  doc.text('Paid via CGST', margin + 108, y, { align: 'right' });
  doc.text('Paid via SGST', margin + 135, y, { align: 'right' });
  doc.text('Cash Payable', margin + 158, y, { align: 'right' });
  doc.text('ITC C/F', pageWidth - margin - 2, y, { align: 'right' });
  y += 3;
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  summary.setOffRows.forEach(r => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 29, 26);
    doc.text(r.head, margin + 2, y);
    doc.text(fmt(r.outputLiability), margin + 52, y, { align: 'right' });
    doc.text(fmt(r.paidViaIgst), margin + 80, y, { align: 'right' });
    doc.text(fmt(r.paidViaCgst), margin + 108, y, { align: 'right' });
    doc.text(fmt(r.paidViaSgst), margin + 135, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(fmt(r.cashPayable), margin + 158, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(fmt(r.itcCarryForward), pageWidth - margin - 2, y, { align: 'right' });
    y += 6.5;
  });

  doc.line(margin, y - 2, pageWidth - margin, y - 2);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('TOTAL', margin + 2, y + 3);
  doc.text(fmt(summary.totalOutputGst), margin + 52, y + 3, { align: 'right' });
  doc.text(fmt(summary.totalItcUtilized), margin + 135, y + 3, { align: 'right' });
  doc.text(fmt(summary.netCashPayable), margin + 158, y + 3, { align: 'right' });
  doc.text(fmt(summary.totalItcCarryForward), pageWidth - margin - 2, y + 3, { align: 'right' });
  y += 13;

  // Rate-wise Summary
  drawSectionHeading('TAX RATE SLAB SUMMARY (OUTWARD & INWARD)');
  if (summary.rateSlabs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 101, 92);
    doc.text('No taxable outward or inward vouchers found in this period.', margin + 2, y);
    y += 10;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 101, 92);
    doc.text('Slab', margin + 2, y);
    doc.text('Outward Taxable', margin + 54, y, { align: 'right' });
    doc.text('Outward IGST', margin + 88, y, { align: 'right' });
    doc.text('Outward CGST+SGST', margin + 126, y, { align: 'right' });
    doc.text('Inward Taxable', margin + 155, y, { align: 'right' });
    doc.text('Eligible ITC', pageWidth - margin - 2, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    summary.rateSlabs.forEach(s => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(31, 29, 26);
      doc.text(`${s.rate}%`, margin + 2, y);
      doc.text(fmt(s.outwardTaxable), margin + 54, y, { align: 'right' });
      doc.text(fmt(s.outwardIgst), margin + 88, y, { align: 'right' });
      doc.text(fmt(round2(s.outwardCgst + s.outwardSgst)), margin + 126, y, { align: 'right' });
      doc.text(fmt(s.inwardTaxable), margin + 155, y, { align: 'right' });
      doc.text(fmt(s.inwardItc), pageWidth - margin - 2, y, { align: 'right' });
      y += 6.5;
    });
    y += 6;
  }

  // Outward Register
  drawSectionHeading(`GSTR-1 OUTWARD SUPPLY REGISTER (${summary.outwardRows.length} VOUCHERS)`);
  if (summary.outwardRows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(107, 101, 92);
    doc.text('No outward supply vouchers in this period.', margin + 2, y);
    y += 8;
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(107, 101, 92);
    doc.text('Date', margin + 2, y);
    doc.text('Ref / Class', margin + 24, y);
    doc.text('Party & HSN', margin + 56, y);
    doc.text('Rate', margin + 114, y, { align: 'right' });
    doc.text('Taxable', margin + 140, y, { align: 'right' });
    doc.text('GST', margin + 162, y, { align: 'right' });
    doc.text('Total', pageWidth - margin - 2, y, { align: 'right' });
    y += 3;
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    summary.outwardRows.forEach(r => {
      if (y > pageHeight - 20) {
        doc.addPage();
        doc.setFillColor(27, 77, 62);
        doc.rect(0, 0, pageWidth, 4.5, 'F');
        y = margin + 10;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(31, 29, 26);
      doc.text(r.date, margin + 2, y);
      doc.text(`${r.reference.slice(0, 12)} (${r.supplyClass})`, margin + 24, y);
      doc.text(`${r.partyName.slice(0, 24)} · ${r.hsnCode}`, margin + 56, y);
      doc.text(`${r.rate}%`, margin + 114, y, { align: 'right' });
      doc.text(fmt(r.taxableValue), margin + 140, y, { align: 'right' });
      doc.text(fmt(r.totalTax), margin + 162, y, { align: 'right' });
      doc.text(fmt(r.invoiceValue), pageWidth - margin - 2, y, { align: 'right' });
      y += 6;
    });
  }

  const safePeriod = periodLabel.replace(/[^A-Za-z0-9_-]/g, '_');
  doc.save(`Tunzua_GST_Summary_${safePeriod}.pdf`);
};
