/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useStore } from '../store';
import { Package, AlertTriangle, Plus, Minus, FilePlus, ChevronRight, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';

export const InventoryModule: React.FC = () => {
  const store = useStore();
  const [activeFormTab, setActiveFormTab] = useState<'sales' | 'purchase' | 'manual'>('sales');

  // Sales form inputs
  const [salesSku, setSalesSku] = useState('');
  const [salesQty, setSalesQty] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [salesPartner, setSalesPartner] = useState('');

  // Purchase form inputs
  const [purchSku, setPurchSku] = useState('');
  const [purchQty, setPurchQty] = useState('');
  const [purchPrice, setPurchPrice] = useState('');
  const [purchPartner, setPurchPartner] = useState('');

  // Manual addition inputs
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [salesP, setSalesP] = useState('');
  const [purchP, setPurchP] = useState('');
  const [threshold, setThreshold] = useState('3');
  const [category, setCategory] = useState('Hardware');

  // Selected item sync behavior
  const handleSalesSkuChange = (skuVal: string) => {
    setSalesSku(skuVal);
    const item = store.db.inventory.find(i => i.sku === skuVal);
    if (item) {
      setSalesPrice(item.salesPrice.toString());
    }
  };

  const handlePurchSkuChange = (skuVal: string) => {
    setPurchSku(skuVal);
    const item = store.db.inventory.find(i => i.sku === skuVal);
    if (item) {
      setPurchPrice(item.purchasePrice.toString());
    }
  };

  const handleSalesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!salesSku || !salesQty || !salesPrice) return;

    store.recordInventoryTransaction(
      salesSku,
      'sales',
      parseInt(salesQty),
      parseFloat(salesPrice),
      salesPartner || "Retail Invoice Solution"
    );

    setSalesQty('');
    setSalesPartner('');
    store.triggerSync();
  };

  const handlePurchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchSku || !purchQty || !purchPrice) return;

    store.recordInventoryTransaction(
      purchSku,
      'purchase',
      parseInt(purchQty),
      parseFloat(purchPrice),
      purchPartner || "Supplier Vendor distributor"
    );

    setPurchQty('');
    setPurchPartner('');
    store.triggerSync();
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku || !name || !qty || !salesP || !purchP) return;

    store.addInventoryItem({
      id: `inv-${Date.now()}`,
      sku: sku.toUpperCase(),
      name,
      quantity: parseInt(qty),
      lowStockThreshold: parseInt(threshold) || 3,
      salesPrice: parseFloat(salesP),
      purchasePrice: parseFloat(purchP),
      category,
    });

    setSku('');
    setName('');
    setQty('');
    setSalesP('');
    setPurchP('');
    setThreshold('3');
    store.triggerSync();
  };

  // Compile low stock warnings counts
  const lowStockProducts = store.db.inventory.filter(i => i.quantity <= i.lowStockThreshold);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

      {/* Catalog logs & Alerts */}
      <div className="xl:col-span-2 bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 tracking-wide">OPERATING PRODUCT SPECIFICATIONS CATALOG</h3>
            <p className="text-xs text-zinc-455">Real-time counts, prices, and automated warehouse thresholds alerts.</p>
          </div>
          {lowStockProducts.length > 0 && (
            <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{lowStockProducts.length} low Stock Warns</span>
            </div>
          )}
        </div>

        {/* Stock status display charts widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {store.db.inventory.map(item => {
            const isLow = item.quantity <= item.lowStockThreshold;
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-205 ${
                  isLow
                    ? 'bg-red-950/10 border-red-900/40 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
                    : 'bg-zinc-950 border-zinc-850'
                }`}
              >
                {isLow && (
                  <div className="absolute right-3.5 top-3.5">
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-550">{item.sku}</span>
                    <h4 className="font-semibold text-zinc-150 text-xs mt-0.5">{item.name}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-mono text-zinc-400">
                  <div className="bg-zinc-900/60 p-2 rounded">
                    <span className="text-zinc-550 uppercase">Stock Level</span>
                    <div className={`text-sm font-bold ${isLow ? 'text-red-400' : 'text-emerald-400'}`}>
                      {item.quantity} units
                    </div>
                  </div>
                  <div className="bg-zinc-900/60 p-2 rounded">
                    <span className="text-zinc-550 uppercase">Sales Price</span>
                    <div className="text-sm font-semibold text-zinc-250">${item.salesPrice}</div>
                  </div>
                  <div className="bg-zinc-900/60 p-2 rounded">
                    <span className="text-zinc-550 uppercase">Purchase Price</span>
                    <div className="text-sm font-semibold text-zinc-250">${item.purchasePrice}</div>
                  </div>
                </div>

                {isLow && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-red-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    Warning: Stock levels dropped below threshold warning ({item.lowStockThreshold})!
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Forms column */}
      <div className="bg-[#121214] border border-zinc-850 rounded-2xl p-5 shadow-sm h-fit space-y-4">
        
        {/* Sub tabs */}
        <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-900">
          <button
            onClick={() => setActiveFormTab('sales')}
            className={`flex-1 py-1.5 text-center text-xs rounded-md transition-all font-medium ${
              activeFormTab === 'sales' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Invoice Sales
          </button>
          <button
            onClick={() => setActiveFormTab('purchase')}
            className={`flex-1 py-1.5 text-center text-xs rounded-md transition-all font-medium ${
              activeFormTab === 'purchase' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            PO Acquiring
          </button>
          <button
            onClick={() => setActiveFormTab('manual')}
            className={`flex-1 py-1.5 text-center text-xs rounded-md transition-all font-medium ${
              activeFormTab === 'manual' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Add SKU
          </button>
        </div>

        {/* 1. SALES FORM */}
        {activeFormTab === 'sales' && (
          <form onSubmit={handleSalesSubmit} className="space-y-4">
            <h4 className="text-xs uppercase font-semibold font-mono tracking-wider text-zinc-350">Log Client Sales Invoice</h4>
            
            <div>
              <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Target Product SKU</label>
              <select
                required
                value={salesSku}
                onChange={e => handleSalesSkuChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-250 focus:outline-none"
              >
                <option value="">-- Choose Stock SKU --</option>
                {store.db.inventory.map(item => (
                  <option key={item.id} value={item.sku} disabled={item.quantity <= 0}>
                    {item.name} ({item.quantity} available)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={salesQty}
                  onChange={e => setSalesQty(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Unit Price ($)</label>
                <input
                  type="number"
                  required
                  value={salesPrice}
                  onChange={e => setSalesPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Client Business Narrative</label>
              <input
                type="text"
                value={salesPartner}
                onChange={e => setSalesPartner(e.target.value)}
                placeholder="e.g. Acme Tech Solutions LLC"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-zinc-100 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Log Outgoing Sales & Journals
            </button>
          </form>
        )}

        {/* 2. PURCHASE FORM */}
        {activeFormTab === 'purchase' && (
          <form onSubmit={handlePurchSubmit} className="space-y-4">
            <h4 className="text-xs uppercase font-semibold font-mono tracking-wider text-zinc-350">Log Supplier Purchase PO</h4>
            
            <div>
              <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Select SKU</label>
              <select
                required
                value={purchSku}
                onChange={e => handlePurchSkuChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-250 focus:outline-none"
              >
                <option value="">-- Choose Stock SKU --</option>
                {store.db.inventory.map(item => (
                  <option key={item.id} value={item.sku}>
                    {item.sku} - {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Refilling units</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={purchQty}
                  onChange={e => setPurchQty(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Acq. Cost ($)</label>
                <input
                  type="number"
                  required
                  value={purchPrice}
                  onChange={e => setPurchPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Supplier Vendor</label>
              <input
                type="text"
                value={purchPartner}
                onChange={e => setPurchPartner(e.target.value)}
                placeholder="e.g. Shenzhen Supply Distributors"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 transition-colors text-zinc-100 text-xs font-semibold rounded-lg flex items-center justify-center gap-1"
            >
              <FilePlus className="w-4 h-4" />
              Commit purchase & inventory Ledger
            </button>
          </form>
        )}

        {/* 3. ADD NEW SKU ITEM */}
        {activeFormTab === 'manual' && (
          <form onSubmit={handleAddNewItem} className="space-y-4">
            <h4 className="text-xs uppercase font-semibold font-mono tracking-wider text-zinc-350">Register New Inventory Catalog SKU</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Unique SKU Code</label>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={e => setSku(e.target.value)}
                  placeholder="e.g. SAM-UHD-49"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 uppercase font-mono focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Warehouse Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="Hardware">Hardware Parts</option>
                  <option value="Furniture">Office Furniture</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Services">Consulting Dev Services</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Product Description</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Samsung Curved Super Ultra Wide Screen"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-150 focus:outline-none font-sans"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Default Purchase Cost</label>
                <input
                  type="number"
                  required
                  value={purchP}
                  onChange={e => setPurchP(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Default Sales Price</label>
                <input
                  type="number"
                  required
                  value={salesP}
                  onChange={e => setSalesP(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Acquired Initial Qty</label>
                <input
                  type="number"
                  required
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  placeholder="0"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] text-zinc-400 font-mono uppercase mb-1">Low Stock Limit Alert</label>
                <input
                  type="number"
                  required
                  value={threshold}
                  onChange={e => setThreshold(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md p-2 text-xs text-zinc-200 focus:outline-none font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-colors text-zinc-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5"
            >
              <Package className="w-4 h-4" />
              Register SKU Catalog Item
            </button>
          </form>
        )}

      </div>

    </div>
  );
};
