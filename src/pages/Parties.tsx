import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { PartnerCapital } from '../types';
import { Plus, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { ClickablePath } from '../components/ClickablePath';

interface LocalSundryParty {
  id: string;
  name: string;
  group: 'debtor' | 'creditor';
  contactPerson: string;
  phone: string;
  email: string;
  gstIn?: string;
}

const DEFAULT_LOCAL_SUNDRIES: LocalSundryParty[] = [
  { id: 'sun-1', name: 'Aris Global Inc', group: 'debtor', contactPerson: 'John Doe', phone: '+1 (555) 432-8761', email: 'billing@arisglobal.com', gstIn: '27AAAAA1111A1Z1' },
  { id: 'sun-2', name: 'Nippon Steel Supplies', group: 'creditor', contactPerson: 'Kenji Sato', phone: '+81 (3) 1234-5678', email: 'procurement@nipponsteel.jp', gstIn: '27BBBBB2222B2Z2' },
  { id: 'sun-3', name: 'Gatwick Handling Corp', group: 'debtor', contactPerson: 'Sarah Jenkins', phone: '+44 (20) 7946-0192', email: 'ops@gatwickhandling.co.uk' },
];

const Parties: React.FC = () => {
  const store = useStore();
  const { db, triggerSync, formatMoney, companySettings } = store;

  const [activeTab, setActiveTab] = useState<'sundry' | 'partners'>('sundry');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [sundries, setSundries] = useState<LocalSundryParty[]>(() => {
    const saved = localStorage.getItem('tunzua_sundry_parties');
    try {
      return saved ? JSON.parse(saved) : DEFAULT_LOCAL_SUNDRIES;
    } catch {
      return DEFAULT_LOCAL_SUNDRIES;
    }
  });

  useEffect(() => {
    localStorage.setItem('tunzua_sundry_parties', JSON.stringify(sundries));
  }, [sundries]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [partyName, setPartyName] = useState('');
  const [partyGroup, setPartyGroup] = useState<'debtor' | 'creditor'>('debtor');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gstIn, setGstIn] = useState('');

  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [profitShare, setProfitShare] = useState('50');
  const [initialCapital, setInitialCapital] = useState('10000');

  const filteredSundries = sundries.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.contactPerson.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const filteredPartners = db.partners.filter(p => {
    if (!searchQuery.trim()) return true;
    return p.partnerName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleAddSundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim() || !contactPerson.trim()) {
      toast.error('Please enter both a business name and contact person.');
      return;
    }
    const newParty: LocalSundryParty = {
      id: `sun-${Date.now()}`,
      name: partyName.trim(),
      group: partyGroup,
      contactPerson: contactPerson.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstIn: gstIn.trim() || undefined,
    };
    setSundries([newParty, ...sundries]);
    toast.success(`${partyGroup === 'debtor' ? 'Customer' : 'Vendor'} added.`);
    setShowAddModal(false);
    setPartyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setGstIn('');
  };

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      toast.error('Please enter a partner name.');
      return;
    }
    const share = parseFloat(profitShare);
    const capital = parseFloat(initialCapital);
    if (isNaN(share) || share < 0 || share > 100) {
      toast.error('Profit share must be between 0% and 100%.');
      return;
    }
    const newPartner: PartnerCapital = {
      id: `partner-${Date.now()}`,
      partnerName: partnerName.trim(),
      contributions: isNaN(capital) ? 0 : capital,
      withdrawals: 0,
      profitSharePercentage: share,
      balance: isNaN(capital) ? 0 : capital,
    };
    store.db.partners = [newPartner, ...store.db.partners];
    triggerSync();
    toast.success('Partner added to capital register.');
    setShowPartnerModal(false);
    setPartnerName('');
    setProfitShare('50');
    setInitialCapital('10000');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#E5E0D5]">
        <div>
          <ClickablePath variant="page" />
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1F1D1A] tracking-tight">
            Sundry Parties & Partners
          </h1>
          <p className="text-sm text-[#6B655C] mt-1">
            Directory of customers, vendors, and partner equity capital accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#F2EFE9] border border-[#E5E0D5] p-1 rounded-lg flex">
            <button
              type="button"
              onClick={() => setActiveTab('sundry')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'sundry'
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              Sundry Directory
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('partners')}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'partners'
                  ? 'bg-[#FFFDF9] text-[#1B4D3E] font-semibold border border-[#D5CEBF]'
                  : 'text-[#6B655C] hover:text-[#1F1D1A]'
              }`}
            >
              Partner Capital
            </button>
          </div>

          <button
            type="button"
            onClick={() => (activeTab === 'sundry' ? setShowAddModal(true) : setShowPartnerModal(true))}
            className="px-4 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            {activeTab === 'sundry' ? 'Add Party' : 'Add Partner'}
          </button>
        </div>
      </div>

      {activeTab === 'sundry' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="text-xs text-[#6B655C]">Debtors (Customers)</div>
            <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
              {sundries.filter(s => s.group === 'debtor').length}
            </div>
          </div>
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="text-xs text-[#6B655C]">Creditors (Vendors)</div>
            <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
              {sundries.filter(s => s.group === 'creditor').length}
            </div>
          </div>
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="text-xs text-[#6B655C]">Tax IDs on File</div>
            <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
              {sundries.filter(s => s.gstIn).length}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="text-xs text-[#6B655C]">Registered Partners</div>
            <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#1F1D1A]">
              {db.partners.length}
            </div>
          </div>
          <div className="bg-[#FFFDF9] p-5 rounded-xl border border-[#E5E0D5]">
            <div className="text-xs text-[#6B655C]">Total Partner Equity</div>
            <div className="mt-2 font-mono tabular-nums text-2xl font-semibold text-[#157347]">
              {formatMoney(db.partners.reduce((sum, p) => sum + p.balance, 0))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#FFFDF9] rounded-xl border border-[#E5E0D5] overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E0D5] bg-[#F8F6F1]/80 flex items-center gap-2.5">
          <Search className="w-3.5 h-3.5 text-[#968E82] shrink-0" />
          <input
            type="text"
            placeholder="Search directory by name, contact, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs text-[#1F1D1A] placeholder:text-[#968E82] focus:outline-none"
          />
        </div>

        {activeTab === 'sundry' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Business Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Tax ID</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D5] text-[#1F1D1A]">
                {filteredSundries.map(s => (
                  <tr key={s.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-medium whitespace-nowrap">
                      <span className={s.group === 'debtor' ? 'text-[#157347]' : 'text-[#B45309]'}>
                        {s.group === 'debtor' ? 'Customer' : 'Vendor'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#1F1D1A]">{s.name}</td>
                    <td className="py-3.5 px-4 text-xs text-[#6B655C]">{s.contactPerson}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6B655C]">{s.phone || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6B655C]">{s.email || '—'}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-[#6B655C]">{s.gstIn || '—'}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {confirmDeleteId === s.id ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSundries(sundries.filter(item => item.id !== s.id));
                              setConfirmDeleteId(null);
                              toast.success('Party removed.');
                            }}
                            className="px-2 py-1 bg-[#B91C1C] text-white text-xs font-medium rounded-md cursor-pointer"
                          >
                            Remove
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-xs text-[#6B655C] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="p-1.5 text-[#6B655C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E5E0D5] bg-[#F8F6F1] text-xs font-medium text-[#6B655C]">
                  <th className="py-3 px-4">Partner Name</th>
                  <th className="py-3 px-4 text-right">Contributions</th>
                  <th className="py-3 px-4 text-right">Withdrawals</th>
                  <th className="py-3 px-4 text-right">Profit Share</th>
                  <th className="py-3 px-4 text-right">Equity Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E0D5] font-mono tabular-nums text-xs text-[#1F1D1A]">
                {filteredPartners.map(p => (
                  <tr key={p.id} className="hover:bg-[#F8F6F1]/60 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-semibold text-sm text-[#1F1D1A]">
                      {p.partnerName}
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#157347]">{formatMoney(p.contributions)}</td>
                    <td className="py-3.5 px-4 text-right text-[#B91C1C]">{formatMoney(p.withdrawals)}</td>
                    <td className="py-3.5 px-4 text-right text-[#6B655C]">{p.profitSharePercentage}%</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-[#1F1D1A]">
                      {formatMoney(p.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Party Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#FFFDF9] border border-[#E5E0D5] max-w-lg w-full rounded-xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex justify-between items-center bg-[#F8F6F1]">
              <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">Add Sundry Party</h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddSundry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Type</label>
                  <select
                    value={partyGroup}
                    onChange={e => setPartyGroup(e.target.value as 'debtor' | 'creditor')}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  >
                    <option value="debtor">Customer (Debtor)</option>
                    <option value="creditor">Vendor (Creditor)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Business Name</label>
                  <input
                    type="text"
                    required
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    placeholder="e.g. Acme Studio"
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Contact Person</label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={e => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Tax ID (Optional)</label>
                <input
                  type="text"
                  value={gstIn}
                  onChange={e => setGstIn(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>
              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6B655C] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Save Party
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Partner Modal */}
      {showPartnerModal && (
        <div
          className="fixed inset-0 bg-[#1F1D1A]/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4"
          onClick={() => setShowPartnerModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-[#FFFDF9] border border-[#E5E0D5] max-w-lg w-full rounded-xl shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E5E0D5] flex justify-between items-center bg-[#F8F6F1]">
              <h2 className="font-display text-lg font-semibold text-[#1F1D1A]">Add Partner</h2>
              <button
                type="button"
                onClick={() => setShowPartnerModal(false)}
                className="p-1.5 text-[#6B655C] hover:text-[#1F1D1A] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddPartner} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Partner Name</label>
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={e => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">Profit Share (%)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={profitShare}
                    onChange={e => setProfitShare(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#6B655C] mb-1.5">
                    Initial Capital ({companySettings.currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    value={initialCapital}
                    onChange={e => setInitialCapital(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F8F6F1] border border-[#E5E0D5] rounded-lg text-sm font-mono tabular-nums text-[#1F1D1A] focus:outline-none focus:border-[#1B4D3E]"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-[#E5E0D5] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPartnerModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#6B655C] rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1B4D3E] hover:bg-[#143B2F] text-[#FFFDF9] font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Save Partner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parties;
