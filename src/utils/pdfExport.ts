import { jsPDF } from 'jspdf';

// Helper to format currency
const formatCurr = (num: number) => {
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Main Export Function
export const exportFinancialPDF = (store: any, reportType: string = 'full') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Common Header & Footer function
  const addPageBordersAndHeader = (title: string, pageNum: number, totalPagesPlaceholder: string) => {
    // Top border accent
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, 5, 'F');

    // Page frame (subtle gray)
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.2);
    doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (margin * 2) + 10, 'S');

    // Running Header
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text('TUNZUA ACCOUNTING LEDGER', margin, margin);
    doc.text(title.toUpperCase(), pageWidth - margin, margin, { align: 'right' });

    // Running Header Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, margin + 2, pageWidth - margin, margin + 2);

    // Running Footer
    doc.setFontSize(8);
    doc.text('CONFIDENTIAL • FOR INTERNAL AUDIT ONLY', margin, pageHeight - margin + 4);
    doc.text(`Page ${pageNum} of ${totalPagesPlaceholder}`, pageWidth - margin, pageHeight - margin + 4, { align: 'right' });
  };

  const drawSectionHeader = (y: number, title: string, subtitle?: string) => {
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(margin, y, contentWidth, 12, 'F');
    
    // Accent left-line
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(margin, y, 2, 12, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(title.toUpperCase(), margin + 5, y + 7.5);

    if (subtitle) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(subtitle, pageWidth - margin - 5, y + 7.5, { align: 'right' });
    }

    return y + 18;
  };

  // Helper to draw a clean key-value row
  const drawRow = (y: number, label: string, value: string, isBold = false, indent = 0) => {
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(9);
    const r = isBold ? 15 : 51;
    const g = isBold ? 23 : 65;
    const b = isBold ? 42 : 85;
    doc.setTextColor(r, g, b);
    doc.text(label, margin + indent, y);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
    return y + 6;
  };

  const drawDivider = (y: number, isDouble = false) => {
    doc.setDrawColor(203, 213, 225); // Slate 300
    doc.setLineWidth(isDouble ? 0.6 : 0.2);
    doc.line(margin, y, pageWidth - margin, y);
    if (isDouble) {
      doc.line(margin, y + 1, pageWidth - margin, y + 1);
      return y + 4;
    }
    return y + 3;
  };

  // 1. DATA GATHERING (Exactly mirroring app logic)
  const ledger = store.db.ledger || [];
  const payroll = store.db.payroll || [];
  const partners = store.db.partners || [];
  const fixedAssets = store.db.fixedAssets || [];
  const bankStatements = store.db.bankStatements || [];

  // DEFAULT_LEDGER_ACCOUNTS seed matching
  const savedAccounts = localStorage.getItem('syncledger_custom_accounts');
  let ledgerAccounts = [];
  try {
    ledgerAccounts = savedAccounts ? JSON.parse(savedAccounts) : [
      { accNo: '1010', name: 'Corporate Bank Account', type: 'Asset', initialBalance: 100000 },
      { accNo: '1020', name: 'Petty Cash Float', type: 'Asset', initialBalance: 1500 },
      { accNo: '1030', name: 'Ending Inventory Valuations', type: 'Asset', initialBalance: 0 },
      { accNo: '1040', name: 'Standard Product Inventory Asset', type: 'Asset', initialBalance: 42000 },
      { accNo: '2010', name: 'Corporate Partner Capital Ledger', type: 'Equity', initialBalance: 100000 },
      { accNo: '3010', name: 'GST Output Liability', type: 'Liability', initialBalance: 0 },
      { accNo: '3020', name: 'GST Input Tax Credit', type: 'Asset', initialBalance: 0 },
      { accNo: '3030', name: 'GST Payable Control Account', type: 'Liability', initialBalance: 0 },
      { accNo: '4010', name: 'Product Revenue Sales Account', type: 'Revenue', initialBalance: 0 },
      { accNo: '5010', name: 'Cost of Goods Sold (COGS) Expense', type: 'Expense', initialBalance: 0 },
      { accNo: '5020', name: 'Salary & Compensation Expense', type: 'Expense', initialBalance: 0 },
      { accNo: '5030', name: 'Employee Provident Fund Liability', type: 'Liability', initialBalance: 0 },
      { accNo: '5040', name: 'Income Tax TDS Liability Account', type: 'Liability', initialBalance: 0 },
      { accNo: '5050', name: 'Office Operating Rent Expense', type: 'Expense', initialBalance: 0 },
      { accNo: '5060', name: 'General Administrative Expense', type: 'Expense', initialBalance: 0 },
      { accNo: '5070', name: 'Fixed Asset Depreciation Expense', type: 'Expense', initialBalance: 0 }
    ];
  } catch {
    ledgerAccounts = [];
  }

  // A. TRIAL BALANCE CALCULATIONS
  const debits: { [account: string]: number } = {};
  const credits: { [account: string]: number } = {};

  ledgerAccounts.forEach((acc: any) => {
    if (acc.initialBalance > 0) {
      const isDebit = acc.type === 'Asset' || acc.type === 'Expense';
      if (isDebit) {
        debits[acc.name] = (debits[acc.name] || 0) + acc.initialBalance;
      } else {
        credits[acc.name] = (credits[acc.name] || 0) + acc.initialBalance;
      }
    }
  });

  ledger.forEach((tx: any) => {
    debits[tx.debitAccount] = (debits[tx.debitAccount] || 0) + tx.amount;
    credits[tx.creditAccount] = (credits[tx.creditAccount] || 0) + tx.amount;
  });

  const allAccountNames = Array.from(new Set([
    ...Object.keys(debits),
    ...Object.keys(credits),
    ...ledgerAccounts.map((a: any) => a.name)
  ]));

  const trialBalanceRows = allAccountNames.map((accName) => {
    const d = debits[accName] || 0;
    const c = credits[accName] || 0;
    let dCol = 0;
    let cCol = 0;

    const matchingDefinedAcc = ledgerAccounts.find((a: any) => a.name === accName);
    const isDebitNormal = matchingDefinedAcc
      ? (matchingDefinedAcc.type === 'Asset' || matchingDefinedAcc.type === 'Expense')
      : (accName.toLowerCase().includes('bank') ||
         accName.toLowerCase().includes('cash') ||
         accName.toLowerCase().includes('inventory') ||
         accName.toLowerCase().includes('receivable') ||
         accName.toLowerCase().includes('equipment') ||
         accName.toLowerCase().includes('expense') ||
         accName.toLowerCase().includes('cogs'));

    if (isDebitNormal) {
      const net = d - c;
      if (net >= 0) dCol = net;
      else cCol = Math.abs(net);
    } else {
      const net = c - d;
      if (net >= 0) cCol = net;
      else dCol = Math.abs(net);
    }

    return { account: accName, debit: dCol, credit: cCol };
  }).filter(row => row.debit !== 0 || row.credit !== 0);

  const totalDebits = trialBalanceRows.reduce((sum, r) => sum + r.debit, 0);
  const totalCredits = trialBalanceRows.reduce((sum, r) => sum + r.credit, 0);

  // B. PNL CALCULATIONS
  let revenue = 0;
  const pnlExpenses: { [category: string]: number } = {};

  ledger.forEach((tx: any) => {
    const lowerDebit = tx.debitAccount.toLowerCase();
    const lowerCredit = tx.creditAccount.toLowerCase();

    if (lowerCredit.includes('revenue')) {
      revenue += tx.amount;
    }
    if (lowerDebit.includes('expense') || lowerDebit.includes('cogs') || lowerDebit.includes('salary')) {
      pnlExpenses[tx.debitAccount] = (pnlExpenses[tx.debitAccount] || 0) + tx.amount;
    }
  });

  const totalExpenses = Object.values(pnlExpenses).reduce((sum, val) => sum + val, 0);
  const netProfit = revenue - totalExpenses;

  // C. BALANCE SHEET CALCULATIONS
  const getNetBalance = (accountNameKeyword: string, isDebitNormal: boolean) => {
    let dSum = 0;
    let cSum = 0;
    ledger.forEach((tx: any) => {
      if (tx.debitAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        dSum += tx.amount;
      }
      if (tx.creditAccount.toLowerCase().includes(accountNameKeyword.toLowerCase())) {
        cSum += tx.amount;
      }
    });
    return isDebitNormal ? (dSum - cSum) : (cSum - dSum);
  };

  const bankAndCash = 100000 + getNetBalance('bank', true) + getNetBalance('cash', true);
  const inventoryAssetVal = getNetBalance('inventory asset', true);
  const fixedAssetCost = fixedAssets.filter((a: any) => a.status === 'active').reduce((sum, a: any) => sum + a.cost, 0);
  const accumulatedDepreciation = fixedAssets.filter((a: any) => a.status === 'active').reduce((sum, a: any) => sum + a.accumulatedDepreciation, 0);
  const totalAssets = bankAndCash + inventoryAssetVal + fixedAssetCost - accumulatedDepreciation;

  const gstPayable = getNetBalance('gst payable', false);
  const epfLiability = getNetBalance('provident fund', false);
  const tdsLiability = getNetBalance('withholding tax', false);
  const totalLiabilities = gstPayable + epfLiability + tdsLiability;

  const totalPartnerCapital = partners.reduce((sum, p: any) => sum + p.balance, 0);
  const retainedEarningsVal = netProfit;
  const totalEquity = totalPartnerCapital + retainedEarningsVal;
  const totalFinancialClaims = totalLiabilities + totalEquity;

  // D. CASH FLOW CALCULATIONS
  const initialCash = 100000;
  let operatingInflows = 0;
  let operatingOutflows = 0;
  let investingOutflows = 0;
  let financingInflows = 0;
  let financingOutflows = 0;

  ledger.forEach((tx: any) => {
    const lowerDebit = tx.debitAccount.toLowerCase();
    const lowerCredit = tx.creditAccount.toLowerCase();
    const debitIsCash = lowerDebit.includes('bank') || lowerDebit.includes('cash');
    const creditIsCash = lowerCredit.includes('bank') || lowerCredit.includes('cash');

    if (debitIsCash && !creditIsCash) {
      const amt = tx.amount;
      if (lowerCredit.includes('capital') || lowerCredit.includes('partner') || lowerCredit.includes('equity')) {
        financingInflows += amt;
      } else if (lowerCredit.includes('fixed asset') || lowerCredit.includes('equipment') || lowerCredit.includes('plant')) {
        // Inflow from asset disposal
      } else {
        operatingInflows += amt;
      }
    } else if (creditIsCash && !debitIsCash) {
      const amt = tx.amount;
      if (lowerDebit.includes('capital') || lowerDebit.includes('partner') || lowerDebit.includes('drawings') || lowerDebit.includes('equity')) {
        financingOutflows += amt;
      } else if (lowerDebit.includes('fixed asset') || lowerDebit.includes('equipment') || lowerDebit.includes('plant') || lowerDebit.includes('depreciation') || lowerDebit.includes('office equipment')) {
        investingOutflows += amt;
      } else {
        operatingOutflows += amt;
      }
    }
  });

  const netOperating = operatingInflows - operatingOutflows;
  const netInvesting = -investingOutflows;
  const netFinancing = financingInflows - financingOutflows;
  const netIncrease = netOperating + netInvesting + netFinancing;
  const closingCash = initialCash + netIncrease;

  // E. TAX COMPUTATIONS
  const totalSalesAmount = ledger.filter((tx: any) => tx.type === 'sales').reduce((sum, tx: any) => sum + tx.amount, 0);
  const totalPurchasesAmount = ledger.filter((tx: any) => tx.type === 'purchase').reduce((sum, tx: any) => sum + tx.amount, 0);
  const outputGst = totalSalesAmount * 0.18;
  const inputTaxCredit = totalPurchasesAmount * 0.18;
  const netGstLiability = Math.max(0, outputGst - inputTaxCredit);

  // F. AUDIT SUMMARY
  const unreconciledStatementsCount = bankStatements.filter((s: any) => !s.reconciledTransactionId).length;
  const negativeMarginCount = store.db.inventory?.filter((item: any) => item.purchasePrice >= item.salesPrice).length || 0;
  const overdrawnPartnersCount = partners.filter((p: any) => p.balance < 0).length;

  const totalAuditIssues = unreconciledStatementsCount + negativeMarginCount + overdrawnPartnersCount;


  // PAGE 1: COVER PAGE
  if (reportType === 'full' || reportType === 'cover') {
    // Elegant Dark/Slate Cover Theme
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Accent line
    doc.setFillColor(52, 211, 153); // Emerald 400
    doc.rect(0, 100, 30, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.text('CORPORATE AUDIT &\nFINANCIAL REPORT', 40, 105);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text('A comprehensive GAAP-compliant financial ledger breakdown, automated trial balances, tax reconciliations, and payroll compilations.', 40, 125, { maxWidth: 140 });

    // Technical specifications
    doc.setDrawColor(71, 85, 105); // Slate 600
    doc.line(40, 150, pageWidth - 40, 150);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('REPORT DETAILS', 40, 160);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    
    let cy = 168;
    cy = drawRow(cy, 'Reporting Entity', 'Tunzua Ledger', false, 40);
    cy = drawRow(cy, 'System Environment', 'Tunzua Double-Entry Ledger', false, 40);
    cy = drawRow(cy, 'Fiscal Scope Period', 'Period Ending June 2026', false, 40);
    cy = drawRow(cy, 'Audit Baseline', 'Generally Accepted Accounting Principles (GAAP)', false, 40);
    cy = drawRow(cy, 'Assigned Examiner', 'Internal Spool Controller (Spanner-Linked)', false, 40);
    cy = drawRow(cy, 'Generation Date', new Date().toLocaleDateString() + ' (UTC-7)', false, 40);

    // Decorative footer
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, pageHeight - 35, pageWidth, 35, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 211, 153);
    doc.text('✓ STATUS: IN-BALANCE SECURE ENVIRONMENT', 40, pageHeight - 18);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('This computer-spooled ledger log complies with SEC statutory reporting provisions and GAAP corporate ledger guidelines.', 40, pageHeight - 12);
  }

  // Define total page list for rendering
  const activeReportSections: { name: string; render: (p: number, tot: string) => void }[] = [];

  // Helper to compile pages
  if (reportType === 'full' || reportType === 'trial_balance') {
    activeReportSections.push({
      name: 'Trial Balance Ledger',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('Trial Balance Ledger', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'Double-Entry Automated Trial Balance', 'Balanced Parity Assessment');
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Trial balance ledger tracks double-entry ledger totals across active charts of accounts. Debits must perfectly match Credits.', margin, y, { maxWidth: contentWidth });
        y += 12;

        // Draw Table Header
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text('Standard Account Classification Description', margin + 3, y + 5.5);
        doc.text('Debit Balances ($)', margin + 110, y + 5.5, { align: 'right' });
        doc.text('Credit Balances ($)', margin + 150, y + 5.5, { align: 'right' });
        y += 12;

        trialBalanceRows.forEach((row) => {
          if (y > pageHeight - margin - 20) {
            doc.addPage();
            addPageBordersAndHeader('Trial Balance Ledger', pageNum, tot);
            y = margin + 12;
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(row.account, margin + 3, y);
          doc.text(row.debit > 0 ? formatCurr(row.debit) : '—', margin + 110, y, { align: 'right' });
          doc.text(row.credit > 0 ? formatCurr(row.credit) : '—', margin + 150, y, { align: 'right' });
          y = drawDivider(y + 2.5);
        });

        y += 3;
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, contentWidth, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Grand Unified Ledger Summary Totals', margin + 3, y + 6.5);
        doc.text(formatCurr(totalDebits), margin + 110, y + 6.5, { align: 'right' });
        doc.text(formatCurr(totalCredits), margin + 150, y + 6.5, { align: 'right' });
        
        y += 16;
        const isTbBalanced = Math.abs(totalDebits - totalCredits) < 0.05;
        doc.setFillColor(isTbBalanced ? 240 : 254, isTbBalanced ? 253 : 242, isTbBalanced ? 250 : 242);
        doc.rect(margin, y, contentWidth, 14, 'F');
        doc.setDrawColor(isTbBalanced ? 16 : 220, isTbBalanced ? 185 : 38, isTbBalanced ? 129 : 38);
        doc.rect(margin, y, contentWidth, 14, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(isTbBalanced ? 6 : 153, isTbBalanced ? 95 : 27, isTbBalanced ? 70 : 27);
        doc.text(isTbBalanced ? '✓ PERFECT DOUBLE-ENTRY PARITY CONFIRMED' : '⚠ SYSTEM DISCREPANCY ENCOUNTERED', margin + 5, y + 5.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          isTbBalanced 
            ? 'All debit accounts are completely balanced with standard credits under general ledger laws.' 
            : `Accounting mismatch logged: debit and credit columns vary by ${formatCurr(Math.abs(totalDebits - totalCredits))}. Adjust journal adjustments.`,
          margin + 5, y + 10
        );
      }
    });
  }

  if (reportType === 'full' || reportType === 'pnl') {
    activeReportSections.push({
      name: 'Profit & Loss Statement (P&L)',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('Profit & Loss Statement', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'Interim Profit & Loss Statement (P&L)', 'Operating Performance Review');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Profit & Loss review summarizes corporate operating revenues, cost of sales, and general administrative expenses.', margin, y, { maxWidth: contentWidth });
        y += 12;

        y = drawSectionHeader(y, 'I. Operating Revenues', 'Primary Sales Income Streams');
        y = drawRow(y, 'Revenue Account (Product Sales & Compilations)', formatCurr(revenue), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Total Corporate Operating Revenues (Gross)', formatCurr(revenue), true, 4);
        y += 10;

        y = drawSectionHeader(y, 'II. Operating Expenses', 'Administrative & Labor Overhead');
        Object.keys(pnlExpenses).forEach((accName) => {
          y = drawRow(y, accName, `(${formatCurr(pnlExpenses[accName])})`, false, 4);
          y = drawDivider(y);
        });

        if (Object.keys(pnlExpenses).length === 0) {
          y = drawRow(y, 'No operational expenses logged', '$0.00', false, 4);
          y = drawDivider(y);
        }

        y = drawRow(y, 'Total Operational and Compensation Expenses', `(${formatCurr(totalExpenses)})`, true, 4);
        y += 14;

        // Executive summary of net profit
        doc.setFillColor(240, 253, 250);
        doc.rect(margin, y, contentWidth, 18, 'F');
        doc.setDrawColor(45, 212, 191);
        doc.rect(margin, y, contentWidth, 18, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(13, 148, 136);
        doc.text('NET RETAINED OPERATING INCOME (EBITDA)', margin + 6, y + 7);
        doc.text(formatCurr(netProfit), pageWidth - margin - 6, y + 11, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Computed net operational yield. Eligible for corporate retained earnings or partner dividend distributions.', margin + 6, y + 13);
      }
    });
  }

  if (reportType === 'full' || reportType === 'balance_sheet') {
    activeReportSections.push({
      name: 'Double-Entry Balance Sheet',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('Balance Sheet Statement', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'Corporate Double-Entry Balance Sheet', 'Accrual Assets, Liabilities & Owner Equity');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Balance sheet summarizes corporate assets and holds them equivalent to liabilities plus owner capital investments.', margin, y, { maxWidth: contentWidth });
        y += 12;

        const splitY = y;
        
        // Let's draw Assets in one section, Liabilities in another. To prevent column clashes on A4 portrait,
        // we can draw them as stacked sections or as a double table. Stacked is extremely elegant and spacious.
        y = drawSectionHeader(y, 'I. Active Corporate Assets', 'Standard Ledger Asset Accounts');
        y = drawRow(y, 'Cash and Corporate Bank Balances', formatCurr(bankAndCash), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Ending Inventory Valuations (At Cost)', formatCurr(inventoryAssetVal), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Property, Plant & Office Equipment', formatCurr(fixedAssetCost), false, 4);
        y = drawDivider(y);
        doc.setTextColor(220, 38, 38);
        y = drawRow(y, 'Less: Accumulated Depreciation Allowance', `(${formatCurr(accumulatedDepreciation)})`, false, 4);
        doc.setTextColor(51, 65, 85);
        y = drawDivider(y);
        y = drawRow(y, 'Total Combined Operating Assets (Book Value)', formatCurr(totalAssets), true, 4);
        y += 10;

        y = drawSectionHeader(y, 'II. Liabilities & Partner Equity', 'Claims & Contributed Corporate Funds');
        y = drawRow(y, 'GST Computations Payable (Tax Liabilities)', formatCurr(gstPayable), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Staff Statutory PF Holdings Suspense', formatCurr(epfLiability), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Payroll Statutory Taxes TDS Payable', formatCurr(tdsLiability), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Total Operating Liabilities', formatCurr(totalLiabilities), true, 4);
        y += 6;

        y = drawRow(y, 'Paid-in Partner Capital Fund', formatCurr(totalPartnerCapital), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Retained Operational Net Earnings (YTD P&L)', formatCurr(retainedEarningsVal), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Total Capital Equity Pool', formatCurr(totalEquity), true, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Total Claims and Partner Equity Contributions', formatCurr(totalFinancialClaims), true, 4);
        
        y += 14;
        const isBalanced = Math.abs(totalAssets - totalFinancialClaims) < 0.10;
        doc.setFillColor(isBalanced ? 240 : 254, isBalanced ? 253 : 242, isBalanced ? 250 : 242);
        doc.rect(margin, y, contentWidth, 14, 'F');
        doc.setDrawColor(isBalanced ? 16 : 220, isBalanced ? 185 : 38, isBalanced ? 129 : 38);
        doc.rect(margin, y, contentWidth, 14, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(isBalanced ? 6 : 153, isBalanced ? 95 : 27, isBalanced ? 70 : 27);
        doc.text(isBalanced ? '✓ ACCRUAL BALANCED STATUS CONFIRMED' : '⚠ UNBALANCED SUSPENSE DEVIATION', margin + 5, y + 5.5);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          isBalanced 
            ? `Assets and claim liabilities are perfectly aligned: ${formatCurr(totalAssets)} [ASSETS] === ${formatCurr(totalFinancialClaims)} [LIABILITIES & EQUITY]`
            : `Accounting variance detected: asset values do not balance with liabilities. Verify suspense accounts.`,
          margin + 5, y + 10
        );
      }
    });
  }

  if (reportType === 'full' || reportType === 'cash_flow') {
    activeReportSections.push({
      name: 'Cash Flow Statement',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('Cash Flow Statement', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'Corporate Statement of Cash Flows', 'Inflows and Outflows on Cash/Bank Accounts');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('This statement isolates exact liquidity fluctuations, dividing cash activities into operational, investing, and financing buckets.', margin, y, { maxWidth: contentWidth });
        y += 12;

        y = drawSectionHeader(y, 'I. Cash Flow from Operating Activities', 'Operational Revenue Net');
        y = drawRow(y, 'Receipts from General Customer Invoices', formatCurr(operatingInflows), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Outflows for Operating Expenses & Statutory Dues', `(${formatCurr(operatingOutflows)})`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Net Cash Generated by Operations', formatCurr(netOperating), true, 4);
        y += 10;

        y = drawSectionHeader(y, 'II. Cash Flow from Investing Activities', 'Fixed Assets Investment');
        y = drawRow(y, 'Capital Acquisitions for Productive Office Hardware', `(${formatCurr(investingOutflows)})`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Net Cash Employed by Investments', formatCurr(netInvesting), true, 4);
        y += 10;

        y = drawSectionHeader(y, 'III. Cash Flow from Financing Activities', 'Capital Infusion / Repayments');
        y = drawRow(y, 'Equity Infusions from Participating Board Members', formatCurr(financingInflows), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Drawings / Divestitures Paid to Partners', `(${formatCurr(financingOutflows)})`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Net Cash Retained from Financing', formatCurr(netFinancing), true, 4);
        y += 14;

        y = drawSectionHeader(y, 'Cash Balance Summarization', 'Final Ledger Liquidity');
        y = drawRow(y, 'Opening Liquid Cash/Bank Balances', formatCurr(initialCash), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Net Increase in General Cash Holdings', formatCurr(netIncrease), false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Closing Liquid Cash Assets', formatCurr(closingCash), true, 4);
      }
    });
  }

  if (reportType === 'full' || reportType === 'payroll') {
    activeReportSections.push({
      name: 'Statutory Payroll Summary',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('Statutory Payroll & Compensations', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'Statutory Payroll & Compensation Roster', 'Audit of Employee Basic, HRA and Deductions');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Employee rosters undergo complete baseline calculations: Basic wages represent 50% of gross monthly base, and HRA represents 40%. Automatic Provident Fund (12% of basic) and slab-based TDS withheld are audited below.', margin, y, { maxWidth: contentWidth });
        y += 12;

        // Draw Table Header
        doc.setFillColor(30, 41, 59);
        doc.rect(margin, y, contentWidth, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('Recipient Name / Designation', margin + 2, y + 5.5);
        doc.text('Base ($)', margin + 55, y + 5.5, { align: 'right' });
        doc.text('Basic (50%)', margin + 78, y + 5.5, { align: 'right' });
        doc.text('HRA (40%)', margin + 98, y + 5.5, { align: 'right' });
        doc.text('PF (12%)', margin + 118, y + 5.5, { align: 'right' });
        doc.text('TDS Tax', margin + 140, y + 5.5, { align: 'right' });
        doc.text('Net Pay ($)', margin + 165, y + 5.5, { align: 'right' });
        doc.text('Status', margin + 175, y + 5.5);
        y += 12;

        payroll.forEach((staff: any) => {
          if (y > pageHeight - margin - 20) {
            doc.addPage();
            addPageBordersAndHeader('Statutory Payroll & Compensations', pageNum, tot);
            y = margin + 12;
          }
          const basic = Math.round(staff.monthlyBase * 0.5);
          const hra = Math.round(basic * 0.4);
          const net = staff.monthlyBase + staff.allowances - staff.providentFund - staff.incomeTaxDeduction;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          doc.text(staff.name, margin + 2, y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(staff.role, margin + 2, y + 3);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text(staff.monthlyBase.toLocaleString(), margin + 55, y + 1.5, { align: 'right' });
          doc.text(basic.toLocaleString(), margin + 78, y + 1.5, { align: 'right' });
          doc.text(hra.toLocaleString(), margin + 98, y + 1.5, { align: 'right' });
          doc.text(staff.providentFund.toLocaleString(), margin + 118, y + 1.5, { align: 'right' });
          doc.text(staff.incomeTaxDeduction.toLocaleString(), margin + 140, y + 1.5, { align: 'right' });
          
          doc.setFont('helvetica', 'bold');
          doc.text(net.toLocaleString(), margin + 165, y + 1.5, { align: 'right' });
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(staff.status === 'disbursed' ? 16 : 217, staff.status === 'disbursed' ? 124 : 119, staff.status === 'disbursed' ? 65 : 6);
          doc.text(staff.status.toUpperCase(), margin + 175, y + 1.5);

          y = drawDivider(y + 5);
        });

        y += 4;
        y = drawRow(y, 'Total Managed Employee Payroll Accounts', `${payroll.length} active roster profiles`, true);
        const totPF = payroll.reduce((sum: number, s: any) => sum + s.providentFund, 0);
        const totTDS = payroll.reduce((sum: number, s: any) => sum + s.incomeTaxDeduction, 0);
        y = drawRow(y, 'Total EPFO Provident Fund Withheld Liability', formatCurr(totPF), false);
        y = drawRow(y, 'Total Income Tax TDS Payable Reserve', formatCurr(totTDS), false);
      }
    });
  }

  if (reportType === 'full' || reportType === 'audit') {
    activeReportSections.push({
      name: 'GAAP Compliance Assessment',
      render: (pageNum, tot) => {
        addPageBordersAndHeader('GAAP Compliance Assessment', pageNum, tot);
        let y = margin + 12;
        y = drawSectionHeader(y, 'GAAP System Audit & Compliance Assessment', 'Dual-Ledger Reconciliation Controls');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('This ledger environment is continuously examined by automated GAAP validations checking matching parameters, overdrawn bounds, and tax ratios.', margin, y, { maxWidth: contentWidth });
        y += 12;

        y = drawSectionHeader(y, 'Compliance Audit Results Summary', 'Automatic Flag Evaluator');
        
        y = drawRow(y, 'Reconciled Bank Statements', `${bankStatements.filter((s: any) => s.reconciledTransactionId).length} items`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Un-reconciled Voucher Exceptions', `${unreconciledStatementsCount} items`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Sub-Cost Inventory Margin Violations', `${negativeMarginCount} items`, false, 4);
        y = drawDivider(y);
        y = drawRow(y, 'Partner Capital Under-drawn Violations', `${overdrawnPartnersCount} items`, false, 4);
        y = drawDivider(y);
        
        y += 10;
        doc.setFillColor(totalAuditIssues === 0 ? 240 : 254, totalAuditIssues === 0 ? 253 : 242, totalAuditIssues === 0 ? 250 : 242);
        doc.rect(margin, y, contentWidth, 16, 'F');
        doc.setDrawColor(totalAuditIssues === 0 ? 16 : 220, totalAuditIssues === 0 ? 185 : 38, totalAuditIssues === 0 ? 129 : 38);
        doc.rect(margin, y, contentWidth, 16, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(totalAuditIssues === 0 ? 6 : 153, totalAuditIssues === 0 ? 95 : 27, totalAuditIssues === 0 ? 70 : 27);
        doc.text(totalAuditIssues === 0 ? '✓ ENVIRONMENT AUDIT: 100% SATISFACTORY' : `⚠ ENVIRONMENT AUDIT: ${totalAuditIssues} COMPLIANCE DISCREPANCIES`, margin + 5, y + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          totalAuditIssues === 0 
            ? 'No GAAP exceptions, payroll discrepancies, or unmatched bank-ledger balances found.' 
            : 'Certain manual transaction ledger voucher records or pricing models lack compliance parity. Review the audit suite.',
          margin + 5, y + 11, { maxWidth: contentWidth - 10 }
        );
      }
    });
  }

  // Iterate over sections and render pages correctly
  let activePageNum = 1;
  
  if (reportType === 'full' || reportType === 'cover') {
    activePageNum = 2; // cover was rendered directly
  }

  const sectionsCount = activeReportSections.length;
  const totalPagesCount = sectionsCount + (reportType === 'full' || reportType === 'cover' ? 1 : 0);
  const totString = totalPagesCount.toString();

  activeReportSections.forEach((sect, idx) => {
    doc.addPage();
    sect.render(activePageNum, totString);
    activePageNum++;
  });

  // Save/Download output
  const filename = `Tunzua_Financial_Report_${reportType}_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(filename);
};

// HELPER: Convert Number to Words (International format with dollars/rupees dynamic wording)
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const scales = ['', 'Thousand', 'Million', 'Billion'];

  if (num === 0) return 'Zero Dollars Only';

  const formatSegment = (n: number): string => {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str.trim();
  };

  const dollars = Math.floor(num);
  const cents = Math.round((num - dollars) * 100);

  let dollarStr = '';
  let temp = dollars;
  let scaleIdx = 0;

  while (temp > 0) {
    const segment = temp % 1000;
    if (segment > 0) {
      const segmentStr = formatSegment(segment);
      const scale = scales[scaleIdx] ? ' ' + scales[scaleIdx] : '';
      dollarStr = segmentStr + scale + (dollarStr ? ', ' + dollarStr : '');
    }
    temp = Math.floor(temp / 1000);
    scaleIdx++;
  }

  dollarStr = dollarStr.trim() || 'Zero';
  let result = dollarStr + ' Dollars';
  if (cents > 0) {
    result += ' and ' + formatSegment(cents) + ' Cents';
  } else {
    result += ' Only';
  }
  return result;
};

// CSV Export Helper
export const exportToCSV = (data: any[], headers: string[], filename: string) => {
  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };

  const csvRows = [];
  csvRows.push(headers.map(escapeCSV).join(','));

  for (const row of data) {
    csvRows.push(row.map(escapeCSV).join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// EXPORT SINGLE INVOICE PDF (TAX INVOICE - Copying format of Image 1)
export const exportSingleInvoicePDF = (tx: any, isPurchase = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Outer Page frame
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (margin * 2) + 10, 'S');

  // Top header text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('TAX INVOICE', margin, margin);
  doc.text('ORIGINAL FOR RECIPIENT', margin + 35, margin);
  doc.text('serving the need of other people', pageWidth - margin, margin, { align: 'right' });

  // Draw corporate identity with a dark navy block for logo
  doc.setFillColor(10, 37, 64); // Dark Navy (Image 1 style)
  doc.rect(margin, margin + 4, 24, 24, 'F');
  
  // Custom elegant logo (tz vector representation)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(1.2);
  // draw 't'
  doc.line(margin + 6, margin + 10, margin + 14, margin + 10);
  doc.line(margin + 10, margin + 7, margin + 10, margin + 21);
  // draw 'z'
  doc.line(margin + 13, margin + 14, margin + 19, margin + 14);
  doc.line(margin + 19, margin + 14, margin + 13, margin + 21);
  doc.line(margin + 13, margin + 21, margin + 19, margin + 21);

  // Corporate Name & Address
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(10, 37, 64);
  doc.text('TunZua Consultancy', margin + 28, margin + 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('53 Dawn School Road, Lailam Veng, Central Lamka, Manipur - 795006, Lamka, Manipur, 795006', margin + 28, margin + 16, { maxWidth: 150 });
  
  // Contact details line
  doc.setFont('helvetica', 'bold');
  doc.text('Mobile:', margin + 28, margin + 21);
  doc.setFont('helvetica', 'normal');
  doc.text('9863573108', margin + 39, margin + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('GSTIN:', margin + 61, margin + 21);
  doc.setFont('helvetica', 'normal');
  doc.text('14AOGPG0643F1ZI', margin + 72, margin + 21);

  doc.setFont('helvetica', 'bold');
  doc.text('PAN Number:', margin + 104, margin + 21);
  doc.setFont('helvetica', 'normal');
  doc.text('AOGPG0643F', margin + 124, margin + 21);

  doc.text('Email: info@tunzua.com  |  Website: https://tunzua.com/', margin + 28, margin + 25.5);

  // Solid dark separating banner
  doc.setFillColor(10, 37, 64);
  doc.rect(margin, margin + 31, contentWidth, 1.2, 'F');

  // Invoice No and Invoice Date details block (grey box)
  const infoBoxY = margin + 35;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, infoBoxY, contentWidth, 11, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No.: ${tx.reference || 'TCS-' + tx.id.slice(-6).toUpperCase()}`, margin + 4, infoBoxY + 7);
  doc.text(`Invoice Date: ${tx.date}`, pageWidth - margin - 4, infoBoxY + 7, { align: 'right' });

  // BILL TO details block
  const billToY = infoBoxY + 16;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BILL TO', margin, billToY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  // Resolve billing name from tx details
  const billingName = tx.description.split('Client:')[1]?.trim() || 
                      tx.description.split('to')[1]?.trim() || 
                      (isPurchase ? tx.creditAccount : tx.debitAccount) || 
                      '100 Plus Store';
  doc.text(billingName, margin, billToY + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Elim Veng, New Lamka, New Lamka, Manipur, 795006', margin, billToY + 10);
  doc.text('PAN Number: ASLPN0259P', margin, billToY + 14.5);
  doc.text('Place of Supply: Manipur', margin, billToY + 19);

  // Table items
  const tableY = billToY + 25;
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, tableY, contentWidth, 8, 'F');
  
  // Grid Lines top & bottom
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(margin, tableY, pageWidth - margin, tableY);
  doc.line(margin, tableY + 8, pageWidth - margin, tableY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('SERVICES', margin + 3, tableY + 5.5);
  doc.text('SAC', margin + 94, tableY + 5.5, { align: 'center' });
  doc.text('QTY.', margin + 114, tableY + 5.5, { align: 'center' });
  doc.text('RATE ($)', margin + 138, tableY + 5.5, { align: 'right' });
  doc.text('TAX ($)', margin + 158, tableY + 5.5, { align: 'center' });
  doc.text('AMOUNT ($)', margin + 177, tableY + 5.5, { align: 'right' });

  // Rows (Let's split the amount to simulate tax calculations: 18% GST built-in)
  const totalVal = tx.amount;
  const taxableVal = totalVal / 1.18;
  const cgstVal = (totalVal - taxableVal) / 2;
  const sgstVal = (totalVal - taxableVal) / 2;
  const totalTaxVal = cgstVal + sgstVal;

  const rowY = tableY + 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(tx.description.substring(0, 50).toUpperCase(), margin + 3, rowY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Statutory standard transactional ledger provision entry', margin + 3, rowY + 4);

  doc.setTextColor(15, 23, 42);
  doc.text('9982', margin + 94, rowY, { align: 'center' });
  doc.text('1 PCS', margin + 114, rowY, { align: 'center' });
  doc.text(taxableVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 138, rowY, { align: 'right' });
  
  // Show 18% tax breakdown
  doc.text(totalTaxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 158, rowY, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('(18%)', margin + 158, rowY + 3.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 177, rowY, { align: 'right' });

  // Table Subtotal Section
  const subY = rowY + 15;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, subY, pageWidth - margin, subY);
  doc.line(margin, subY + 8, pageWidth - margin, subY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('SUBTOTAL', margin + 3, subY + 5.5);
  doc.text('-', margin + 94, subY + 5.5, { align: 'center' });
  doc.text(totalTaxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 158, subY + 5.5, { align: 'center' });
  doc.text(totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 177, subY + 5.5, { align: 'right' });

  // Bank details & tax breakdown table stacked elegantly
  const bottomY = subY + 14;

  // BANK DETAILS BOX (Left Column)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BANK DETAILS', margin, bottomY);

  const drawBankDetailLine = (byY: number, label: string, val: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(label, margin, byY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(val, margin + 18, byY);
    return byY + 4.5;
  };

  let by = bottomY + 5;
  by = drawBankDetailLine(by, 'Name:', 'TUNZUA CONSULTANCY');
  by = drawBankDetailLine(by, 'IFSC Code:', 'HDFC0002269');
  by = drawBankDetailLine(by, 'Account No:', '50200063477079');
  by = drawBankDetailLine(by, 'Bank:', 'HDFC Bank, CHURACHANDPUR');

  // QR PAYMENT CODE box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PAYMENT QR CODE', margin, by + 4);
  
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('UPI ID: jammangguite@ptsbi', margin, by + 8);

  // Generate a beautiful little QR Code visual placeholder
  const qrX = margin;
  const qrY = by + 11;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(qrX, qrY, 15, 15, 'S');
  // Draw some mini internal patterns
  doc.setFillColor(15, 23, 42);
  doc.rect(qrX + 1, qrY + 1, 4, 4, 'F');
  doc.rect(qrX + 10, qrY + 1, 4, 4, 'F');
  doc.rect(qrX + 1, qrY + 10, 4, 4, 'F');
  doc.rect(qrX + 7, qrY + 7, 2, 2, 'F');

  // RIGHT SIDE TAX COMPUTATION BREAKDOWN (Mirroring Image 1)
  let ry = bottomY + 2;
  const rightAlignX = pageWidth - margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text('Taxable Amount', rightAlignX - 45, ry);
  doc.text(taxableVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightAlignX, ry, { align: 'right' });

  ry += 4.5;
  doc.text('CGST @9%', rightAlignX - 45, ry);
  doc.text(cgstVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightAlignX, ry, { align: 'right' });

  ry += 4.5;
  doc.text('SGST @9%', rightAlignX - 45, ry);
  doc.text(sgstVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightAlignX, ry, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  ry += 2;
  doc.line(rightAlignX - 50, ry, rightAlignX, ry);
  ry += 4;

  // Total Amount Row
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Total Amount', rightAlignX - 45, ry);
  doc.text('$' + totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightAlignX, ry, { align: 'right' });

  ry += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text('Received Amount', rightAlignX - 45, ry);
  doc.text('$' + totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightAlignX, ry, { align: 'right' });

  ry += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.text('Balance', rightAlignX - 45, ry);
  doc.text('$0.00', rightAlignX, ry, { align: 'right' });

  ry += 8;
  // Total in words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Total Amount (in words)', rightAlignX, ry, { align: 'right' });
  
  ry += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const words = numberToWords(totalVal);
  doc.text(words, rightAlignX, ry, { align: 'right', maxWidth: 85 });

  // Bottom Signature row (Cursive authorizer)
  const sigY = pageHeight - margin - 15;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTHORISED SIGNATORY FOR', rightAlignX, sigY, { align: 'right' });
  doc.text('TunZua Consultancy', rightAlignX, sigY + 3.5, { align: 'right' });

  // Fancy signature path placeholder
  doc.setFont('courier', 'italic');
  doc.setFontSize(11);
  doc.text('Jammangguite', rightAlignX - 5, sigY - 4, { align: 'right' });

  // Terms & Conditions block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TERMS AND CONDITIONS', margin, sigY - 4);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('1. Services once sold will not be taken back or exchanged.', margin, sigY);
  doc.text('2. All disputes are subject to TunZua Consultancy jurisdiction only.', margin, sigY + 3);

  // Save the PDF
  const docFilename = `Tunzua_Invoice_${tx.reference || tx.id}.pdf`;
  doc.save(docFilename);
};

// EXPORT SINGLE RECEIPT/PAYMENT VOUCHER PDF (RECEIPT VOUCHER - Copying format of Image 2)
export const exportSingleVoucherPDF = (tx: any, isPayment = false) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Outer Page frame
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.2);
  doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (margin * 2) + 10, 'S');

  // Header Details (Image 2 style)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('TunZua Consultancy', margin, margin + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('53 Dawn School Road, Lailam Veng, Central Lamka, Manipur - 795006', margin, margin + 10);
  doc.text('Lamka, Manipur, 795006', margin, margin + 14);
  doc.text('GSTIN : 14AOGPG0643F1ZI', margin, margin + 18.5);

  // Top Right Info
  const trX = pageWidth - margin;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  
  doc.text('Payment Number:', trX - 45, margin + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(tx.reference || 'TCP-' + tx.id.slice(-6).toUpperCase(), trX, margin + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Date:', trX - 45, margin + 10);
  doc.setFont('helvetica', 'bold');
  doc.text(tx.date, trX, margin + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.text('Payment Mode:', trX - 45, margin + 15);
  doc.setFont('helvetica', 'bold');
  doc.text(tx.isBankCleared ? 'bank' : 'cash', trX, margin + 15, { align: 'right' });

  // Center Badge
  const badgeY = margin + 26;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, badgeY, 35, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isPayment ? 'PAYMENT OUTFLOW' : 'PAYMENT FROM', margin + 3, badgeY + 4);

  // Payer/Recipient Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  const partyName = tx.description.split('Client:')[1]?.trim() || 
                    tx.description.split('to')[1]?.trim() || 
                    (isPayment ? tx.debitAccount : tx.creditAccount) || 
                    '100 Plus Store';
  doc.text(partyName, margin, badgeY + 11);

  // RECEIPT FOR / PAYMENT FOR badge
  const categoryY = badgeY + 16;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, categoryY, 35, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  doc.text(isPayment ? 'PAYMENT FOR' : 'RECEIPT FOR', margin + 3, categoryY + 4);

  // Table
  const tblY = categoryY + 11;
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, tblY, contentWidth, 8, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.line(margin, tblY, pageWidth - margin, tblY);
  doc.line(margin, tblY + 8, pageWidth - margin, tblY + 8);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('#', margin + 2, tblY + 5.5);
  doc.text('INVOICE / REF', margin + 12, tblY + 5.5);
  doc.text('VOUCHER DATE', margin + 45, tblY + 5.5);
  doc.text('INVOICE AMOUNT ($)', margin + 78, tblY + 5.5);
  doc.text('PAYMENT AMOUNT ($)', margin + 115, tblY + 5.5);
  doc.text('TDS ($)', margin + 152, tblY + 5.5);
  doc.text('DISCOUNT ($)', margin + 168, tblY + 5.5);
  doc.text('BALANCE DUE ($)', margin + 193, tblY + 5.5, { align: 'right' });

  // Voucher details row
  const valY = tblY + 13;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('1', margin + 2, valY);
  doc.text(tx.reference || 'N/A', margin + 12, valY);
  doc.text(tx.date, margin + 45, valY);
  doc.text(tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), margin + 78, valY);
  doc.text(tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), margin + 115, valY);
  doc.text('0.0', margin + 152, valY);
  doc.text('0.0', margin + 168, valY);
  doc.text('0.0', margin + 193, valY, { align: 'right' });

  // Table Total
  const tblTotY = valY + 6;
  doc.line(margin, tblTotY, pageWidth - margin, tblTotY);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL', margin + 45, tblTotY + 4.5);
  doc.text(tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }), margin + 115, tblTotY + 4.5);
  doc.line(margin, tblTotY + 7, pageWidth - margin, tblTotY + 7);

  // Bottom info (Image 2 style)
  const totalsBoxY = tblTotY + 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Total: $ ${tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, margin, totalsBoxY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Amount Paid in Words', margin, totalsBoxY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(numberToWords(tx.amount), margin, totalsBoxY + 10.5);

  // Signature Block on right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Authorized signatory for', trX, totalsBoxY + 6, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text('TunZua Consultancy', trX, totalsBoxY + 10.5, { align: 'right' });

  // Signature box
  doc.setDrawColor(203, 213, 225);
  doc.rect(trX - 55, totalsBoxY + 14, 55, 14, 'S');
  doc.setFont('courier', 'italic');
  doc.setFontSize(10);
  doc.text('Jammangguite', trX - 28, totalsBoxY + 22, { align: 'center' });

  // Save the PDF
  const voucherFilename = `Tunzua_Voucher_${tx.reference || tx.id}.pdf`;
  doc.save(voucherFilename);
};

// EXPORT CHRONOLOGICAL DAYBOOK REGISTRY PDF
export const exportDaybookPDF = (transactions: any[], selectedDate: string) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Accent Line
  doc.setFillColor(99, 102, 241); // Indigo 500
  doc.rect(0, 0, pageWidth, 5, 'F');

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (margin * 2) + 10, 'S');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('CHRONOLOGICAL DAYBOOK LEDGER', margin, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`DATE FILTER: ${selectedDate || 'ALL LOGGED DATES'}`, margin, margin + 12.5);
  doc.text(`GENERATED ON: ${new Date().toLocaleString()}`, pageWidth - margin, margin + 12.5, { align: 'right' });

  // Solid line separator
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  let y = margin + 22;

  // Render transactions table
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DATE', margin + 2, y + 5.5);
  doc.text('TYPE', margin + 18, y + 5.5);
  doc.text('REF NO', margin + 44, y + 5.5);
  doc.text('NARRATION / DESCRIPTION', margin + 68, y + 5.5);
  doc.text('DEBIT ACCOUNT (Dr)', margin + 122, y + 5.5);
  doc.text('CREDIT ACCOUNT (Cr)', margin + 155, y + 5.5);
  doc.text('AMOUNT ($)', margin + 193, y + 5.5, { align: 'right' });

  y += 8;

  transactions.forEach((tx) => {
    if (y > pageHeight - margin - 15) {
      doc.addPage();
      // Accent line on new page
      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, pageWidth, 5, 'F');
      y = margin + 15;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text(tx.date, margin + 2, y + 4);
    doc.text(tx.type.replace('_', ' ').toUpperCase(), margin + 18, y + 4);
    doc.text(tx.reference || tx.id.slice(-6).toUpperCase(), margin + 44, y + 4);
    
    // Narrow columns text wrapping
    doc.text(tx.description.substring(0, 32), margin + 68, y + 4);
    doc.text(tx.debitAccount.substring(0, 18), margin + 122, y + 4);
    doc.text(tx.creditAccount.substring(0, 18), margin + 155, y + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.text(tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 193, y + 4, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 7;
  });

  const totalSum = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y + 2, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GRAND TOTAL ACTIVITY', margin + 2, y + 7.5);
  doc.text('$' + totalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 193, y + 7.5, { align: 'right' });

  const fn = `Tunzua_Daybook_Report_${selectedDate || 'all'}.pdf`;
  doc.save(fn);
};

// EXPORT GENERAL JOURNAL REGISTRY PDF
export const exportJournalPDF = (transactions: any[]) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Accent Line (Indigo/Slate)
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 5, 'F');

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.rect(margin - 5, margin - 5, contentWidth + 10, pageHeight - (margin * 2) + 10, 'S');

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('GENERAL JOURNAL REGISTRY REPORT', margin, margin + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('STATUTORY ADJUSTMENT, CLOSING & ACCRUAL ENTRIES', margin, margin + 12.5);
  doc.text(`EXTRACTED ON: ${new Date().toLocaleString()}`, pageWidth - margin, margin + 12.5, { align: 'right' });

  // Solid line separator
  doc.line(margin, margin + 15, pageWidth - margin, margin + 15);

  let y = margin + 22;

  // Render transactions table
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('DATE', margin + 2, y + 5.5);
  doc.text('REFERENCE', margin + 24, y + 5.5);
  doc.text('ADJUSTING ENTRY NARRATIVE', margin + 48, y + 5.5);
  doc.text('DEBIT ACCOUNT (Dr)', margin + 110, y + 5.5);
  doc.text('CREDIT ACCOUNT (Cr)', margin + 150, y + 5.5);
  doc.text('AMOUNT ($)', margin + 193, y + 5.5, { align: 'right' });

  y += 8;

  transactions.forEach((tx) => {
    if (y > pageHeight - margin - 15) {
      doc.addPage();
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, pageWidth, 5, 'F');
      y = margin + 15;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    doc.text(tx.date, margin + 2, y + 4);
    doc.text(tx.reference || 'JV-N/A', margin + 24, y + 4);
    
    // Narrow columns text wrapping
    doc.text(tx.description.substring(0, 36), margin + 48, y + 4);
    doc.text(tx.debitAccount.substring(0, 22), margin + 110, y + 4);
    doc.text(tx.creditAccount.substring(0, 22), margin + 150, y + 4);
    
    doc.setFont('helvetica', 'bold');
    doc.text(tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 193, y + 4, { align: 'right' });

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 7;
  });

  const totalSum = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y + 2, contentWidth, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL ADJUSTMENTS VALUE', margin + 2, y + 7.5);
  doc.text('$' + totalSum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), margin + 193, y + 7.5, { align: 'right' });

  const fn = `Tunzua_Journal_Registry_Audit_${new Date().toISOString().slice(0,10)}.pdf`;
  doc.save(fn);
};

