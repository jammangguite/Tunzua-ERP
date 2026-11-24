import React, { useState } from 'react';
import { FinalAccountsModule } from '../components/FinanceModules';
import { PayrollModule, BankReconciliation, ForecastingModule } from '../components/SuiteModules';
import { GstComputationModule } from '../components/GstComputationModule';
import { AuditModule } from '../components/AuditModule';
import { ClickablePath } from '../components/ClickablePath';
import { Download } from 'lucide-react';
import { useStore } from '../store';
import { exportFinancialPDF } from '../utils/pdfExport';
import { computeGstFromLedger, downloadGstStatementPdf } from '../utils/gstComputation';
import { toast } from 'sonner';

type ReportTab = 'final_accounts' | 'gst_tax' | 'payroll' | 'reconciliation' | 'forecasting' | 'audit';

const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('final_accounts');
  const store = useStore();

  const tabs: { id: ReportTab; label: string }[] = [
    { id: 'final_accounts', label: 'Final Accounts' },
    { id: 'gst_tax', label: 'GST Computation' },
    { id: 'payroll', label: 'Payroll' },
    { id: 'reconciliation', label: 'Bank Reconciliation' },
    { id: 'forecasting', label: 'Cash Forecast' },
    { id: 'audit', label: 'Audit Trail' },
  ];

  const handleExport = (type: string) => {
    const toastId = toast.loading('Preparing PDF report...');
    try {
      if (type === 'gst_summary') {
        let savedProfile = null;
        let savedOverrides = {};
        try {
          const p = localStorage.getItem('tunzua_gst_profile_v1');
          if (p) savedProfile = JSON.parse(p);
          const o = localStorage.getItem('tunzua_gst_overrides_v1');
          if (o) savedOverrides = JSON.parse(o);
        } catch {
          // ignore storage errors
        }
        const profile = savedProfile || {
          gstin: '27AABCT1332L1Z5',
          legalName: store.companySettings.name || 'Tunzua',
          stateCode: '27',
          defaultRate: 18,
          defaultSupplyType: 'intra' as const,
          priceBasis: 'exclusive' as const,
          includeTaxableExpenses: false,
        };
        const summary = computeGstFromLedger(store.db.ledger, profile, savedOverrides);
        downloadGstStatementPdf(
          summary,
          profile,
          'All Ledger Dates',
          store.companySettings.currencySymbol || '$'
        );
      } else {
        exportFinancialPDF(store, type);
      }
      toast.dismiss(toastId);
      toast.success('PDF exported.');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to generate PDF: ' + (err as Error).message);
    }
  };

  const renderActiveReport = () => {
    switch (activeTab) {
      case 'final_accounts':
        return <FinalAccountsModule />;
      case 'gst_tax':
        return <GstComputationModule />;
      case 'payroll':
        return <PayrollModule />;
      case 'reconciliation':
        return <BankReconciliation />;
      case 'forecasting':
        return <ForecastingModule />;
      case 'audit':
        return <AuditModule />;
      default:
        return <FinalAccountsModule />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-[#E5E0D5] flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Financial Reports
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Final statements, tax summaries, payroll registers, bank reconciliation, and audit logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleExport('full')}
          className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          Download Full Booklet (PDF)
        </button>
      </div>

      {/* Quick PDF Exports */}
      <div className="bg-[#FFFDF9] border border-[#E5E0D5] rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 no-print">
        <span className="text-xs font-medium text-[#6B655C]">Quick PDF statements</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'trial_balance', label: 'Trial Balance' },
            { id: 'pnl', label: 'Profit & Loss' },
            { id: 'balance_sheet', label: 'Balance Sheet' },
            { id: 'gst_summary', label: 'GST Summary' },
            { id: 'cash_flow', label: 'Cash Flow' },
            { id: 'payroll', label: 'Payroll' },
            { id: 'audit', label: 'Audit Summary' },
          ].map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleExport(item.id)}
              className="px-3 py-1.5 bg-[#F8F6F1] hover:bg-[#F2EFE9] text-[#1F1D1A] text-xs font-medium rounded-md border border-[#E5E0D5] transition-colors cursor-pointer whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Report Tabs + Active Workspace */}
      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] p-5">
        <div className="flex flex-wrap gap-1 p-1 bg-[#F2EFE9] border border-[#E5E0D5] rounded-lg mb-5 no-print">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div>{renderActiveReport()}</div>
      </div>
    </div>
  );
};

export default Reports;
