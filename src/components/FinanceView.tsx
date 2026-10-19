import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  DollarSign,
  Download,
  Search,
  Filter,
  CheckCircle2,
  PieChart,
  Calendar,
  Wallet,
} from 'lucide-react';
import {
  transactionsTable,
  exportTableToCsv,
} from '../services/storage.ts';
import {
  formatPhp,
} from '../utils/poultryMath.ts';
import type { FinanceTransaction, TransactionType } from '../types/index.ts';

export const FinanceView: React.FC = () => {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(transactionsTable.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Income' | 'Expense'>('All');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Add Transaction Form
  const [txType, setTxType] = useState<TransactionType>('Income');
  const [txCategory, setTxCategory] = useState<FinanceTransaction['category']>('Fertile Egg Sales');
  const [txDescription, setTxDescription] = useState('');
  const [txAmount, setTxAmount] = useState<number>(1500);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txPaymentMethod, setTxPaymentMethod] = useState('GCash');
  const [txRef, setTxRef] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txDescription.trim() || txAmount <= 0) return;

    transactionsTable.create({
      date: txDate,
      type: txType,
      category: txCategory,
      description: txDescription.trim(),
      amountPhp: Number(txAmount),
      paymentMethod: txPaymentMethod,
      referenceNo: txRef.trim() || undefined,
    });

    setTransactions(transactionsTable.getAll());
    setIsAddTxOpen(false);
    setTxDescription('');
    setTxRef('');
    showToast(`${txType} of ${formatPhp(txAmount)} recorded.`);
  };

  const handleDeleteTransaction = (id: string, desc: string) => {
    if (confirm(`Delete transaction "${desc}"?`)) {
      transactionsTable.delete(id);
      setTransactions(transactionsTable.getAll());
      showToast('Transaction deleted.');
    }
  };

  // Calculations
  const totalIncome = transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amountPhp, 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amountPhp, 0);

  const netProfit = totalIncome - totalExpense;
  const marginPercent = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0;

  // Filtered List
  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.referenceNo && t.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'All' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-5 animate-fadeIn">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-18 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white font-medium text-xs shadow-xl flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Farm Finance & Expense Ledger
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Cash flows in Philippine Peso (₱), feed mill expenses, electricity, and egg sale receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTableToCsv('transactions', 'legal-chicks-finance-ledger')}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsAddTxOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-zinc-400 text-xs uppercase font-semibold block">Total Revenue</span>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-400">
            {formatPhp(totalIncome)}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Fertile eggs, table eggs, DOC</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-zinc-400 text-xs uppercase font-semibold block">Total Farm Expenses</span>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-red-400">
            {formatPhp(totalExpense)}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Feed ingredients, power, vaccines</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-zinc-400 text-xs uppercase font-semibold block">Net Farm Profit</span>
          <div className={`mt-2 text-xl sm:text-2xl font-extrabold ${netProfit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
            {formatPhp(netProfit)}
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Current monthly operating balance</span>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
          <span className="text-zinc-400 text-xs uppercase font-semibold block">Net Profit Margin</span>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-purple-400">
            {marginPercent}%
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">Sustainable farm profitability</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transactions, reference numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {(['All', 'Income', 'Expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                typeFilter === t
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Transactions Ledger Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Type</th>
                <th className="p-3">Category</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Amount (₱)</th>
                <th className="p-3">Payment / Ref</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 text-zinc-200 bg-zinc-900/60">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-500">
                    No transactions match your search filter.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-800/50 transition">
                    <td className="p-3 font-mono text-zinc-300">{tx.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.type === 'Income'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {tx.type}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-white">{tx.category}</td>
                    <td className="p-3 text-zinc-300 max-w-sm truncate">{tx.description}</td>
                    <td className={`p-3 text-right font-mono font-bold text-sm ${
                      tx.type === 'Income' ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {tx.type === 'Income' ? '+' : '-'}{formatPhp(tx.amountPhp)}
                    </td>
                    <td className="p-3 text-zinc-400 text-[11px]">
                      {tx.paymentMethod} {tx.referenceNo && `(${tx.referenceNo})`}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id, tx.description)}
                        className="p-1 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Transaction */}
      {isAddTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Log Farm Income or Expense</span>
            </h3>

            <form onSubmit={handleAddTransaction} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('Income');
                    setTxCategory('Fertile Egg Sales');
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                    txType === 'Income'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  + Income (Sale)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType('Expense');
                    setTxCategory('Feed & Raw Materials');
                  }}
                  className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                    txType === 'Expense'
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  - Farm Expense
                </button>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Category</label>
                <select
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                >
                  {txType === 'Income' ? (
                    <>
                      <option value="Fertile Egg Sales">Fertile Egg Sales</option>
                      <option value="Day-Old Chick Sales">Day-Old Chick Sales</option>
                      <option value="Table Egg Sales">Table Egg Sales</option>
                      <option value="Cull Bird Sales">Cull Bird Sales</option>
                      <option value="Other Income">Other Farm Income</option>
                    </>
                  ) : (
                    <>
                      <option value="Feed & Raw Materials">Feed & Raw Materials</option>
                      <option value="Incubator Electricity">Incubator Electricity (CAGELCO II)</option>
                      <option value="Veterinary & Biosecurity">Veterinary & Biosecurity</option>
                      <option value="Farm Labor & Maintenance">Farm Labor & Maintenance</option>
                      <option value="Packaging & Delivery">Packaging & Delivery</option>
                      <option value="Other Expense">Other Expense</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100kg D1 Darak from Solana Rice Mill"
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Amount in PHP (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Payment Method</label>
                  <select
                    value={txPaymentMethod}
                    onChange={(e) => setTxPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Reference No (Optional)</label>
                  <input
                    type="text"
                    placeholder="OR# / GCash Ref"
                    value={txRef}
                    onChange={(e) => setTxRef(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddTxOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 font-bold rounded-lg shadow text-white ${
                    txType === 'Income' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
