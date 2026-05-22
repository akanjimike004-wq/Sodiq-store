import React, { useState, useEffect, FormEvent } from 'react';
import { 
  getDocs, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './services/firebase';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  ArrowRightLeft, 
  BarChart3, 
  Plus, 
  Search, 
  Filter,
  MessageSquare,
  LogOut,
  User as UserIcon,
  Home,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

// --- Types ---
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  sku: string;
  imageUrl: string;
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
  whatsappLink: string;
  createdAt: any;
}

interface Return {
  id: string;
  orderId: string;
  items: any[];
  reason: string;
  status: 'pending' | 'received' | 'inspected' | 'completed';
  createdAt: any;
}

type View = 'public' | 'dashboard' | 'inventory' | 'orders' | 'returns' | 'reports';

// --- Components ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(() => {
    const saved = localStorage.getItem('slc_demo_mode');
    return saved === null ? true : saved === 'true'; // Default to true for first visit
  });
  const [activeView, setActiveView] = useState<View>('public');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initial data for demo mode
  const INITIAL_PRODUCTS: Product[] = [
    { id: '1', name: 'SLC Signature Linen', description: 'Premium tan linen shirt with bespoke SLC embroidery.', price: 45000, category: 'Bespoke', stock: 12, sku: 'SLC-SIG-001', imageUrl: 'https://images.unsplash.com/photo-1594932224010-74f43a183546?auto=format&fit=crop&q=80&w=400' },
    { id: '2', name: 'Desert Safari Chinos', description: 'Italian-cut slim chinos in SLC signature sand.', price: 38000, category: 'Casual', stock: 5, sku: 'SLC-SAF-002', imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa804b868cca?auto=format&fit=crop&q=80&w=400' },
    { id: '3', name: 'Elite Kaftan', description: 'Traditional silhouette with modern minimalist finishing.', price: 65000, category: 'Heritage', stock: 2, sku: 'SLC-ELT-003', imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=400' },
    { id: '4', name: 'Midnight Velvet Blazer', description: 'Silk-lined velvet blazer for high-profile evening events.', price: 120000, category: 'Evening', stock: 4, sku: 'SLC-BV-004', imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=400' },
    { id: '5', name: 'Silk Pocket Square', description: 'Hand-rolled edges with SLC monogram pattern.', price: 15000, category: 'Accessories', stock: 25, sku: 'SLC-ACC-005', imageUrl: 'https://images.unsplash.com/photo-1594119318182-1dd7b26f5341?auto=format&fit=crop&q=80&w=400' },
    { id: '6', name: 'Onyx Agbada Set', description: 'Heavyweight polished cotton with intricate metallic threading.', price: 85000, category: 'Heritage', stock: 3, sku: 'SLC-AG-006', imageUrl: 'https://images.unsplash.com/photo-1560243563-062bff001d68?auto=format&fit=crop&q=80&w=400' },
    { id: '7', name: 'Ivory Resort Shirt', description: 'Relaxed fit Cuban collar shirt in premium ivory silk-blend.', price: 42000, category: 'Bespoke', stock: 10, sku: 'SLC-RS-007', imageUrl: 'https://images.unsplash.com/photo-1621072156002-e2fcced0b170?auto=format&fit=crop&q=80&w=400' },
    { id: '8', name: 'Tailored Wool Trousers', description: 'Charcoal grey wool with adjustable side tabs.', price: 48000, category: 'Formal', stock: 7, sku: 'SLC-TR-008', imageUrl: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&q=80&w=400' },
  ];

  const INITIAL_ORDERS: Order[] = [
    {
      id: 'ord-101',
      customerName: 'Adebayo Samuel',
      customerPhone: '2348012345678',
      total: 90000,
      status: 'delivered',
      whatsappLink: 'https://wa.me/2348012345678',
      createdAt: new Date(Date.now() - 86400000 * 2),
      items: [{ productId: '1', name: 'SLC Signature Linen', quantity: 2, price: 45000 }]
    },
    {
      id: 'ord-102',
      customerName: 'Zainab Ahmed',
      customerPhone: '2348098765432',
      total: 38000,
      status: 'pending',
      whatsappLink: 'https://wa.me/2348098765432',
      createdAt: new Date(Date.now() - 3600000 * 5),
      items: [{ productId: '2', name: 'Desert Safari Chinos', quantity: 1, price: 38000 }]
    }
  ];

  const INITIAL_RETURNS: Return[] = [
    {
      id: 'ret-201',
      orderId: 'ord-101',
      reason: 'Size exchange requested',
      status: 'pending',
      createdAt: new Date(),
      items: [{ productId: '1', name: 'SLC Signature Linen', quantity: 1, price: 45000 }]
    }
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setIsDemoMode(false);
        localStorage.setItem('slc_demo_mode', 'false');
        setActiveView('dashboard');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Data Persistence logic
  useEffect(() => {
    if (isDemoMode) {
      const storedProducts = localStorage.getItem('slc_products');
      const storedOrders = localStorage.getItem('slc_orders');
      const storedReturns = localStorage.getItem('slc_returns');

      if (storedProducts) setProducts(JSON.parse(storedProducts));
      else {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem('slc_products', JSON.stringify(INITIAL_PRODUCTS));
      }

      if (storedOrders) setOrders(JSON.parse(storedOrders));
      else {
        setOrders(INITIAL_ORDERS);
        localStorage.setItem('slc_orders', JSON.stringify(INITIAL_ORDERS));
      }

      if (storedReturns) setReturns(JSON.parse(storedReturns));
      else {
        setReturns(INITIAL_RETURNS);
        localStorage.setItem('slc_returns', JSON.stringify(INITIAL_RETURNS));
      }
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem('slc_products', JSON.stringify(products));
      localStorage.setItem('slc_orders', JSON.stringify(orders));
      localStorage.setItem('slc_returns', JSON.stringify(returns));
    }
  }, [products, orders, returns, isDemoMode]);

  // Real-time data sync for staff views
  useEffect(() => {
    if (isDemoMode) return;
    if (!user) {
      // Just public products
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'products'));
      return () => unsub();
    } else {
      // All data for staff
      const unsubProducts = onSnapshot(collection(db, 'products'), (snap) => {
        setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'products'));

      const unsubOrders = onSnapshot(collection(db, 'orders'), (snap) => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'orders'));

      const unsubReturns = onSnapshot(collection(db, 'returns'), (snap) => {
        setReturns(snap.docs.map(d => ({ id: d.id, ...d.data() } as Return)));
      }, (err) => handleFirestoreError(err, OperationType.GET, 'returns'));

      return () => {
        unsubProducts();
        unsubOrders();
        unsubReturns();
      };
    }
  }, [user, isDemoMode]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      console.warn("Firebase Auth Error, showing Demo Mode instead.");
      enterDemoMode();
    }
  };

  const enterDemoMode = () => {
      setIsDemoMode(true);
      localStorage.setItem('slc_demo_mode', 'true');
      setActiveView('dashboard');
  };

  const handleLogout = () => {
    signOut(auth);
    setIsDemoMode(false);
    localStorage.setItem('slc_demo_mode', 'false');
    setActiveView('public');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-surface">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col md:flex-row">
      {/* Sidebar for Staff */}
      {(user || isDemoMode) && activeView !== 'public' && (
        <Sidebar activeView={activeView} setView={setActiveView} handleLogout={handleLogout} />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header 
          user={user} 
          isDemoMode={isDemoMode}
          activeView={activeView} 
          onLogin={handleLogin} 
          onLogout={handleLogout} 
          setView={setViewAndCloseMenu}
          enterDemoMode={enterDemoMode}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-8" id="main-scroll-container">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="max-w-7xl mx-auto"
            >
              {activeView === 'public' && <PublicGallery products={products} setView={setViewAndCloseMenu} isStaff={!!(user || isDemoMode)} />}
              {activeView === 'dashboard' && <StaffDashboard products={products} orders={orders} setView={setActiveView} />}
              {activeView === 'inventory' && <InventoryManager products={products} setProducts={setProducts} />}
              {activeView === 'orders' && <OrderManager orders={orders} products={products} setOrders={setOrders} />}
              {activeView === 'returns' && <ReturnsManager returns={returns} orders={orders} setReturns={setReturns} />}
              {activeView === 'reports' && <ReportingSystem orders={orders} products={products} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      
      <MobileNav 
        isOpen={mobileMenuOpen} 
        setIsOpen={setMobileMenuOpen} 
        activeView={activeView} 
        setView={setViewAndCloseMenu}
        user={user}
        isDemoMode={isDemoMode}
        onLogin={handleLogin}
        onLogout={handleLogout}
        enterDemoMode={enterDemoMode}
      />
    </div>
  );

  function setViewAndCloseMenu(view: View) {
    setActiveView(view);
    setMobileMenuOpen(false);
    // Scroll to top when changing views
    const container = document.getElementById('main-scroll-container');
    if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// --- Sub-components ---

function Sidebar({ activeView, setView, handleLogout }: { activeView: View, setView: (v: View) => void, handleLogout: () => void }) {
  const menuItems = [
    { id: 'dashboard' as View, icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'inventory' as View, icon: Package, label: 'Inventory' },
    { id: 'orders' as View, icon: ShoppingBag, label: 'Orders' },
    { id: 'returns' as View, icon: ArrowRightLeft, label: 'Returns' },
    { id: 'reports' as View, icon: BarChart3, label: 'Reports' },
    { id: 'public' as View, icon: Home, label: 'Public Collection' },
  ];

  return (
    <div className="w-full md:w-64 bg-white border-r border-border flex flex-col h-auto md:h-screen p-6">
      <button 
        onClick={() => setView('public')}
        className="mb-10 flex items-center gap-3 hover:opacity-80 transition-opacity text-left"
      >
        <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0">
          <span className="text-white font-serif font-bold text-lg">SLC</span>
        </div>
        <div>
          <h1 className="text-lg font-bold font-serif leading-tight">SIR LAREX</h1>
          <p className="text-[9px] text-muted tracking-[0.2em] uppercase font-semibold">Casual Studio</p>
        </div>
      </button>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
              activeView === item.id 
                ? 'bg-brand text-white shadow-md shadow-brand/20' 
                : 'text-muted hover:bg-surface hover:text-brand'
            }`}
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        {localStorage.getItem('slc_demo_mode') === 'true' && (
          <button
            onClick={() => {
              if (confirm('Reset all demo data to initial state?')) {
                localStorage.removeItem('slc_products');
                localStorage.removeItem('slc_orders');
                localStorage.removeItem('slc_returns');
                window.location.reload();
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-amber-600 hover:bg-amber-50 rounded-2xl transition-all mt-4"
          >
            <RotateCcw size={20} />
            <span className="font-medium">Reset Demo</span>
          </button>
        )}
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 px-4 py-3 text-muted hover:text-red-500 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  );
}

function Header({ user, isDemoMode, activeView, onLogin, onLogout, setView, enterDemoMode, mobileMenuOpen, setMobileMenuOpen }: { user: User | null, isDemoMode: boolean, activeView: View, onLogin: () => void, onLogout: () => void, setView: (v: View) => void, enterDemoMode: () => void, mobileMenuOpen: boolean, setMobileMenuOpen: (o: boolean) => void }) {
  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6 md:px-12 z-40 relative">
      <div className="flex items-center gap-10">
        <button onClick={() => setView('public')} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-brand/20">
            <span className="text-white font-serif font-bold text-sm">SLC</span>
          </div>
          <div className="hidden lg:block">
            <h1 className="text-lg font-bold font-serif leading-tight tracking-tight uppercase">Sir Larex</h1>
            <p className="text-[8px] text-muted tracking-[0.3em] uppercase font-bold">Casual Luxury</p>
          </div>
        </button>

        {/* Desktop Browser Nav */}
        {activeView === 'public' && (
          <nav className="hidden md:flex items-center gap-8 border-l border-border pl-10 h-8">
            <button onClick={() => setView('public')} className={`text-sm font-bold uppercase tracking-widest ${activeView === 'public' ? 'text-brand' : 'text-muted hover:text-brand'} transition-colors`}>Home</button>
            <a href="#collection" className="text-sm font-bold uppercase tracking-widest text-muted hover:text-brand transition-colors">Collection</a>
            {(user || isDemoMode) && (
              <button onClick={() => setView('dashboard')} className="text-sm font-bold uppercase tracking-widest text-muted hover:text-brand transition-colors">Dashboard</button>
            )}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Indicators */}
        {isDemoMode && (
          <span className="hidden sm:inline-block bg-amber-100 text-amber-700 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.1em]">Preview Mode</span>
        )}

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            {!(user || isDemoMode) ? (
              <>
                <button onClick={enterDemoMode} className="text-xs font-bold uppercase tracking-widest text-muted hover:text-brand">Demo</button>
                <button onClick={onLogin} className="luxury-button !py-2 !px-6 text-xs uppercase tracking-widest">Login</button>
              </>
            ) : (
              <div className="flex items-center gap-3 bg-surface p-1.5 rounded-full pr-4">
                <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center overflow-hidden border border-brand/20">
                  {user?.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon size={14} className="text-brand" />}
                </div>
                <span className="text-xs font-bold text-ink uppercase tracking-wider">{user?.displayName?.split(' ')[0] || 'Staff'}</span>
                <button onClick={onLogout} className="text-muted hover:text-red-500 transition-colors ml-2"><LogOut size={16}/></button>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-surface border border-border text-ink"
          >
             {mobileMenuOpen ? "✕" : <Filter size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileNav({ isOpen, setIsOpen, activeView, setView, user, isDemoMode, onLogin, onLogout, enterDemoMode }: any) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[45]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white z-[50] shadow-2xl p-8 flex flex-col"
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="font-serif text-2xl font-bold">Menu</h3>
              <button onClick={() => setIsOpen(false)} className="text-muted hover:text-ink">✕</button>
            </div>

            <nav className="space-y-6 flex-1">
              <button onClick={() => setView('public')} className={`w-full text-left text-lg font-medium flex items-center justify-between ${activeView === 'public' ? 'text-brand' : 'text-muted'}`}>
                Collection <ChevronRight size={18} />
              </button>
              {(user || isDemoMode) && (
                <>
                  <button onClick={() => setView('dashboard')} className={`w-full text-left text-lg font-medium flex items-center justify-between ${activeView === 'dashboard' ? 'text-brand' : 'text-muted'}`}>
                    Dashboard <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setView('inventory')} className={`w-full text-left text-lg font-medium flex items-center justify-between ${activeView === 'inventory' ? 'text-brand' : 'text-muted'}`}>
                    Inventory <ChevronRight size={18} />
                  </button>
                  <button onClick={() => setView('orders')} className={`w-full text-left text-lg font-medium flex items-center justify-between ${activeView === 'orders' ? 'text-brand' : 'text-muted'}`}>
                    Client Orders <ChevronRight size={18} />
                  </button>
                </>
              )}
            </nav>

            <div className="pt-8 border-t border-border space-y-4">
              {!(user || isDemoMode) ? (
                <>
                  <button onClick={() => { enterDemoMode(); setIsOpen(false); }} className="w-full py-4 rounded-2xl bg-surface font-bold text-sm uppercase tracking-widest">Try Demo Mode</button>
                  <button onClick={() => { onLogin(); setIsOpen(false); }} className="w-full luxury-button">Staff Login</button>
                </>
              ) : (
                <button onClick={() => { onLogout(); setIsOpen(false); }} className="w-full py-4 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm uppercase tracking-widest">Logout Session</button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// --- View: Public Gallery ---
function PublicGallery({ products, setView, isStaff }: { products: Product[], setView: (v: View) => void, isStaff: boolean }) {
  const WHATSAPP_NUMBER = "2349012345678"; // Replace with real number

  const sendOrderToWhatsApp = (product: Product) => {
    const text = encodeURIComponent(`Hello Sir Larex Casual, I'm interested in buying: ${product.name} (SKU: ${product.sku}) - Price: ${product.price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}. Can you help me proceed with the order?`);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
  };

  const scrollToCollection = () => {
    const el = document.getElementById('collection');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-12 pb-20">
      {/* Hero Section */}
      <section className="relative h-[80vh] min-h-[500px] flex items-center justify-center overflow-hidden rounded-[2.5rem] bg-ink mx-2 md:mx-0 shadow-2xl">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=1200" 
            alt="Luxury Garment" 
            className="w-full h-full object-cover opacity-50 scale-105"
          />
        </div>
        <div className="relative z-10 text-center px-6 max-w-4xl space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <span className="text-brand font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs">Est. 1998 • Authentic Craft</span>
            <h1 className="text-6xl md:text-8xl font-serif text-white tracking-tighter mt-4 leading-[0.9]">A Heritage of Distinction</h1>
            <p className="text-white/70 text-lg md:text-xl font-light italic leading-relaxed max-w-2xl mx-auto mt-6">
              "SIR LAREX CASUAL represents the pinnacle of bespoke tailoring, where every stitch tells a story of luxury, comfort, and character."
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
          >
            <button onClick={scrollToCollection} className="luxury-button !bg-white !text-ink px-12 py-4 text-xs uppercase tracking-widest font-black transition-all hover:px-14">View Collection</button>
            {isStaff && (
              <button onClick={() => setView('dashboard')} className="px-12 py-4 rounded-full border border-white/30 text-white text-xs uppercase tracking-widest font-bold backdrop-blur-sm hover:bg-white/10 transition-all">Studio Terminal</button>
            )}
          </motion.div>
        </div>
        
        {/* Subtle scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 animate-bounce cursor-pointer" onClick={scrollToCollection}>
          <Package size={24} strokeWidth={1} />
        </div>
      </section>

      <div id="collection" className="text-center max-w-2xl mx-auto space-y-4 pt-20">
        <span className="text-brand font-bold text-xs uppercase tracking-[0.2em]">Now Available</span>
        <h2 className="text-4xl md:text-5xl font-serif">The Curated Collection</h2>
        <div className="w-16 h-1 bg-brand mx-auto rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {products.map((product) => (
          <motion.div 
            key={product.id}
            whileHover={{ y: -10 }}
            className="group glass-card overflow-hidden flex flex-col"
          >
            <div className="aspect-[3/4] relative overflow-hidden bg-muted/10">
              <img 
                src={product.imageUrl || `https://images.unsplash.com/photo-1539109132313-39f5c27632b0?auto=format&fit=crop&q=80&w=400`} 
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-brand">
                {product.category || 'Luxury'}
              </div>
            </div>
            
            <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-medium mb-1">{product.name}</h3>
                <p className="text-sm text-muted line-clamp-2">{product.description}</p>
              </div>
              
              <div className="flex items-center justify-between mt-4">
                <span className="text-lg font-bold text-brand">
                  {product.price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                </span>
                <button 
                  onClick={() => sendOrderToWhatsApp(product)}
                  className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-ink border-b-2 border-brand pb-0.5 hover:text-brand transition-colors"
                >
                  Get Now <MessageSquare size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-border">
          <Package className="mx-auto mb-4 text-muted" size={48} />
          <p className="text-muted">The collection is currently being curated. Check back soon.</p>
        </div>
      )}
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-20 py-12 border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
        <div className="space-y-4">
          <div className="flex items-center justify-center md:justify-start gap-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <span className="text-white font-serif font-bold text-xs">SLC</span>
            </div>
            <h3 className="font-serif font-bold uppercase tracking-widest">Sir Larex</h3>
          </div>
          <p className="text-sm text-muted">Redefining casual luxury through bespoke tailoring since 1998.</p>
        </div>
        
        <div>
          <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-brand">Connect</h4>
          <ul className="space-y-3 text-sm font-medium">
            <li><a href="#" className="hover:text-brand transition-colors">Instagram</a></li>
            <li><a href="#" className="hover:text-brand transition-colors">WhatsApp</a></li>
            <li><a href="#" className="hover:text-brand transition-colors">Twitter (X)</a></li>
          </ul>
        </div>

        <div>
           <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-6 text-brand">Location</h4>
           <p className="text-sm text-muted">Victoria Island, Lagos</p>
           <p className="text-sm text-muted">Monday — Saturday<br/>9:00 AM — 6:00 PM</p>
        </div>
      </div>
      <div className="mt-12 pt-8 border-t border-border/50 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] text-muted uppercase font-bold tracking-widest text-center">© 2026 Sir Larex Casual Studio. All Rights Reserved.</p>
        <div className="flex gap-6">
          <a href="#" className="text-[10px] text-muted uppercase font-bold tracking-widest hover:text-brand transition-colors">Privacy Policy</a>
          <a href="#" className="text-[10px] text-muted uppercase font-bold tracking-widest hover:text-brand transition-colors">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
}

// --- View: Dashboard ---
function StaffDashboard({ products, orders, setView }: { products: Product[], orders: Order[], setView: (v: View) => void }) {
  const stats = [
    { label: 'Total Products', value: products.length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Pending Orders', value: orders.filter(o => o.status === 'pending').length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Monthly Sales', value: orders.filter(o => o.status === 'delivered').reduce((acc, curr) => acc + curr.total, 0), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50', isMoney: true },
    { label: 'Stock Alerts', value: products.filter(p => p.stock < 5).length, icon: AlertCircle, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-border shadow-sm flex items-center gap-4"
          >
            <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted">{stat.label}</p>
              <h4 className="text-2xl font-bold text-ink">
                {stat.isMoney ? stat.value.toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }) : stat.value}
              </h4>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold">Recent Orders</h3>
            <button onClick={() => setView('orders')} className="text-brand text-sm font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {orders.slice(0, 5).map(order => (
              <div key={order.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface/50 border border-border/50">
                <div>
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-xs text-muted">#{order.id.slice(-6).toUpperCase()} • {order.items.length} items</p>
                </div>
                <div className="flex items-center gap-4">
                   <span className="font-bold text-brand">{order.total.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</span>
                   <StatusBadge status={order.status} />
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center text-muted py-10 italic">No orders yet</p>}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
          <h3 className="text-xl font-bold mb-8">Inventory Alerts</h3>
          <div className="space-y-4">
            {products.filter(p => p.stock < 10).slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-surface/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/20 overflow-hidden">
                    <img src={p.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-xs text-muted">SKU: {p.sku}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${p.stock <= 2 ? 'text-rose-500' : 'text-amber-500'}`}>{p.stock} left</p>
                  <p className="text-[10px] uppercase font-bold text-muted">Low Stock</p>
                </div>
              </div>
            ))}
             {products.filter(p => p.stock < 10).length === 0 && <p className="text-center text-muted py-10 italic">Inventory levels healthy</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Order['status'] }) {
  const colors = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-gray-100 text-gray-700',
    returned: 'bg-rose-100 text-rose-700'
  } as const;

  return (
    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${colors[status]}`}>
      {status}
    </span>
  );
}

// --- View: Inventory Manager ---
function InventoryManager({ products, setProducts }: { products: Product[], setProducts: React.Dispatch<React.SetStateAction<Product[]>> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    stock: 0,
    sku: '',
    imageUrl: ''
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return alert('Image too large (max 2MB). Studio images should be optimized for web.');
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const isDemo = localStorage.getItem('slc_demo_mode') === 'true';
      
      if (editingId) {
        if (isDemo) {
            setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...form as Product, updatedAt: new Date() } : p));
        } else {
            const productRef = doc(db, 'products', editingId);
            await updateDoc(productRef, { ...form, updatedAt: new Date() });
        }
      } else {
        const newProduct = { ...form, id: Math.random().toString(36).substr(2, 9), createdAt: new Date() } as Product;
        if (isDemo) {
            setProducts(prev => [newProduct, ...prev]);
        } else {
            await addDoc(collection(db, 'products'), { ...form, createdAt: new Date() });
        }
      }
      setShowAdd(false);
      setEditingId(null);
      setForm({ name: '', description: '', price: 0, category: '', stock: 0, sku: '', imageUrl: '' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const isDemo = localStorage.getItem('slc_demo_mode') === 'true';
      if (isDemo) {
          setProducts(prev => prev.filter(p => p.id !== id));
      } else {
          await deleteDoc(doc(db, 'products', id));
      }
    } catch (err) {
       handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
    }
  };

  const startEdit = (p: Product) => {
    setForm(p);
    setEditingId(p.id);
    setShowAdd(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input 
            type="text" 
            placeholder="Search SKU or Product Name..." 
            className="input-field pl-12"
          />
        </div>
        <button 
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ name: '', description: '', price: 0, category: '', stock: 0, sku: '', imageUrl: '' }); }}
          className="luxury-button flex items-center gap-2 w-full sm:w-auto"
        >
          <Plus size={20} /> Add Product
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white p-8 rounded-3xl border border-border shadow-lg overflow-hidden"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <h3 className="text-xl font-bold md:col-span-2">{editingId ? 'Edit Product' : 'New Product'}</h3>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-muted pl-1">Product Name</label>
                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="input-field" placeholder="Linen Summer Dress" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-muted pl-1">SKU</label>
                <input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="input-field" placeholder="AUR-001" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-muted pl-1">Price (NGN)</label>
                <input type="number" required value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="input-field" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-muted pl-1">Stock Level</label>
                <input type="number" required value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} className="input-field" />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-muted pl-1">Category</label>
                <input required value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="input-field" placeholder="Casual, Evening, Bridal..." />
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-muted pl-1">Product Visuals</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative h-48 border-2 border-dashed border-border rounded-[2rem] flex flex-col items-center justify-center gap-4 bg-surface/50 hover:bg-brand/5 hover:border-brand/40 transition-all cursor-pointer overflow-hidden"
                >
                  {form.imageUrl ? (
                    <>
                      <img src={form.imageUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-100 group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="text-white text-xs font-bold uppercase tracking-widest bg-brand/80 px-4 py-2 rounded-full">Replace Image</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-white rounded-2xl shadow-sm text-brand group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-ink">Upload Product Photo</p>
                        <p className="text-[10px] text-muted uppercase tracking-widest mt-1">PNG, JPG or WebP (Max 2MB)</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                {form.imageUrl && (
                  <div className="flex items-center gap-3 mt-3 ml-1">
                    <input 
                      type="text" 
                      value={form.imageUrl} 
                      onChange={e => setForm({...form, imageUrl: e.target.value})} 
                      className="text-[10px] text-muted bg-transparent border-none p-0 w-full focus:ring-0 truncate" 
                      placeholder="Or paste external URL here..." 
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-semibold text-muted pl-1">Description</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input-field resize-none" placeholder="Details about fabric, fit, and model..." />
              </div>
              <div className="md:col-span-2 flex gap-4 mt-2">
                <button type="submit" className="luxury-button flex-1">{editingId ? 'Save Changes' : 'Create Product'}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 bg-surface text-ink font-medium rounded-full border border-border">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface/50 border-b border-border">
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">Product</th>
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">SKU</th>
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">Category</th>
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">Price</th>
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">Stock</th>
                <th className="p-6 text-xs uppercase tracking-widest text-muted font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr key={product.id} className="border-b border-border last:border-0 hover:bg-surface/30 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-muted/20 overflow-hidden border border-border">
                        <img src={product.imageUrl || 'https://via.placeholder.com/100'} alt="" className="w-full h-full object-cover" />
                      </div>
                      <span className="font-semibold">{product.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-sm font-mono text-muted">{product.sku}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full bg-brand/10 text-brand text-[11px] font-bold uppercase tracking-wider">{product.category}</span>
                  </td>
                  <td className="p-6 font-bold">{product.price.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${product.stock > 10 ? 'bg-emerald-500' : product.stock > 0 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                       <span className="font-medium">{product.stock}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex gap-4">
                      <button onClick={() => startEdit(product)} className="text-brand hover:text-brand-dark transition-colors">Edit</button>
                      <button onClick={() => handleDelete(product.id)} className="text-rose-500 hover:text-rose-700 transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- View: Order Manager ---
function OrderManager({ orders, products, setOrders }: { orders: Order[], products: Product[], setOrders: React.Dispatch<React.SetStateAction<Order[]>> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    status: 'pending' as Order['status'],
    items: [] as OrderItem[]
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.items.length === 0) return alert('Add at least one item');
    
    const total = form.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
    const isDemo = localStorage.getItem('slc_demo_mode') === 'true';

    try {
      if (isDemo) {
          const newOrder = { 
              ...form, 
              id: Math.random().toString(36).substr(2, 9), 
              total, 
              createdAt: new Date(), 
              updatedAt: new Date(), 
              whatsappLink: `https://wa.me/${form.customerPhone.replace(/[^0-9]/g, '')}` 
          } as Order;
          setOrders(prev => [newOrder, ...prev]);
      } else {
          await addDoc(collection(db, 'orders'), {
            ...form,
            total,
            createdAt: new Date(),
            updatedAt: new Date(),
            whatsappLink: `https://wa.me/${form.customerPhone.replace(/[^0-9]/g, '')}`
          });
      }
      setShowAdd(false);
      setForm({ customerName: '', customerPhone: '', status: 'pending', items: [] });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'orders');
    }
  };

  const updateStatus = async (id: string, newStatus: Order['status']) => {
    try {
      const isDemo = localStorage.getItem('slc_demo_mode') === 'true';
      if (isDemo) {
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, updatedAt: new Date() } : o));
      } else {
          await updateDoc(doc(db, 'orders', id), { status: newStatus, updatedAt: new Date() });
      }
    } catch (err) {
       handleFirestoreError(err, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const addItemToOrder = (productId: string) => {
    const p = products.find(prod => prod.id === productId);
    if (!p) return;
    setForm({
      ...form,
      items: [...form.items, { productId, name: p.name, quantity: 1, price: p.price }]
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Client Orders</h3>
        <button onClick={() => setShowAdd(true)} className="luxury-button flex items-center gap-2">
          <Plus size={20} /> Create Order
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-2xl p-8 rounded-3xl shadow-2xl relative">
              <button 
                onClick={() => setShowAdd(false)}
                className="absolute top-6 right-6 text-muted hover:text-ink"
              >
                ✕
              </button>
              <form onSubmit={handleSubmit} className="space-y-6">
                <h3 className="text-2xl font-bold">New Client Order</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted ml-1">Customer Name</label>
                    <input required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} className="input-field" placeholder="Jane Doe" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-muted ml-1">Phone Number</label>
                    <input required value={form.customerPhone} onChange={e => setForm({...form, customerPhone: e.target.value})} className="input-field" placeholder="234..." />
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="text-xs font-bold uppercase text-muted ml-1">Add Items</label>
                   <select 
                    className="input-field"
                    onChange={(e) => { if(e.target.value) addItemToOrder(e.target.value); e.target.value = ''; }}
                   >
                     <option value="">Select a product...</option>
                     {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) - {p.price.toLocaleString()}</option>)}
                   </select>
                   
                   <div className="space-y-2 max-h-40 overflow-y-auto">
                     {form.items.map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center bg-surface p-3 rounded-xl border border-border">
                         <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted">1 x {item.price.toLocaleString()}</p>
                         </div>
                         <button type="button" onClick={() => setForm({...form, items: form.items.filter((_, i) => i !== idx)})} className="text-rose-500 text-xs">Remove</button>
                       </div>
                     ))}
                   </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted uppercase font-bold">Total Amount</p>
                    <p className="text-2xl font-bold text-brand">
                      {form.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                    </p>
                  </div>
                  <button type="submit" className="luxury-button">Finalize Order</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <motion.div 
            key={order.id}
            layout
            className="bg-white p-6 rounded-3xl border border-border shadow-sm space-y-6"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-lg">{order.customerName}</h4>
                <p className="text-xs text-muted uppercase tracking-tighter">ID: {order.id.slice(-8).toUpperCase()}</p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-muted">{item.quantity}x {item.name}</span>
                  <span className="font-medium">{item.price.toLocaleString()}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-dashed border-border flex justify-between font-bold text-brand">
                <span>Total</span>
                <span>{order.total.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a 
                href={order.whatsappLink} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition-colors"
              >
                <MessageSquare size={16} /> Contact Client
              </a>
              <select 
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value as any)}
                className="w-full bg-surface py-3 px-4 rounded-2xl text-sm font-medium border-0 focus:ring-0"
              >
                <option value="pending">Mark Pending</option>
                <option value="processing">Mark Processing</option>
                <option value="shipped">Mark Shipped</option>
                <option value="delivered">Mark Delivered</option>
                <option value="returned">Mark Returned</option>
                <option value="cancelled">Mark Cancelled</option>
              </select>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// --- View: Returns Manager ---
function ReturnsManager({ returns, orders, setReturns }: { returns: Return[], orders: Order[], setReturns: React.Dispatch<React.SetStateAction<Return[]>> }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    orderId: '',
    reason: '',
    status: 'pending' as Return['status']
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const isDemo = localStorage.getItem('slc_demo_mode') === 'true';
      const order = orders.find(o => o.id === form.orderId);
      
      const newReturn = {
        ...form,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date(),
        items: order?.items || []
      } as Return;

      if (isDemo) {
          setReturns(prev => [newReturn, ...prev]);
      } else {
          await addDoc(collection(db, 'returns'), {
            ...form,
            createdAt: new Date(),
            items: order?.items || []
          });
      }
      setShowAdd(false);
      setForm({ orderId: '', reason: '', status: 'pending' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'returns');
    }
  };

  return (
    <div className="space-y-8">
       <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold">Returns & Exchanges</h3>
        <button onClick={() => setShowAdd(true)} className="luxury-button flex items-center gap-2">
          <Plus size={20} /> Log Return
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-3xl border border-border shadow-lg"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2"><h3 className="text-xl font-bold">Log a Return Request</h3></div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted ml-1">Select Order</label>
                <select className="input-field" required value={form.orderId} onChange={e => setForm({...form, orderId: e.target.value})}>
                  <option value="">Choose order...</option>
                  {orders.map(o => <option key={o.id} value={o.id}>{o.customerName} - {o.id.slice(-6).toUpperCase()}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted ml-1">Reason</label>
                <input required className="input-field" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Size issue, Factory defect..." />
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button type="submit" className="luxury-button flex-1">Register Return</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-3 bg-surface text-ink font-medium rounded-full border border-border">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead>
              <tr className="bg-surface border-b border-border">
                <th className="p-6 text-xs uppercase font-bold text-muted">ID</th>
                <th className="p-6 text-xs uppercase font-bold text-muted">Order Ref</th>
                <th className="p-6 text-xs uppercase font-bold text-muted">Reason</th>
                <th className="p-6 text-xs uppercase font-bold text-muted">Status</th>
                <th className="p-6 text-xs uppercase font-bold text-muted">Date</th>
              </tr>
            </thead>
            <tbody>
              {returns.map(ret => (
                <tr key={ret.id} className="border-b border-border last:border-0">
                  <td className="p-6 text-sm font-mono">{ret.id.slice(-6).toUpperCase()}</td>
                  <td className="p-6 font-medium">#{ret.orderId.slice(-6).toUpperCase()}</td>
                  <td className="p-6">{ret.reason}</td>
                  <td className="p-6">
                    <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold uppercase">{ret.status}</span>
                  </td>
                  <td className="p-6 text-sm text-muted">{ret.createdAt?.toDate ? ret.createdAt.toDate().toLocaleDateString() : 'Today'}</td>
                </tr>
              ))}
              {returns.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted italic">No return requests found</td></tr>}
            </tbody>
        </table>
      </div>
    </div>
  );
}

// --- View: Reporting System ---
function ReportingSystem({ orders, products }: { orders: Order[], products: Product[] }) {
  // Simple sales by category
  const salesByCategory = products.reduce((acc: any[], p) => {
    const totalSold = orders
      .filter(o => o.status === 'delivered')
      .flatMap(o => o.items)
      .filter(i => i.productId === p.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    
    const existing = acc.find(a => a.name === p.category);
    if (existing) {
      existing.value += totalSold;
    } else {
      acc.push({ name: p.category || 'Other', value: totalSold });
    }
    return acc;
  }, []);

  const COLORS = ['#C38154', '#8E8E8E', '#1A1A1A', '#D9A07E', '#FAF9F6'];

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-serif">Performance Analytics</h3>
        <div className="flex items-center gap-2 bg-white p-1 rounded-full border border-border">
          <button className="px-4 py-1.5 rounded-full bg-brand text-white text-xs font-bold">This Month</button>
          <button className="px-4 py-1.5 rounded-full text-muted text-xs font-bold hover:bg-surface">History</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-border shadow-sm">
          <h4 className="text-lg font-bold mb-6">Sales Volume (Weekly)</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{name: 'Mon', sales: 4000}, {name: 'Tue', sales: 3000}, {name: 'Wed', sales: 2000}, {name: 'Thu', sales: 2780}, {name: 'Fri', sales: 1890}, {name: 'Sat', sales: 2390}, {name: 'Sun', sales: 3490}]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#8E8E8E'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: 'var(--color-surface)'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="sales" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
          <h4 className="text-lg font-bold mb-6">Product Distribution</h4>
          <div className="h-80 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={salesByCategory.length > 0 ? salesByCategory : [{name: 'Casual', value: 400}, {name: 'Formal', value: 300}]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {salesByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold font-serif">{orders.length}</p>
                <p className="text-[10px] text-muted uppercase font-bold tracking-widest leading-none">Orders</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm">
           <h4 className="text-lg font-bold mb-6">Inventory Health</h4>
           <div className="space-y-4">
              {products.slice(0, 4).map(p => (
                <div key={p.id} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase text-muted">
                    <span>{p.name}</span>
                    <span>{p.stock} units</span>
                  </div>
                  <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min((p.stock / 50) * 100, 100)}%` }}
                      className={`h-full ${p.stock < 5 ? 'bg-rose-500' : 'bg-brand'}`}
                    />
                  </div>
                </div>
              ))}
           </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-border shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <h4 className="text-xl font-bold mb-2">Generate PDF Report</h4>
            <p className="text-sm text-muted mb-6">Export full inventory and sales reconciliation for the accounting department.</p>
            <button className="luxury-button !bg-ink hover:!bg-black flex items-center gap-2">
              <ExternalLink size={18} /> Export Data (.CSV)
            </button>
          </div>
          <div className="absolute top-0 right-0 p-8 text-surface group-hover:scale-110 transition-transform duration-500">
            <BarChart3 size={120} />
          </div>
        </div>
      </div>
    </div>
  );
}
