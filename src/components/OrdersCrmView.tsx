import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  Check,
  Search,
  Trash2,
  Share2,
  CheckCircle2,
  MapPin,
  Phone,
  Download,
  RotateCcw,
  Tag,
} from 'lucide-react';
import {
  ordersTable,
  exportTableToCsv,
  getFarmSettings,
  updateFarmSettings,
  resetModuleToZero,
  subscribeToStorage,
} from '../services/storage.ts';
import {
  calculateBulkEggPrice,
  formatPhp,
  generateMessengerReceipt,
} from '../utils/poultryMath.ts';
import type { FertileEggOrder, PoultryBreed, OrderStatus, OrderItemType } from '../types/index.ts';

export const OrdersCrmView: React.FC = () => {
  const [settings, setSettings] = useState(getFarmSettings());
  const [orders, setOrders] = useState<FertileEggOrder[]>(ordersTable.getAll());
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | OrderStatus>('All');
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Resolve unit price from settings based on breed & itemType
  const resolvePriceFromSettings = (
    s: ReturnType<typeof getFarmSettings>,
    selectedBreed: PoultryBreed,
    selectedItem: OrderItemType
  ): number => {
    if (selectedItem === 'Day-Old Chicks (DOC)') return s.defaultDocPrice ?? 95;
    if (selectedItem === 'Ready-to-Lay Pullets') return s.defaultPulletPrice ?? 450;
    if (selectedItem === 'Table Fresh Eggs') return s.defaultTableEggPrice ?? 9;
    return selectedBreed === 'Black Australorp'
      ? (s.defaultAustralorpEggPrice ?? 65)
      : (s.defaultRirEggPrice ?? 45);
  };

  // New Order Form state
  const [customerName, setCustomerName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [location, setLocation] = useState('Centro Solana, Cagayan');
  const [breed, setBreed] = useState<PoultryBreed>('Rhode Island Red');
  const [itemType, setItemType] = useState<OrderItemType>('Fertile Hatching Eggs');
  const [customUnitPrice, setCustomUnitPrice] = useState<number>(() =>
    resolvePriceFromSettings(getFarmSettings(), 'Rhode Island Red', 'Fertile Hatching Eggs')
  );
  const [quantity, setQuantity] = useState<number>(settings.startInputsFromZero ? 0 : 60);
  const [paymentMethod, setPaymentMethod] = useState<'GCash' | 'Cash on Pickup' | 'Bank Transfer (BDO/BPI)' | 'COD'>('GCash');
  const [dateReserved, setDateReserved] = useState(new Date().toISOString().split('T')[0]);
  const [targetDispatchDate, setTargetDispatchDate] = useState(new Date().toISOString().split('T')[0]);
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    const syncData = () => {
      const latestSettings = getFarmSettings();
      setOrders(ordersTable.getAll());
      setSettings(latestSettings);
    };
    syncData();
    return subscribeToStorage(syncData);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleOpenNewOrder = () => {
    const s = getFarmSettings();
    setCustomerName('');
    setContactNumber('');
    setLocation('Centro Solana, Cagayan');
    setBreed('Rhode Island Red');
    setItemType('Fertile Hatching Eggs');
    setCustomUnitPrice(resolvePriceFromSettings(s, 'Rhode Island Red', 'Fertile Hatching Eggs'));
    setQuantity(s.startInputsFromZero ? 0 : 60);
    setOrderNotes('');
    setIsNewOrderOpen(true);
  };

  const handleBreedChange = (newBreed: PoultryBreed) => {
    setBreed(newBreed);
    setCustomUnitPrice(resolvePriceFromSettings(settings, newBreed, itemType));
  };

  const handleItemTypeChange = (newItemType: OrderItemType) => {
    setItemType(newItemType);
    setCustomUnitPrice(resolvePriceFromSettings(settings, breed, newItemType));
  };

  // Update individual product type price in Settings and sync current order unit price if matching
  const handleProductTypePriceChange = (
    field:
      | 'defaultRirEggPrice'
      | 'defaultAustralorpEggPrice'
      | 'defaultDocPrice'
      | 'defaultPulletPrice'
      | 'defaultTableEggPrice',
    rawVal: string
  ) => {
    const val = Math.max(0, parseFloat(rawVal) || 0);
    const updated = updateFarmSettings({ [field]: val });
    setSettings(updated);

    // Sync active order unit price if the edited product type matches current selection
    if (
      (field === 'defaultRirEggPrice' && itemType === 'Fertile Hatching Eggs' && breed === 'Rhode Island Red') ||
      (field === 'defaultAustralorpEggPrice' && itemType === 'Fertile Hatching Eggs' && breed === 'Black Australorp') ||
      (field === 'defaultDocPrice' && itemType === 'Day-Old Chicks (DOC)') ||
      (field === 'defaultPulletPrice' && itemType === 'Ready-to-Lay Pullets') ||
      (field === 'defaultTableEggPrice' && itemType === 'Table Fresh Eggs')
    ) {
      setCustomUnitPrice(val);
    }
  };

  const handleZeroAllProductPrices = () => {
    const updated = updateFarmSettings({
      defaultRirEggPrice: 0,
      defaultAustralorpEggPrice: 0,
      defaultDocPrice: 0,
      defaultPulletPrice: 0,
      defaultTableEggPrice: 0,
    });
    setSettings(updated);
    setCustomUnitPrice(0);
    showToast('All product type prices reset to ₱0.00');
  };

  const handleRestoreDefaultProductPrices = () => {
    const updated = updateFarmSettings({
      defaultRirEggPrice: 45,
      defaultAustralorpEggPrice: 65,
      defaultDocPrice: 95,
      defaultPulletPrice: 450,
      defaultTableEggPrice: 9,
    });
    setSettings(updated);
    setCustomUnitPrice(resolvePriceFromSettings(updated, breed, itemType));
    showToast('Default Solana farm product prices restored!');
  };

  const handleResetOrderFormToZero = () => {
    setCustomerName('');
    setContactNumber('');
    setQuantity(0);
    setCustomUnitPrice(0);
    setOrderNotes('');
  };

  const handleCopyReceipt = (order: FertileEggOrder) => {
    const s = getFarmSettings();
    const text = generateMessengerReceipt(order, s.ownerContact, {
      farmName: s.farmName,
      location: s.location,
      gcashAccountName: s.gcashAccountName,
    });
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
    ordersTable.delete(orderId);
    setOrders(ordersTable.getAll());
    showToast(`Order ${orderNum} deleted.`);
  };

  const handleZeroAllOrders = () => {
    resetModuleToZero('orders');
    setOrders(ordersTable.getAll());
    showToast('All customer orders reset to 0!');
  };

  const pricingPreview = calculateBulkEggPrice(breed, quantity, customUnitPrice, {
    tier30: settings.bulkDiscountTier30,
    tier60: settings.bulkDiscountTier60,
    tier100: settings.bulkDiscountTier100,
  });

  const packagingPreview =
    quantity >= 60
      ? settings.packagingFeeLarge
      : quantity >= 30
      ? settings.packagingFeeMedium
      : quantity > 0
      ? settings.packagingFeeSmall
      : 0;

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !contactNumber.trim() || quantity <= 0) {
      showToast('Please enter customer name, contact number, and a quantity > 0.');
      return;
    }

    const orderNumber = `LC-ORD-2026-0${orders.length + 107}`;

    ordersTable.create({
      orderNumber,
      customerName: customerName.trim(),
      contactNumber: contactNumber.trim(),
      location: location.trim(),
      breed,
      itemType,
      quantity: Number(quantity),
      unitBasePricePhp: pricingPreview.unitBasePricePhp,
      bulkDiscountPercent: pricingPreview.bulkDiscountPercent,
      discountAmountPhp: pricingPreview.discountAmountPhp,
      packagingFeePhp: packagingPreview,
      totalAmountPhp: pricingPreview.totalAmountPhp + packagingPreview,
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

  const rirBase = settings.defaultRirEggPrice ?? 45;
  const ausBase = settings.defaultAustralorpEggPrice ?? 65;
  const docBase = settings.defaultDocPrice ?? 95;
  const pulletBase = settings.defaultPulletPrice ?? 450;
  const tableBase = settings.defaultTableEggPrice ?? 9;

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
            Tiered volume discounts (30+, 60+, 100+ eggs), customizable product type pricing, and 1-click Messenger receipts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleZeroAllOrders}
            className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Orders to 0</span>
          </button>
          <button
            onClick={() => exportTableToCsv('orders', 'legal-chicks-fertile-egg-orders')}
            className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenNewOrder}
            className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer shadow-lg active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer Order</span>
          </button>
        </div>
      </div>

      {/* Bulk Discount Tiers Explainer Card (Dynamic from Settings) */}
      <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
          <span className="text-zinc-400 text-[10px] block">RETAIL (1 - 29 PCS)</span>
          <strong className="text-white text-xs block mt-0.5">Regular Price</strong>
          <span className="text-[10px] text-zinc-400">
            RIR ₱{rirBase} • Aus ₱{ausBase} • DOC ₱{docBase}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-amber-900/60">
          <span className="text-amber-400 text-[10px] font-bold block">STARTER (30 - 59 PCS)</span>
          <strong className="text-amber-300 text-xs block mt-0.5">{settings.bulkDiscountTier30}% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">
            RIR ₱{(rirBase * (1 - settings.bulkDiscountTier30 / 100)).toFixed(2)} • Australorp ₱{(ausBase * (1 - settings.bulkDiscountTier30 / 100)).toFixed(2)}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-emerald-900/60">
          <span className="text-emerald-400 text-[10px] font-bold block">BREEDER (60 - 99 PCS)</span>
          <strong className="text-emerald-300 text-xs block mt-0.5">{settings.bulkDiscountTier60}% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">
            RIR ₱{(rirBase * (1 - settings.bulkDiscountTier60 / 100)).toFixed(2)} • Australorp ₱{(ausBase * (1 - settings.bulkDiscountTier60 / 100)).toFixed(2)}
          </span>
        </div>
        <div className="p-2.5 rounded-lg bg-zinc-950 border border-purple-900/60">
          <span className="text-purple-400 text-[10px] font-bold block">COMMERCIAL (100+ PCS)</span>
          <strong className="text-purple-300 text-xs block mt-0.5">{settings.bulkDiscountTier100}% Bulk Discount</strong>
          <span className="text-[10px] text-zinc-400">
            RIR ₱{(rirBase * (1 - settings.bulkDiscountTier100 / 100)).toFixed(2)} • Australorp ₱{(ausBase * (1 - settings.bulkDiscountTier100 / 100)).toFixed(2)}
          </span>
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
            0 customer orders found. Click "New Customer Order" to log a fertile egg reservation.
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
          <div className="w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl p-5 shadow-2xl text-zinc-100 max-h-[94vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <span>Create Fertile Egg Customer Order</span>
              </h3>
              <button
                type="button"
                onClick={handleResetOrderFormToZero}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-zinc-700"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to 0</span>
              </button>
            </div>
            <p className="text-xs text-zinc-400 mb-3.5">
              Input prices for each product type below, automatic bulk discounts, and Messenger receipt generation
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

              {/* Product Type Price List Configuration Box */}
              <div className="p-3 rounded-xl bg-zinc-950/90 border border-amber-500/30 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-zinc-800">
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-amber-300 text-xs">
                      Product Type Price List (₱ / pc)
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      • Auto-saves to farm pricing
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleZeroAllProductPrices}
                      className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/30 text-[10px] font-semibold cursor-pointer"
                    >
                      Zero Prices (₱0)
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreDefaultProductPrices}
                      className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-[10px] font-semibold cursor-pointer"
                    >
                      Default Prices
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {/* 1. RIR Fertile Egg */}
                  <div
                    className={`p-2 rounded-lg border transition ${
                      itemType === 'Fertile Hatching Eggs' && breed === 'Rhode Island Red'
                        ? 'bg-amber-950/25 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <label
                      onClick={() => {
                        setBreed('Rhode Island Red');
                        setItemType('Fertile Hatching Eggs');
                        setCustomUnitPrice(rirBase);
                      }}
                      className="text-[10px] font-bold text-zinc-300 block mb-1 cursor-pointer truncate"
                      title="Fertile Hatching Eggs (Rhode Island Red)"
                    >
                      RIR Fertile Egg
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label="RIR Fertile Hatching Egg Price"
                        value={rirBase}
                        onChange={(e) => handleProductTypePriceChange('defaultRirEggPrice', e.target.value)}
                        className="w-full px-1.5 py-1 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* 2. Australorp Fertile Egg */}
                  <div
                    className={`p-2 rounded-lg border transition ${
                      itemType === 'Fertile Hatching Eggs' && breed === 'Black Australorp'
                        ? 'bg-amber-950/25 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <label
                      onClick={() => {
                        setBreed('Black Australorp');
                        setItemType('Fertile Hatching Eggs');
                        setCustomUnitPrice(ausBase);
                      }}
                      className="text-[10px] font-bold text-zinc-300 block mb-1 cursor-pointer truncate"
                      title="Fertile Hatching Eggs (Black Australorp)"
                    >
                      Australorp Egg
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label="Black Australorp Fertile Egg Price"
                        value={ausBase}
                        onChange={(e) => handleProductTypePriceChange('defaultAustralorpEggPrice', e.target.value)}
                        className="w-full px-1.5 py-1 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* 3. Day-Old Chicks (DOC) */}
                  <div
                    className={`p-2 rounded-lg border transition ${
                      itemType === 'Day-Old Chicks (DOC)'
                        ? 'bg-amber-950/25 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <label
                      onClick={() => {
                        setItemType('Day-Old Chicks (DOC)');
                        setCustomUnitPrice(docBase);
                      }}
                      className="text-[10px] font-bold text-zinc-300 block mb-1 cursor-pointer truncate"
                      title="Day-Old Chicks (DOC)"
                    >
                      Day-Old Chick
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label="Day-Old Chicks Price"
                        value={docBase}
                        onChange={(e) => handleProductTypePriceChange('defaultDocPrice', e.target.value)}
                        className="w-full px-1.5 py-1 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* 4. Ready-to-Lay Pullets */}
                  <div
                    className={`p-2 rounded-lg border transition ${
                      itemType === 'Ready-to-Lay Pullets'
                        ? 'bg-amber-950/25 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <label
                      onClick={() => {
                        setItemType('Ready-to-Lay Pullets');
                        setCustomUnitPrice(pulletBase);
                      }}
                      className="text-[10px] font-bold text-zinc-300 block mb-1 cursor-pointer truncate"
                      title="Ready-to-Lay Pullets"
                    >
                      RTL Pullets
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        aria-label="Ready-to-Lay Pullets Price"
                        value={pulletBase}
                        onChange={(e) => handleProductTypePriceChange('defaultPulletPrice', e.target.value)}
                        className="w-full px-1.5 py-1 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded text-white font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* 5. Table Fresh Eggs */}
                  <div
                    className={`p-2 rounded-lg border transition ${
                      itemType === 'Table Fresh Eggs'
                        ? 'bg-amber-950/25 border-amber-500/60'
                        : 'bg-zinc-900/70 border-zinc-800'
                    }`}
                  >
                    <label
                      onClick={() => {
                        setItemType('Table Fresh Eggs');
                        setCustomUnitPrice(tableBase);
                      }}
                      className="text-[10px] font-bold text-zinc-300 block mb-1 cursor-pointer truncate"
                      title="Table Fresh Eggs"
                    >
                      Table Fresh Egg
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        aria-label="Table Fresh Eggs Price"
                        value={tableBase}
                        onChange={(e) => handleProductTypePriceChange('defaultTableEggPrice', e.target.value)}
                        className="w-full px-1.5 py-1 bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded text-white font-bold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Breed Selection</label>
                  <select
                    value={breed}
                    onChange={(e) => handleBreedChange(e.target.value as PoultryBreed)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Rhode Island Red">Rhode Island Red (₱{rirBase})</option>
                    <option value="Black Australorp">Black Australorp (₱{ausBase})</option>
                  </select>
                </div>
                <div>
                  <label className="text-zinc-300 font-semibold block mb-1">Product Type</label>
                  <select
                    value={itemType}
                    onChange={(e) => handleItemTypeChange(e.target.value as OrderItemType)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white"
                  >
                    <option value="Fertile Hatching Eggs">
                      Fertile Hatching Eggs (₱{breed === 'Black Australorp' ? ausBase : rirBase})
                    </option>
                    <option value="Day-Old Chicks (DOC)">Day-Old Chicks / DOC (₱{docBase})</option>
                    <option value="Ready-to-Lay Pullets">Ready-to-Lay Pullets (₱{pulletBase})</option>
                    <option value="Table Fresh Eggs">Table Fresh Eggs (₱{tableBase})</option>
                  </select>
                </div>
                <div>
                  <label className="text-amber-300 font-semibold block mb-1">
                    Order Unit Price (₱ / pc)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      required
                      aria-label="Order Unit Price in PHP"
                      value={customUnitPrice}
                      onChange={(e) => setCustomUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-zinc-950 border border-amber-500/50 focus:border-amber-400 rounded-lg text-amber-300 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Quantity (pcs)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white font-bold text-sm"
                  />
                  {[0, 30, 60, 100].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setQuantity(q)}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {q === 0 ? '0' : `${q} pcs`}
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
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow cursor-pointer"
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
