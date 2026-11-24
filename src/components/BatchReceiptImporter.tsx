import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { TransactionType } from '../types';
import { 
  UploadCloud, 
  Trash2, 
  Check, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  FileSpreadsheet,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  FileCode,
  FileCheck,
  Table,
  HelpCircle,
  Download
} from 'lucide-react';

interface BatchItem {
  id: string;
  fileName: string;
  fileSize: string;
  base64: string;
  status: 'queued' | 'processing' | 'ready' | 'failed' | 'confirmed';
  error?: string;
  // Parsed / Auto-detected fields
  date: string;
  description: string;
  type: TransactionType | 'expense' | 'receipt'; // Compatibility with different variants
  debitAccount: string;
  creditAccount: string;
  amount: number;
  reference: string;
  documentType?: 'sales' | 'purchase';
}

interface BankQueueItem {
  id: string;
  date: string;
  description: string;
  amount: number;
  referenceNumber: string;
}

const STANDARD_ACCOUNTS = [
  'Corporate Bank Account',
  'Corporate Cash Account',
  'Sales Revenue Account',
  'Purchase COGS Account',
  'Office Rent Expense',
  'Statutory Payroll Expense',
  'Accumulated Depreciation Account',
  'Capital Fund - Partner Alice',
  'Capital Fund - Partner Bob'
];

const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: 'sales', label: '📊 Sales Revenue Posting' },
  { value: 'purchase', label: '📦 Direct Purchase Invoice' },
  { value: 'other_expense', label: '💸 Administrative Expense' },
  { value: 'other_income', label: '💰 General Inbound Capital' },
  { value: 'salary_payment', label: '👥 Employee Payroll Disbursed' },
  { value: 'tax_payment', label: '🏛️ Tax Reserve / Levy Paid' },
  { value: 'capital_contribution', label: '💼 Partner Capital Deposit' },
  { value: 'capital_withdrawal', label: '📉 Partner Capital withdrawal' },
  { value: 'profit_distribution', label: '🎁 General Profit Share payout' }
];

export const BatchReceiptImporter: React.FC = () => {
  const store = useStore();
  const [activeImportTab, setActiveImportTab] = useState<'sales' | 'purchase' | 'bank_statement' | 'csv_ledger'>('purchase');
  const [queue, setQueue] = useState<BatchItem[]>([]);
  const [bankQueue, setBankQueue] = useState<BankQueueItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // CSV Ledger State
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<string[][]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({
    date: '',
    description: '',
    amount: '',
    debitAccount: '',
    creditAccount: '',
    reference: '',
    type: ''
  });
  const [defaultMappingValues, setDefaultMappingValues] = useState<Record<string, string>>({
    type: 'other_expense',
    debitAccount: 'Corporate Bank Account',
    creditAccount: 'Sales Revenue Account',
    isBankCleared: 'true'
  });

  // Clear toast automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Convert File to base64 helper
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  // Safe lightweight CSV parser supporting commas within quoted cells
  const parseCsvText = (text: string): string[][] => {
    const lines = text.split(/\r?\n/);
    const parsed: string[][] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let inQuotes = false;
      let currentValue = '';
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      row.push(currentValue.trim());
      parsed.push(row);
    }
    
    return parsed;
  };

  // Safe file adding routine
  const addFilesToQueue = async (files: FileList) => {
    const today = new Date().toISOString().split('T')[0];

    // CSV LEDGER BULK TRANSACTION PROCESS WITH MAPPING
    if (activeImportTab === 'csv_ledger') {
      const file = files[0];
      if (!file) return;

      const isTextOrCsv = file.type === 'text/csv' || file.type === 'text/plain' || 
                          file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv');

      if (!isTextOrCsv) {
        setToast({ message: `Skipped non-CSV file "${file.name}". Please upload a valid CSV, TXT, or TSV.`, type: 'error' });
        return;
      }

      try {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsText(file);
        });

        const parsed = parseCsvText(text);
        if (parsed.length > 0) {
          const headers = parsed[0].map(h => h.trim());
          const rawRows = parsed.slice(1).filter(r => r.some(cell => cell.trim() !== ''));

          setCsvHeaders(headers);
          setCsvRawRows(rawRows);
          setCsvFile(file);

          // Smart auto-detect mappings based on header name matches
          const newMapping = {
            date: '',
            description: '',
            amount: '',
            debitAccount: '',
            creditAccount: '',
            reference: '',
            type: ''
          };

          headers.forEach((h) => {
            const hl = h.toLowerCase();
            if (hl.includes('date') || hl.includes('time')) newMapping.date = h;
            else if (hl.includes('desc') || hl.includes('narr') || hl.includes('particular') || hl.includes('detail')) newMapping.description = h;
            else if (hl.includes('amt') || hl.includes('amount') || hl.includes('val') || hl.includes('price')) newMapping.amount = h;
            else if (hl.includes('debit') || hl.includes('dr') || hl.includes('from')) newMapping.debitAccount = h;
            else if (hl.includes('credit') || hl.includes('cr') || hl.includes('to')) newMapping.creditAccount = h;
            else if (hl.includes('ref') || hl.includes('inv') || hl.includes('po') || hl.includes('voucher') || hl.includes('id')) newMapping.reference = h;
            else if (hl.includes('type') || hl.includes('class') || hl.includes('category')) newMapping.type = h;
          });

          setColumnMapping(newMapping);
          setToast({ message: `Loaded "${file.name}" with ${rawRows.length} transactions. Verify column mapping below!`, type: 'success' });
        } else {
          setToast({ message: "Loaded CSV file appears empty.", type: 'error' });
        }
      } catch (err) {
        console.error("FileReader failed for CSV:", err);
        setToast({ message: `Failed to parse file "${file.name}"`, type: 'error' });
      }
      return;
    }

    // BANK STATEMENT PARSING PROCESS
    if (activeImportTab === 'bank_statement') {
      const newBankRows: BankQueueItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isTextOrCsv = file.type === 'text/csv' || file.type === 'text/plain' || 
                            file.name.endsWith('.csv') || file.name.endsWith('.txt') || file.name.endsWith('.tsv');

        if (!isTextOrCsv) {
          setToast({ message: `Skipped non-text statement file "${file.name}". Please upload .csv, .txt, or .tsv files.`, type: 'error' });
          continue;
        }

        try {
          const text = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (err) => reject(err);
            reader.readAsText(file);
          });

          const lines = text.split(/\r?\n/);
          lines.forEach((line, index) => {
            const lowerLine = line.toLowerCase();
            // Skip headers
            if (!line.trim() || lowerLine.includes('date') || lowerLine.includes('description') || lowerLine.includes('amount')) {
              return;
            }

            // Split by tab, comma, or semicolon
            let cols = line.split('\t');
            if (cols.length < 2) cols = line.split(',');
            if (cols.length < 2) cols = line.split(';');

            if (cols.length >= 2) {
              const dateStr = cols[0]?.trim() || today;
              const desc = cols[1]?.trim() || `Statement Row #${index + 1} (${file.name})`;
              
              let amtStr = cols[2]?.trim() || '0';
              let isNegative = false;
              if (amtStr.startsWith('(') && amtStr.endsWith(')')) {
                isNegative = true;
                amtStr = amtStr.slice(1, -1);
              }
              amtStr = amtStr.replace(/[$\s,]/g, '');
              let parsedAmt = parseFloat(amtStr);
              if (isNaN(parsedAmt)) parsedAmt = 0;
              if (isNegative) parsedAmt = -parsedAmt;

              const ref = cols[3]?.trim() || `STMT-${Math.floor(1000 + Math.random() * 9000)}`;

              newBankRows.push({
                id: `stmt-uploaded-${Date.now()}-${index}-${Math.floor(Math.random() * 1000)}`,
                date: dateStr,
                description: desc,
                amount: parsedAmt,
                referenceNumber: ref,
              });
            }
          });
        } catch (err) {
          console.error("FileReader failed for bank statement:", err);
          setToast({ message: `Failed to read file "${file.name}"`, type: 'error' });
        }
      }

      if (newBankRows.length > 0) {
        setBankQueue(prev => [...prev, ...newBankRows]);
        setToast({ message: `Successfully loaded and parsed ${newBankRows.length} statement entries!`, type: 'success' });
      } else {
        setToast({ message: `No valid transaction lines detected in the file.`, type: 'error' });
      }
      return;
    }

    // INVOICE / RECEIPT IMAGES PARSING PROCESS
    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        setToast({ message: `Skipped non-image file "${file.name}"`, type: 'error' });
        continue;
      }

      try {
        const base64 = await fileToBase64(file);
        const itemSizeKB = Math.round(file.size / 1024);
        const fakeId = `batch-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const isSales = activeImportTab === 'sales';

        newItems.push({
          id: fakeId,
          fileName: file.name,
          fileSize: `${itemSizeKB} KB`,
          base64,
          status: 'queued',
          date: today,
          description: file.name.split('.')[0].replace(/[-_]/g, ' ') || (isSales ? 'Customer sales settlement' : 'Supplier stock intake'),
          type: isSales ? 'sales' : 'purchase',
          debitAccount: isSales ? 'Corporate Bank Account' : 'Purchase COGS Account',
          creditAccount: isSales ? 'Sales Revenue Account' : 'Corporate Bank Account',
          amount: 0.00,
          reference: `${isSales ? 'INV' : 'PO'}-${Math.floor(100000 + Math.random() * 900000)}`,
          documentType: activeImportTab
        });
      } catch (err) {
        console.error("FileReader failed:", err);
      }
    }

    if (newItems.length > 0) {
      setQueue(prev => [...prev, ...newItems]);
      setToast({ message: `Queued ${newItems.length} ${activeImportTab === 'sales' ? 'sales invoices' : 'purchase bills'} for AI parsing!`, type: 'info' });
      
      // Trigger processing in background
      setTimeout(() => {
        processAllQueuedItems(newItems);
      }, 300);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleFileSelectChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await addFilesToQueue(e.target.files);
    }
  };

  // Parse a single receipt via Express API backend 
  const parseSingleItem = async (item: BatchItem): Promise<BatchItem> => {
    const response = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: item.base64,
        fileName: item.fileName,
        documentType: item.documentType
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned error status: ${response.status}`);
    }

    const resJson = await response.json();
    if (!resJson.success || !resJson.data) {
      throw new Error(resJson.error || "Form parsing engine failed to return metadata.");
    }

    const { amount, description, date, type, debitAccount, creditAccount, reference } = resJson.data;

    // Direct mapping to valid client transaction formats helper
    let mappedType: TransactionType = item.documentType === 'sales' ? 'sales' : 'purchase';
    if (type) {
      const match = TRANSACTION_TYPES.find(t => t.value === type);
      if (match) mappedType = match.value;
      else if (type === 'expense') mappedType = 'other_expense';
      else if (type === 'receipt') mappedType = 'sales';
    }

    return {
      ...item,
      status: 'ready',
      amount: typeof amount === 'number' ? amount : parseFloat(amount) || 0.00,
      description: description || item.description,
      date: date || item.date,
      type: mappedType,
      debitAccount: STANDARD_ACCOUNTS.includes(debitAccount) ? debitAccount : (item.documentType === 'sales' ? 'Corporate Bank Account' : 'Purchase COGS Account'),
      creditAccount: STANDARD_ACCOUNTS.includes(creditAccount) ? creditAccount : (item.documentType === 'sales' ? 'Sales Revenue Account' : 'Corporate Bank Account'),
      reference: reference || item.reference
    };
  };

  // Sequentially or concurrently process all newly added files from the batch queue
  const processAllQueuedItems = async (itemsToProcess: BatchItem[]) => {
    const idsToProcess = itemsToProcess.map(it => it.id);
    setQueue(prev => prev.map(item => 
      idsToProcess.includes(item.id) ? { ...item, status: 'processing' } : item
    ));

    for (const targetItem of itemsToProcess) {
      try {
        const parsedResult = await parseSingleItem(targetItem);
        setQueue(prev => prev.map(item => item.id === targetItem.id ? parsedResult : item));
      } catch (err: any) {
        console.error(`Failed to process ${targetItem.fileName}:`, err);
        setQueue(prev => prev.map(item => 
          item.id === targetItem.id 
            ? { ...item, status: 'failed', error: err.message || 'Parser processing timeout' } 
            : item
        ));
      }
    }
  };

  // Re-trigger scanning for a single failed queue record
  const retryItem = async (itemId: string) => {
    setQueue(prev => prev.map(item => item.id === itemId ? { ...item, status: 'processing', error: undefined } : item));
    const targetItem = queue.find(item => item.id === itemId);
    if (!targetItem) return;

    try {
      const result = await parseSingleItem(targetItem);
      setQueue(prev => prev.map(item => item.id === itemId ? result : item));
    } catch (err: any) {
      setQueue(prev => prev.map(item => 
        item.id === itemId 
          ? { ...item, status: 'failed', error: err.message || 'Scanning failure' } 
          : item
      ));
    }
  };

  // Update a single item field inside the queue
  const updateItemField = (id: string, field: keyof BatchItem, value: any) => {
    setQueue(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Confirm a single item and write it directly to general ledger store
  const confirmSingleItem = (id: string) => {
    const item = queue.find(it => it.id === id);
    if (!item) return;

    if (item.amount <= 0 || isNaN(item.amount)) {
      alert("Invalid ledger transaction amount! Please correct the dollar figure before confirming.");
      return;
    }

    try {
      store.addLedgerTransaction({
        id: `tr-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        date: item.date,
        description: item.description,
        type: item.type as TransactionType,
        debitAccount: item.debitAccount,
        creditAccount: item.creditAccount,
        amount: item.amount,
        reference: item.reference,
        isBankCleared: true,
        attachmentUrl: item.base64
      });

      setQueue(prev => prev.map(it => it.id === id ? { ...it, status: 'confirmed' } : it));
      setToast({ message: `Voucher reference "${item.reference}" successfully added into general ledger!`, type: 'success' });
      store.triggerSync();
    } catch (error: any) {
      alert(`Ledger storage error: ${error.message}`);
    }
  };

  // Confirm ALL ready items in bulk
  const confirmAllReadyItems = () => {
    const activeQueue = queue.filter(item => item.documentType === (activeImportTab === 'sales' ? 'sales' : 'purchase') && item.status === 'ready');
    
    if (activeQueue.length === 0) {
      setToast({ message: "No parsed transactions are ready for bulk confirmation.", type: 'error' });
      return;
    }

    const invalidItems = activeQueue.filter(item => item.amount <= 0 || isNaN(item.amount));
    if (invalidItems.length > 0) {
      alert(`${invalidItems.length} transactions have an invalid zero value amount! Please inspect and enter valid amount cells.`);
      return;
    }

    let successCount = 0;
    activeQueue.forEach(item => {
      store.addLedgerTransaction({
        id: `tr-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        date: item.date,
        description: item.description,
        type: item.type as TransactionType,
        debitAccount: item.debitAccount,
        creditAccount: item.creditAccount,
        amount: item.amount,
        reference: item.reference,
        isBankCleared: true,
        attachmentUrl: item.base64
      });
      successCount++;
    });

    const activeIds = activeQueue.map(item => item.id);
    setQueue(prev => prev.map(item => 
      activeIds.includes(item.id) ? { ...item, status: 'confirmed' } : item
    ));

    setToast({ 
      message: `Successfully bulk-imported ${successCount} transactions into double-entry ledger!`, 
      type: 'success' 
    });
    store.triggerSync();
  };

  // Remove single item from list
  const removeItem = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  // Clear all completed/confirmed from list
  const clearCompleted = () => {
    const tabFilter = activeImportTab === 'sales' ? 'sales' : 'purchase';
    setQueue(prev => prev.filter(item => !(item.documentType === tabFilter && item.status === 'confirmed')));
    setToast({ message: "Cleared fully processed items from queue.", type: 'info' });
  };

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Bank Statement Queue Handlers
  const updateBankItemField = (id: string, field: keyof BankQueueItem, value: any) => {
    setBankQueue(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeBankItem = (id: string) => {
    setBankQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearBankQueue = () => {
    setBankQueue([]);
    setToast({ message: "Cleared bank statement queue.", type: 'info' });
  };

  const confirmAllBankStatements = () => {
    if (bankQueue.length === 0) return;
    
    // Structure items properly for import
    const formattedStatements = bankQueue.map(item => ({
      id: item.id,
      date: item.date,
      description: item.description,
      amount: item.amount,
      referenceNumber: item.referenceNumber
    }));

    store.importBankStatements(formattedStatements);
    setToast({ message: `Successfully loaded ${bankQueue.length} statements into the Bank Reconciliation system!`, type: 'success' });
    setBankQueue([]);
    store.triggerSync();
  };

  // CSV LEDGER MAPPED HANDLERS & EXECUTOR
  const handleMappingChange = (field: string, csvHeader: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: csvHeader }));
  };

  const handleDefaultValueChange = (field: string, value: string) => {
    setDefaultMappingValues(prev => ({ ...prev, [field]: value }));
  };

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Date,Description,Amount,Type,Debit Account,Credit Account,Reference,Cleared\n"
      + "2026-06-20,Office Stationery Expense,45.50,other_expense,Office Rent Expense,Corporate Cash Account,REF-9923,TRUE\n"
      + "2026-06-21,Client Software Consulting Invoice,1500.00,sales,Corporate Bank Account,Sales Revenue Account,INV-0012,TRUE\n"
      + "2026-06-22,Direct Warehousing COGS Stock,350.00,purchase,Purchase COGS Account,Corporate Bank Account,PO-4411,FALSE";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ledger_import_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setToast({ message: "Sample template CSV downloaded successfully!", type: 'success' });
  };

  const importMappedCsv = () => {
    if (!csvFile || csvRawRows.length === 0) {
      setToast({ message: "No CSV rows loaded.", type: 'error' });
      return;
    }

    if (!columnMapping.date) {
      alert("Please map the Transaction Date field.");
      return;
    }
    if (!columnMapping.description) {
      alert("Please map the Description/Narration field.");
      return;
    }
    if (!columnMapping.amount) {
      alert("Please map the Total Amount field.");
      return;
    }

    const dateIdx = csvHeaders.indexOf(columnMapping.date);
    const descIdx = csvHeaders.indexOf(columnMapping.description);
    const amountIdx = csvHeaders.indexOf(columnMapping.amount);
    
    const typeIdx = columnMapping.type ? csvHeaders.indexOf(columnMapping.type) : -1;
    const debitIdx = columnMapping.debitAccount ? csvHeaders.indexOf(columnMapping.debitAccount) : -1;
    const creditIdx = columnMapping.creditAccount ? csvHeaders.indexOf(columnMapping.creditAccount) : -1;
    const refIdx = columnMapping.reference ? csvHeaders.indexOf(columnMapping.reference) : -1;

    let importedCount = 0;
    let failedCount = 0;

    csvRawRows.forEach((row, idx) => {
      try {
        const rawDate = row[dateIdx]?.trim() || '';
        const rawDesc = row[descIdx]?.trim() || '';
        const rawAmount = row[amountIdx]?.trim() || '0';

        // Clean currency formats like $ or commas
        const cleanAmountStr = rawAmount.replace(/[$\s,()]/g, '');
        const parsedAmount = parseFloat(cleanAmountStr);

        if (!rawDate || !rawDesc || isNaN(parsedAmount)) {
          failedCount++;
          return;
        }

        // Parse custom transaction type
        let transactionType = defaultMappingValues.type as TransactionType;
        if (typeIdx !== -1 && row[typeIdx]) {
          const rawType = row[typeIdx].trim().toLowerCase();
          const matchedType = TRANSACTION_TYPES.find(t => 
            t.value === rawType || 
            t.value.replace('_', '') === rawType.replace('_', '') ||
            t.value.replace('_', ' ') === rawType
          );
          if (matchedType) {
            transactionType = matchedType.value;
          }
        }

        // Map Debit and Credit Accounts
        let debAcc = defaultMappingValues.debitAccount;
        if (debitIdx !== -1 && row[debitIdx]) {
          const rawDeb = row[debitIdx].trim();
          if (rawDeb) debAcc = rawDeb;
        }

        let credAcc = defaultMappingValues.creditAccount;
        if (creditIdx !== -1 && row[creditIdx]) {
          const rawCred = row[creditIdx].trim();
          if (rawCred) credAcc = rawCred;
        }

        // Map Reference code
        let ref = `CSV-IMP-${Math.floor(100000 + Math.random() * 900000)}`;
        if (refIdx !== -1 && row[refIdx]) {
          const rawRef = row[refIdx].trim();
          if (rawRef) ref = rawRef;
        }

        // Robust date parsing & standard formatting
        let finalDate = rawDate;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
          const parsedDate = new Date(finalDate);
          if (!isNaN(parsedDate.getTime())) {
            finalDate = parsedDate.toISOString().split('T')[0];
          } else {
            finalDate = new Date().toISOString().split('T')[0];
          }
        }

        store.addLedgerTransaction({
          id: `tr-csv-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          date: finalDate,
          description: rawDesc,
          type: transactionType,
          debitAccount: debAcc,
          creditAccount: credAcc,
          amount: parsedAmount,
          reference: ref,
          isBankCleared: defaultMappingValues.isBankCleared === 'true'
        });

        importedCount++;
      } catch (err) {
        console.error("Failed importing CSV ledger row:", err);
        failedCount++;
      }
    });

    if (importedCount > 0) {
      setToast({ 
        message: `Successfully bulk-uploaded ${importedCount} ledger entries! ${failedCount > 0 ? `(${failedCount} entries skipped/failed validation)` : ''}`, 
        type: 'success' 
      });
      // Clear file
      setCsvFile(null);
      setCsvHeaders([]);
      setCsvRawRows([]);
      store.triggerSync();
    } else {
      setToast({ message: "No valid transaction rows could be imported. Please review mapping.", type: 'error' });
    }
  };

  const getStatusBadgeClass = (status: BatchItem['status']) => {
    switch (status) {
      case 'queued':
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
      case 'processing':
        return 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/20';
      case 'ready':
        return 'bg-amber-950/40 text-amber-400 border border-amber-500/20';
      case 'failed':
        return 'bg-red-950/40 text-red-400 border border-red-500/20';
      case 'confirmed':
        return 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border border-zinc-700';
    }
  };

  const getStatusLabel = (status: BatchItem['status']) => {
    switch (status) {
      case 'queued': return 'Queued';
      case 'processing': return 'OCR Reading';
      case 'ready': return 'Unconfirmed';
      case 'failed': return 'OCR Failed';
      case 'confirmed': return 'Posted';
      default: return 'Pending';
    }
  };

  // Filter queue for current visible tab
  const activeDocFilter = activeImportTab === 'sales' ? 'sales' : 'purchase';
  const visibleInvoiceQueue = queue.filter(item => item.documentType === activeDocFilter);

  const stats = {
    total: visibleInvoiceQueue.length,
    processing: visibleInvoiceQueue.filter(it => it.status === 'processing').length,
    ready: visibleInvoiceQueue.filter(it => it.status === 'ready').length,
    failed: visibleInvoiceQueue.filter(it => it.status === 'failed').length,
    confirmed: visibleInvoiceQueue.filter(it => it.status === 'confirmed').length,
    totalDollarAmount: visibleInvoiceQueue.filter(it => it.status === 'ready').reduce((acc, it) => acc + it.amount, 0)
  };

  return (
    <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-lg space-y-6">
      
      {/* Header with Title and Unified Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-850 pb-4">
        <div>
          <h3 className="text-sm font-bold text-zinc-150 uppercase tracking-widest font-mono flex items-center gap-2">
            <Coins className="w-4 h-4 text-purple-400" />
            UNIVERSAL COMPLIANCE DOCUMENT IMPORTER
          </h3>
          <p className="text-xs text-zinc-455">
            Audit-ready batch processing of corporate sales invoices, purchase bills, bank statements, and CSV general ledgers.
          </p>
        </div>
        
        {/* Bulk Action Controls */}
        {activeImportTab !== 'bank_statement' && activeImportTab !== 'csv_ledger' && visibleInvoiceQueue.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stats.ready > 0 && (
              <button
                onClick={confirmAllReadyItems}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-950/10 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Bulk Confirm {stats.ready} Invoices (${stats.totalDollarAmount.toFixed(2)})
              </button>
            )}
            {stats.confirmed > 0 && (
              <button
                onClick={clearCompleted}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg transition-all cursor-pointer"
              >
                Clear Confirmed ({stats.confirmed})
              </button>
            )}
          </div>
        )}

        {activeImportTab === 'bank_statement' && bankQueue.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={confirmAllBankStatements}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-950/10 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Load {bankQueue.length} Statement Rows Into Feed
            </button>
            <button
              onClick={clearBankQueue}
              className="px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg transition-all cursor-pointer"
            >
              Clear Queue
            </button>
          </div>
        )}

        {activeImportTab === 'csv_ledger' && csvFile && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={importMappedCsv}
              disabled={!columnMapping.date || !columnMapping.description || !columnMapping.amount}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              Import {csvRawRows.length} Ledger Rows
            </button>
            <button
              onClick={() => {
                setCsvFile(null);
                setCsvHeaders([]);
                setCsvRawRows([]);
              }}
              className="px-3 py-2 bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-350 text-xs rounded-lg transition-all cursor-pointer"
            >
              Clear CSV
            </button>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1 p-1 bg-zinc-950 rounded-xl border border-zinc-850">
        <button
          onClick={() => { setActiveImportTab('purchase'); setExpandedId(null); }}
          className={`py-2 text-xs font-bold rounded-lg tracking-wider font-mono uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeImportTab === 'purchase'
              ? 'bg-zinc-850 text-purple-300 border border-zinc-700/60 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-purple-400" />
          <span>Purchase Bills</span>
        </button>

        <button
          onClick={() => { setActiveImportTab('sales'); setExpandedId(null); }}
          className={`py-2 text-xs font-bold rounded-lg tracking-wider font-mono uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeImportTab === 'sales'
              ? 'bg-zinc-850 text-blue-300 border border-zinc-700/60 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
          <span>Sales Invoices</span>
        </button>

        <button
          onClick={() => { setActiveImportTab('bank_statement'); setExpandedId(null); }}
          className={`py-2 text-xs font-bold rounded-lg tracking-wider font-mono uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeImportTab === 'bank_statement'
              ? 'bg-zinc-850 text-emerald-300 border border-zinc-700/60 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bank Statements</span>
        </button>

        <button
          onClick={() => { setActiveImportTab('csv_ledger'); setExpandedId(null); }}
          className={`py-2 text-xs font-bold rounded-lg tracking-wider font-mono uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeImportTab === 'csv_ledger'
              ? 'bg-zinc-850 text-amber-300 border border-zinc-700/60 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'
          }`}
        >
          <FileCode className="w-3.5 h-3.5 text-amber-400" />
          <span>Ledger CSV</span>
        </button>
      </div>

      {/* DRAG AND DROP BOUNDARY BOX ZONE */}
      {(!csvFile || activeImportTab !== 'csv_ledger') && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 relative overflow-hidden select-none ${
            isDragOver 
              ? 'border-indigo-500 bg-indigo-950/20 shadow-inner' 
              : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-950/80'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple={activeImportTab !== 'csv_ledger'}
            accept={activeImportTab === 'bank_statement' || activeImportTab === 'csv_ledger' ? '.csv,.txt,.tsv' : 'image/*'}
            className="hidden"
            onChange={handleFileSelectChange}
          />

          <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 shadow-md">
            <UploadCloud className={`w-7 h-7 text-zinc-350 ${isDragOver ? 'animate-bounce text-indigo-400' : ''}`} />
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-zinc-200 uppercase tracking-wider font-mono">
              {activeImportTab === 'bank_statement' 
                ? 'Drag & Drop Statement Sheet' 
                : activeImportTab === 'csv_ledger'
                  ? 'Drag & Drop Ledger CSV Sheet'
                  : `Drag & Drop ${activeImportTab === 'sales' ? 'Sales Invoices' : 'Purchase Bills'}`
              }
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
              {activeImportTab === 'bank_statement' || activeImportTab === 'csv_ledger'
                ? 'Supporting CSV, tab-delimited, and comma-separated text files. Or click to browse.'
                : 'Supporting JPG, JPEG, and PNG document screenshots. Or click to browse.'
              }
            </p>
          </div>

          {/* Floating AI Tag */}
          <span className="absolute top-3 right-3 text-[9px] bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 fill-purple-300 text-purple-300" /> 
            {activeImportTab === 'bank_statement' 
              ? 'Fast Row Splitter' 
              : activeImportTab === 'csv_ledger' 
                ? 'Interactive Column Mapper' 
                : 'Multimodal Gemini OCR'
            }
          </span>
        </div>
      )}

      {/* FEEDBACK INTEGRITY TOAST COMPONENT */}
      {toast && (
        <div className={`p-3 border rounded-xl flex items-center gap-2 text-xs font-medium font-sans shadow-md animate-fade-in ${
          toast.type === 'success' 
            ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300' 
            : toast.type === 'error' 
              ? 'bg-red-950/30 border-red-800/40 text-red-300' 
              : 'bg-indigo-950/30 border-indigo-800/40 text-indigo-300'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-indigo-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* RENDER CURRENT TAB ACTIVE VIEW QUEUE */}
      {activeImportTab === 'bank_statement' ? (
        // BANK STATEMENT QUEUE VIEW
        bankQueue.length > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between items-center font-mono text-[10px] text-zinc-400 uppercase font-bold border-b border-zinc-900 pb-2">
              <span>Parsed Statement Rows: <strong className="text-zinc-200">{bankQueue.length}</strong></span>
              <span className="text-emerald-400">Total volume loaded</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-850">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 border-b border-zinc-850 text-zinc-400 font-mono text-[10px]">
                    <th className="p-2.5">Date (YYYY-MM-DD)</th>
                    <th className="p-2.5">Description (Narration)</th>
                    <th className="p-2.5">Amount ($)</th>
                    <th className="p-2.5">Ref Reference Number</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 bg-zinc-950/35">
                  {bankQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-2">
                        <input
                          type="date"
                          value={item.date}
                          onChange={(e) => updateBankItemField(item.id, 'date', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1 px-2 focus:outline-none focus:border-emerald-500 text-zinc-300 font-mono text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateBankItemField(item.id, 'description', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1 px-2 focus:outline-none focus:border-emerald-500 text-zinc-200 text-xs"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <span className={item.amount >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {item.amount >= 0 ? <ArrowDownLeft className="w-3 h-3 inline" /> : <ArrowUpRight className="w-3 h-3 inline" />}
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.amount}
                            onChange={(e) => updateBankItemField(item.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 bg-zinc-900 border border-zinc-800 rounded-md py-1 px-2 focus:outline-none focus:border-emerald-500 text-zinc-100 font-mono text-xs font-bold text-right"
                          />
                        </div>
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.referenceNumber}
                          onChange={(e) => updateBankItemField(item.id, 'referenceNumber', e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-md py-1 px-2 focus:outline-none focus:border-emerald-500 text-zinc-300 font-mono text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeBankItem(item.id)}
                          className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <FileSpreadsheet className="w-6 h-6 text-zinc-600 mb-1" />
            <p className="text-[11px] font-mono uppercase tracking-wide">No Bank Statements Uploaded</p>
            <p className="text-[10px] max-w-xs text-zinc-600">
              Drop a bank statement file (CSV/TXT) to instantly extract transaction entries. You can verify and edit them directly here before loading them into the reconciliation tab.
            </p>
          </div>
        )
      ) : activeImportTab === 'csv_ledger' ? (
        // ==========================================
        // NEW ADVANCED LEDGER CSV COLUMN MAPPING INTERFACE
        // ==========================================
        csvFile ? (
          <div className="space-y-6 animate-fade-in">
            {/* Header / Meta bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 p-4 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-950/30 border border-amber-800/30 flex items-center justify-center">
                  <FileCode className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-zinc-100 font-mono uppercase tracking-wide">{csvFile.name}</h4>
                  <p className="text-[10px] text-zinc-450 font-mono">
                    Size: {Math.round(csvFile.size / 1024)} KB • Total Rows: {csvRawRows.length} Ledger Records Detected
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadSampleCsv}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 rounded-lg text-[11px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer border border-zinc-800"
                >
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
                <button
                  onClick={() => {
                    setCsvFile(null);
                    setCsvHeaders([]);
                    setCsvRawRows([]);
                  }}
                  className="px-3 py-1.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 rounded-lg text-[11px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer border border-red-900/30"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>

            {/* Column Mapping Panel Grid */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-zinc-900">
                <Table className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-widest">1. Map System Fields to CSV Columns</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. DATE FIELD */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Transaction Date <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.date}
                    onChange={(e) => handleMappingChange('date', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Date Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-[9px] text-zinc-500">Auto-detects ISO YYYY-MM-DD, MM/DD/YYYY, or other formats.</p>
                </div>

                {/* 2. DESCRIPTION FIELD */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Narration / Particulars <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.description}
                    onChange={(e) => handleMappingChange('description', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Description Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-[9px] text-zinc-500">Transaction description text mapped to standard Daybook logs.</p>
                </div>

                {/* 3. AMOUNT FIELD */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Transaction Amount ($) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={columnMapping.amount}
                    onChange={(e) => handleMappingChange('amount', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="">-- Select Amount Column --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-[9px] text-zinc-500">Decimal values. Cleans dollar signs and parentheses automatically.</p>
                </div>

                {/* 4. VOUCHER TYPE / CLASSIFICATION */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Voucher Type
                  </label>
                  <select
                    value={columnMapping.type}
                    onChange={(e) => handleMappingChange('type', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500 mb-1"
                  >
                    <option value="">[Use default fallback value]</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 block">Default Fallback Type:</span>
                    <select
                      value={defaultMappingValues.type}
                      onChange={(e) => handleDefaultValueChange('type', e.target.value)}
                      className="w-full text-[10px] bg-zinc-900 border border-zinc-800/80 rounded-md p-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                    >
                      {TRANSACTION_TYPES.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                    </select>
                  </div>
                </div>

                {/* 5. DEBIT ACCOUNT */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Debit Account (Dr.)
                  </label>
                  <select
                    value={columnMapping.debitAccount}
                    onChange={(e) => handleMappingChange('debitAccount', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500 mb-1"
                  >
                    <option value="">[Use default fallback value]</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 block">Default Fallback Debit Account:</span>
                    <select
                      value={defaultMappingValues.debitAccount}
                      onChange={(e) => handleDefaultValueChange('debitAccount', e.target.value)}
                      className="w-full text-[10px] bg-zinc-900 border border-zinc-800/80 rounded-md p-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                    >
                      {STANDARD_ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  </div>
                </div>

                {/* 6. CREDIT ACCOUNT */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                    Credit Account (Cr.)
                  </label>
                  <select
                    value={columnMapping.creditAccount}
                    onChange={(e) => handleMappingChange('creditAccount', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500 mb-1"
                  >
                    <option value="">[Use default fallback value]</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <div className="space-y-1">
                    <span className="text-[9px] text-zinc-500 block">Default Fallback Credit Account:</span>
                    <select
                      value={defaultMappingValues.creditAccount}
                      onChange={(e) => handleDefaultValueChange('creditAccount', e.target.value)}
                      className="w-full text-[10px] bg-zinc-900 border border-zinc-800/80 rounded-md p-1 text-zinc-300 focus:outline-none focus:border-amber-500"
                    >
                      {STANDARD_ACCOUNTS.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                    </select>
                  </div>
                </div>

                {/* 7. REFERENCE & STATUS */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-440 uppercase tracking-wider font-mono block">
                    Reference / Voucher #
                  </label>
                  <select
                    value={columnMapping.reference}
                    onChange={(e) => handleMappingChange('reference', e.target.value)}
                    className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 cursor-pointer focus:outline-none focus:border-amber-500"
                  >
                    <option value="">[Auto-generate Voucher Code]</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <p className="text-[9px] text-zinc-500">Maps custom tracking numbers or generates CSV-IMP identifiers.</p>
                </div>

                {/* 8. RECONCILED FEED STATUS */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3.5 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
                      Cleared / Reconciled
                    </span>
                    <label className="flex items-center gap-2 cursor-pointer pt-1 select-none">
                      <input
                        type="checkbox"
                        checked={defaultMappingValues.isBankCleared === 'true'}
                        onChange={(e) => handleDefaultValueChange('isBankCleared', e.target.checked ? 'true' : 'false')}
                        className="w-3.5 h-3.5 accent-amber-500 bg-zinc-900 border-zinc-800 rounded cursor-pointer"
                      />
                      <span className="text-[11px] text-zinc-300">Set all imported ledger rows as pre-cleared</span>
                    </label>
                  </div>
                  <p className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-900/50 mt-2">
                    Transactions will be loaded directly into the general ledger database.
                  </p>
                </div>

              </div>
            </div>

            {/* LIVE PREVIEW SECTION */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-1 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-widest">2. Mapping Preview (First 5 Rows)</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">Verify values before loading into database</span>
              </div>

              {columnMapping.date && columnMapping.description && columnMapping.amount ? (
                <div className="overflow-x-auto rounded-xl border border-zinc-850">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-850 text-zinc-400 font-mono text-[10px]">
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Voucher Type</th>
                        <th className="p-2.5">Narration / Description</th>
                        <th className="p-2.5">Debit (Dr.)</th>
                        <th className="p-2.5">Credit (Cr.)</th>
                        <th className="p-2.5 text-right">Amount ($)</th>
                        <th className="p-2.5">Ref No.</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 bg-zinc-950/20 font-mono">
                      {csvRawRows.slice(0, 5).map((row, rIdx) => {
                        const dateIdx = csvHeaders.indexOf(columnMapping.date);
                        const descIdx = csvHeaders.indexOf(columnMapping.description);
                        const amountIdx = csvHeaders.indexOf(columnMapping.amount);
                        
                        const typeIdx = columnMapping.type ? csvHeaders.indexOf(columnMapping.type) : -1;
                        const debitIdx = columnMapping.debitAccount ? csvHeaders.indexOf(columnMapping.debitAccount) : -1;
                        const creditIdx = columnMapping.creditAccount ? csvHeaders.indexOf(columnMapping.creditAccount) : -1;
                        const refIdx = columnMapping.reference ? csvHeaders.indexOf(columnMapping.reference) : -1;

                        const rawDate = row[dateIdx] || '[Missing Date]';
                        const rawDesc = row[descIdx] || '[Missing Description]';
                        const rawAmount = row[amountIdx] || '0';

                        // Check amount parse status
                        const cleanAmt = rawAmount.replace(/[$\s,()]/g, '');
                        const parsedAmt = parseFloat(cleanAmt);
                        const isValidAmount = !isNaN(parsedAmt) && parsedAmt > 0;

                        // Check date parse status
                        let finalDate = rawDate;
                        let isValidDate = true;
                        if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                          const parsedD = new Date(rawDate);
                          if (!isNaN(parsedD.getTime())) {
                            finalDate = parsedD.toISOString().split('T')[0];
                          } else {
                            finalDate = '[Invalid format]';
                            isValidDate = false;
                          }
                        }

                        // Determine Type
                        let rowType = defaultMappingValues.type;
                        if (typeIdx !== -1 && row[typeIdx]) {
                          const matched = TRANSACTION_TYPES.find(t => t.value === row[typeIdx].trim().toLowerCase() || t.value.replace('_', '') === row[typeIdx].trim().toLowerCase());
                          if (matched) rowType = matched.value;
                        }

                        // Debit/Credit Acc
                        const rowDebit = (debitIdx !== -1 && row[debitIdx]) ? row[debitIdx] : defaultMappingValues.debitAccount;
                        const rowCredit = (creditIdx !== -1 && row[creditIdx]) ? row[creditIdx] : defaultMappingValues.creditAccount;

                        // Ref
                        const rowRef = (refIdx !== -1 && row[refIdx]) ? row[refIdx] : 'AUTO-GEN';

                        const isRowValid = isValidAmount && isValidDate && rawDate && rawDesc;

                        return (
                          <tr key={rIdx} className="hover:bg-zinc-900/40 transition-colors text-[11px]">
                            <td className={`p-2.5 ${isValidDate ? 'text-zinc-300' : 'text-red-400 font-bold'}`}>{finalDate}</td>
                            <td className="p-2.5 text-zinc-400 capitalize">{rowType.replace('_', ' ')}</td>
                            <td className="p-2.5 text-zinc-200 truncate max-w-[150px]">{rawDesc}</td>
                            <td className="p-2.5 text-zinc-400 truncate max-w-[120px]">{rowDebit}</td>
                            <td className="p-2.5 text-zinc-400 truncate max-w-[120px]">{rowCredit}</td>
                            <td className={`p-2.5 text-right font-bold ${isValidAmount ? 'text-amber-400' : 'text-red-400'}`}>
                              ${isValidAmount ? parsedAmt.toFixed(2) : '0.00 (Err)'}
                            </td>
                            <td className="p-2.5 text-zinc-400">{rowRef}</td>
                            <td className="p-2.5 text-center">
                              {isRowValid ? (
                                <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Ready</span>
                              ) : (
                                <span className="text-[9px] bg-red-950 text-red-400 border border-red-900/40 px-1.5 py-0.5 rounded font-mono font-bold uppercase">Validation Error</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-center gap-2 text-zinc-500 text-xs italic">
                  <AlertCircle className="w-4 h-4 text-zinc-600" />
                  <span>Map Date, Description, and Amount columns above to see a live compliance preview.</span>
                </div>
              )}
            </div>

            {/* Complete upload trigger action */}
            <div className="pt-2 flex justify-end gap-3">
              <button
                onClick={importMappedCsv}
                disabled={!columnMapping.date || !columnMapping.description || !columnMapping.amount}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-950/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Proceed and Import {csvRawRows.length} Ledger Transactions
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <FileSpreadsheet className="w-6 h-6 text-amber-500/80 mb-1" />
            <p className="text-[11px] font-mono uppercase tracking-wide">No Ledger CSV Uploaded</p>
            <p className="text-[10px] max-w-xs text-zinc-600">
              Drag & Drop your Daybook / Ledger transaction CSV here. You will be able to map any column setup (e.g. date formats, account names, references) easily!
            </p>
            <button
              onClick={downloadSampleCsv}
              className="mt-3 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 text-[10px] font-bold font-mono uppercase rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" /> Download Sample CSV
            </button>
          </div>
        )
      ) : (
        // INVOICES (SALES & PURCHASE) QUEUE VIEW
        visibleInvoiceQueue.length > 0 ? (
          <div className="space-y-3">
            {/* Queue Statistics Headers */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 font-mono text-[10px] text-zinc-400 uppercase font-bold border-b border-zinc-900 pb-2">
              <span className="text-zinc-500">Queue items: <strong className="text-zinc-200">{stats.total}</strong></span>
              <span className="text-indigo-400">Processing: <strong className="text-indigo-350">{stats.processing}</strong></span>
              <span className="text-amber-400">Parsed: <strong className="text-amber-350">{stats.ready}</strong></span>
              <span className="text-red-400">Failed: <strong className="text-red-350">{stats.failed}</strong></span>
              <span className="text-emerald-400">Posted: <strong className="text-emerald-350">{stats.confirmed}</strong></span>
            </div>

            <div className="divide-y divide-zinc-900 space-y-2 pb-2">
              {visibleInvoiceQueue.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div 
                    key={item.id} 
                    className={`bg-zinc-950/40 rounded-xl border border-zinc-850/70 p-3 transition-all space-y-3 ${
                      item.status === 'confirmed' ? 'opacity-80 bg-zinc-950/10' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        {/* Image Thumbnail */}
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center shrink-0">
                          {item.base64 ? (
                            <img src={item.base64} alt="Invoice thumbnail" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="w-5 h-5 text-zinc-500" />
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-zinc-200 block truncate max-w-[200px] sm:max-w-xs">{item.fileName}</span>
                          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                            <span>{item.fileSize}</span>
                            <span>•</span>
                            <span className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold tracking-wider font-mono uppercase ${getStatusBadgeClass(item.status)}`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Operational controls */}
                      <div className="flex items-center gap-1.5 ml-auto">
                        {item.status === 'processing' && (
                          <span className="text-xs text-indigo-400 font-mono flex items-center gap-1 mr-2">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                            <span>Gemini AI extraction...</span>
                          </span>
                        )}

                        {item.status === 'failed' && (
                          <button
                            onClick={() => retryItem(item.id)}
                            className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-lg text-[10px] font-bold font-mono uppercase flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Retry
                          </button>
                        )}

                        {item.status === 'ready' && (
                          <button
                            onClick={() => confirmSingleItem(item.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold font-mono uppercase flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Check className="w-3 h-3" /> Post Voucher
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpand(item.id)}
                          disabled={item.status === 'processing' || item.status === 'confirmed'}
                          className="p-1.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 border border-zinc-850 rounded-lg text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 hover:bg-red-950/20 text-zinc-500 hover:text-red-400 rounded-lg text-xs transition-colors cursor-pointer"
                          title="Remove file from list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Processing error details line */}
                    {item.status === 'failed' && item.error && (
                      <div className="text-[10px] text-red-400 bg-red-950/10 border border-red-900/20 p-2 rounded-lg font-mono leading-relaxed">
                        Error: {item.error}
                      </div>
                    )}

                    {/* Expanded editable details section */}
                    {isExpanded && item.status !== 'processing' && item.status !== 'confirmed' && (
                      <div className="bg-zinc-950 border border-zinc-900 p-3.5 rounded-xl space-y-3.5 animate-fade-in text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Transaction Date */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Invoice Date</label>
                            <input
                              type="date"
                              value={item.date}
                              onChange={(e) => updateItemField(item.id, 'date', e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-zinc-200 font-mono"
                            />
                          </div>

                          {/* Amount */}
                          <div className="space-y-1.5 flex flex-col justify-end">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Invoice Total Amount ($)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateItemField(item.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-zinc-100 font-mono font-bold"
                            />
                          </div>

                          {/* Reference / Voucher ID */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Invoice # Reference</label>
                            <input
                              type="text"
                              value={item.reference}
                              onChange={(e) => updateItemField(item.id, 'reference', e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-zinc-200 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {/* Transaction classification type */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Accounting Classification</label>
                            <select
                              value={item.type}
                              onChange={(e) => updateItemField(item.id, 'type', e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-zinc-300 cursor-pointer focus:outline-none focus:border-indigo-500"
                            >
                              {TRANSACTION_TYPES.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                          </div>

                          {/* Debit Account */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Debit Account (Dr.)</label>
                            <select
                              value={item.debitAccount}
                              onChange={(e) => updateItemField(item.id, 'debitAccount', e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-zinc-300 cursor-pointer focus:outline-none focus:border-indigo-500"
                            >
                              {STANDARD_ACCOUNTS.map(acc => (
                                <option key={acc} value={acc}>{acc}</option>
                              ))}
                            </select>
                          </div>

                          {/* Credit Account */}
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Credit Account (Cr.)</label>
                            <select
                              value={item.creditAccount}
                              onChange={(e) => updateItemField(item.id, 'creditAccount', e.target.value)}
                              className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-zinc-300 cursor-pointer focus:outline-none focus:border-indigo-500"
                            >
                              {STANDARD_ACCOUNTS.map(acc => (
                                <option key={acc} value={acc}>{acc}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Narration Description */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Voucher Narrative / Narration</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                            placeholder="e.g., Sales contract payout, server storage invoice, supplier bill"
                            className="w-full text-xs bg-zinc-900 border border-zinc-800 rounded-lg py-1.5 px-3 focus:outline-none focus:border-indigo-500 text-zinc-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Empty Queue placeholder */
          <div className="py-8 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-xl flex flex-col items-center justify-center gap-1.5 text-center text-zinc-500">
            <p className="text-[11px] font-mono uppercase tracking-wide">No {activeImportTab === 'sales' ? 'Sales Invoices' : 'Purchase Bills'} Uploaded</p>
            <p className="text-[10px] max-w-xs text-zinc-600">
              Drag and drop {activeImportTab === 'sales' ? 'sales invoices' : 'purchase bills'} here. The Gemini parser will read and extract the date, total amount, narration, and map standard double-entry accounts instantly!
            </p>
          </div>
        )
      )}
    </div>
  );
};
