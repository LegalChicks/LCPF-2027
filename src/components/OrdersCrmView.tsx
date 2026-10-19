import React, { useState } from 'react';
import {
  ShoppingBag,
  Plus,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  Share2,
  CheckCircle2,
  MapPin,
  Phone,
  Calendar,
  Sparkles,
  Download,
} from 'lucide-react';
import {
  ordersTable,
  exportTableToCsv,
} from '../services/storage.ts';
import {
  calculateBulkEggPrice,
  formatPhp,
  generateMessengerReceipt,
} from '../utils/poultryMath.ts';
import type { FertileEggOrder, PoultryBreed, OrderStatus, OrderItemType } from '../types/index.ts';

export const OrdersCrmView: React.FC = () => {
  const [orders, setOrders] = useState<FertileEggOrder[]>(ordersTable.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState('Centro Solana, Cagayan');
  const [breed, setBreed] = useState<PoultryBreed>('Rhode Island Red');
  const [itemType, setItemType] = useState<OrderItemType>('Fertile Hatching Eggs');
  const [quantity, setQuantity] = useState<number>(60);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Cash on Pickup' | 'Bank Transfer (BDO/BPI)' | 'COD'>('GCash');
  const [dateReserved, setDateReserved] = useState(new Date().toISOString().split('T')[0]);
  const [targetDispatchDate, setTargetDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleCopyReceipt = (order: FertileEggOrder) => {
    const text = generateMessengerReceipt(order);
    navigator.clipboard.writeText(text);
    setCopiedOrderId(order.id);
    showToast(`Messenger receipt for ${order.orderNumber} copied to clipboard!`);
    setTimeout(() => setCopiedOrderId(null), 3000);
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    ordersTable.update(orderId, { status: newStatus });
    setOrders(ordersTable.getAll());
    showToast(`Order marked as ${newStatus}`);
  };

  const handleDeleteOrder = (orderId: string, orderNum: string) => {
    if (confirm(`Delete order ${orderNum}?`)) {
      ordersTable.delete(orderId);
      setOrders(ordersTable.getAll());
      showToast(`Order ${orderNum} deleted.`);
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactNumber.trim()) return;

    const pricing = calculateBulkEggPrice(breed, quantity);
    const packagingFee = quantity >= 60 ? 60 : quantity >= 30 ? 40 : 20;
    const orderNumber = `LC-ORD-2026-0${orders.length + 107}`;

    ordersTable.create({
      orderNumber,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      location: location.trim(),
      breed,
      itemType,
      quantity: Number(quantity),
      unitBasePricePhp: pricing.unitBasePricePhp,
      bulkDiscountPercent: pricing.bulkDiscountPercent,
      discountAmountPhp: pricing.discountAmountPhp,
      packagingFeePhp: packagingFee,
      totalAmountPhp: pricing.totalAmountPhp + packagingFee,
      paymentMethod,
      status: 'Reserved',
      dateReserved,
      targetDispatchDate,
      notes: orderNotes.trim(),
    });

    setOrders(ordersTable.getAll());
    setIsNewOrderOpen(false);
    showToast(`Order ${orderNumber} created for ${customerName}!`);
  };

  const pricingPreview = calculateBulkEggPrice(breed, quantity);
  const packagingPreview = quantity >= 60 ? 60 : quantity >= 30 ? 40 : 20;

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.contactNumber.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
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
            Fertile Egg Orders & Bulk Discount CRM
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Tiered volume discounts (30+, 60+, 100+ eggs), status tracking, and 1-click Facebook Messenger receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTableToCsv('orders', 'legal-chicks-fertile-egg-orders')}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setIsNewOrderOpen(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Order</span>
          </button>
        </div>
      </div>

      {/* Bulk Discount Tiers Explainer Card */}
      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">RETAIL (1 - 29 EGGS)</span>
          <strong className="text-white text-xs block mt-0.5">Regular Price</strong>
          <span className="text-[10px] text-zinc-400">RIR ₱45 • Australorp ₱65</span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-amber-900/60">
          <span className="text-amber-400 text-[10px] font-bold block">STARTER (30 - 59 EGGS)</span>
          <strong className="text-amber-300 text-xs block mt-0.5">5% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">RIR ₱42.75 • Australorp ₱61.75</span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-emerald-900/60">
          <span className="text-emerald-400 text-[10px] font-bold block">BREEDER (60 - 99 EGGS)</span>
          <strong className="text-emerald-300 text-xs block mt-0.5">10% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">RIR ₱40.50 • Australorp ₱58.50</span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-purple-900/60">
          <span className="text-purple-400 text-[10px] font-bold block">COMMERCIAL (100+ EGGS)</span>
          <strong className="text-purple-300 text-xs block mt-0.5">15% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">RIR ₱38.25 • Australorp ₱55.25</span>
        </div>
      </div>

      {/* Search and Status Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by customer, phone, location, order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
          {(['All', 'Reserved', 'Paid', 'Dispatched', 'Cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List Cards */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-500 text-xs">
            No customer orders found matching your search.
          </div>
        ) : (
          filteredOrders.map((order) => {
            return (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition space-y-3"
              >
                {/* Top Row: Order ID, Status, Customer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-amber-400 text-sm">
                      {order.orderNumber}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      order.status === 'Paid'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : order.status === 'Dispatched'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : order.status === 'Reserved'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-red-950 text-red-300 border border-red-800'
                    }`}>
                      {order.status}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      Reserved: {order.dateReserved}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    {/* Copy Messenger Button */}
                    <button
                      onClick={() => handleCopyReceipt(order)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        copiedOrderId === order.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white shadow'
                      }`}
                      title="Copy formatted receipt text for Facebook Messenger"
                    >
                      {copiedOrderId === order.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Copy for Messenger</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                      className="p-1.5 text-zinc-500 hover:text-red-400 transition cursor-pointer"
                      title="Delete order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Main Order Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Customer Info */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <strong className="text-white text-sm block">{order.customerName}</strong>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{order.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{order.location}</span>
                    </div>
                  </div>

                  {/* Item & Bulk Tier */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{order.itemType}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        order.breed === 'Rhode Island Red'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}>
                        {order.breed}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {order.quantity} pcs @ {formatPhp(order.unitBasePricePhp)}
                    </p>
                    {order.bulkDiscountPercent > 0 ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {order.bulkDiscountPercent}% Bulk Discount (-{formatPhp(order.discountAmountPhp)})
                      </span>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Retail Tier (0% discount)</span>
                    )}
                  </div>

                  {/* Payment & Status Workflow */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-zinc-400 text-[11px]">Total Amount</span>
                        <strong className="text-base text-amber-400 font-extrabold">
                          {formatPhp(order.totalAmountPhp)}
                        </strong>
                      </div>
                      <span className="text-[11px] text-zinc-400 block">
                        Payment: <strong>{order.paymentMethod}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-850">
                      <button
                        onClick={() => handleStatusChange(order.id, 'Paid')}
                        className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          order.status === 'Paid'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Mark Paid
                      </button>
                      <button
                        onClick={() => handleStatusChange(order.id, 'Dispatched')}
                        className={`flex-1 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                          order.status === 'Dispatched'
                            ? 'bg-blue-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        Mark Dispatched
                      </button>
                    </div>
                  </div>
                </div>

                {order.notes && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Note: {order.notes}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: New Order Form */}
      {isNewOrderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span>Create Fertile Egg Customer Order</span>
            </h3>
            <p className="text-xs text-zinc-400 mb-4">
              Automatic bulk discount calculations and Messenger receipt generation
            </p>

            <form onSubmit={handleCreateOrder} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Customer Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Atty. Ronald Taguibao"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="0917-xxx-xxxx"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Customer Barangay / Municipality</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Centro Solana, Tuguegarao, Enrile, Piat"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Breed Selection</label>
                  <select
                    value={breed}
                    onChange={(e) => setBreed(e.target.value as PoultryBreed)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Rhode Island Red">Rhode Island Red (Base ₱45)</option>
                    <option value="Black Australorp">Black Australorp (Base ₱65)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Product Type</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value as OrderItemType)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Fertile Hatching Eggs">Fertile Hatching Eggs</option>
                    <option value="Day-Old Chicks (DOC)">Day-Old Chicks (DOC)</option>
                    <option value="Ready-to-Lay Pullets">Ready-to-Lay Pullets</option>
                    <option value="Table Fresh Eggs">Table Fresh Eggs</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Quantity (pcs)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold text-sm"
                  />
                  {[30, 60, 100].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold"
                    >
                      {q} pcs
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Bulk Discount Breakdown Box */}
              <div className="p-3.5 bg-zinc-950 border border-amber-900/60 rounded-xl space-y-1.5 text-xs text-zinc-300">
                <div className="flex justify-between">
                  <span>Applied Pricing Tier:</span>
                  <strong className="text-amber-400">{pricingPreview.tierName}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal ({quantity} pcs @ {formatPhp(pricingPreview.unitBasePricePhp)}):</span>
                  <span>{formatPhp(pricingPreview.subtotalPhp)}</span>
                </div>
                {pricingPreview.bulkDiscountPercent > 0 && (
                  <div className="flex justify-between text-emerald-400 font-medium">
                    <span>Bulk Discount ({pricingPreview.bulkDiscountPercent}%):</span>
                    <span>-{formatPhp(pricingPreview.discountAmountPhp)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Packaging & Padded Carton:</span>
                  <span>+{formatPhp(packagingPreview)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-zinc-800 font-bold text-sm text-white">
                  <span>Final Order Total:</span>
                  <span className="text-amber-400">{formatPhp(pricingPreview.totalAmountPhp + packagingPreview)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="GCash">GCash</option>
                    <option value="Cash on Pickup">Cash on Pickup</option>
                    <option value="Bank Transfer (BDO/BPI)">Bank Transfer</option>
                    <option value="COD">Cash on Delivery (COD)</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Target Dispatch Date</label>
                  <input
                    type="date"
                    required
                    value={targetDispatchDate}
                    onChange={(e) => setTargetDispatchDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Packaging / Delivery Instructions</label>
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="e.g. Include temperature indicator, meet at Solana junction"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewOrderOpen(false)}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow"
                >
                  Confirm Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
