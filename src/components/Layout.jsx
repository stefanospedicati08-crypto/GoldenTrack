import { Outlet, Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dumbbell, LayoutDashboard, ClipboardList, Weight, Settings, Menu, X, Bell, LogOut, UserCog, Users, User, Ruler } from "lucide-react";
import BottomTabBar from "./BottomTabBar";
import GlobalRestTimer from "./GlobalRestTimer";
import { AnimatePresence, motion } from "framer-motion";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schede", label: "Schede", icon: ClipboardList },
  { path: "/peso", label: "Peso", icon: Weight },
  { path: "/misure", label: "Misure", icon: Ruler },
  { path: "/notifiche", label: "Notifiche", icon: Bell },
  { path: "/trainer-request", label: "Accesso Trainer", icon: UserCog, userOnly: true },
  { path: "/clienti", label: "Clienti", icon: Users, trainerOnly: true },
  { path: "/admin", label: "Admin", icon: Settings, adminOnly: true },
  { path: "/account", label: "Account", icon: User },
];

export default function Layout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === "admin";
  const isTrainer = user?.role === "trainer";
  const visibleNav = navItems.filter((item) => {
    if (item.adminOnly) return isAdmin || isTrainer;
    if (item.trainerOnly) return isTrainer;
    if (item.userOnly) return !isAdmin && !isTrainer;
    return true;
  });

  const initials = user?.full_name
    ? user.full_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-[#16181f] font-body" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Mobile Header */}
      <header
        className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1c1f28]/90 backdrop-blur-xl border-b border-white/6 flex items-center px-4"
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors">
          {mobileOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
        </button>
        <div className="flex items-center gap-2 ml-3 flex-1">
          <div className="w-7 h-7 rounded-xl bg-[#fcd12a]/15 flex items-center justify-center">
            <Dumbbell className="w-4 h-4 text-[#fcd12a]" />
          </div>
          <span className="font-heading font-bold text-base text-white">Golden Track</span>
        </div>
        {user && (
          <div className="w-8 h-8 rounded-full bg-[#fcd12a]/20 flex items-center justify-center text-xs font-bold text-[#fcd12a]">
            {initials}
          </div>
        )}
      </header>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 lg:z-30 h-full w-64 bg-[#1c1f28] border-r border-white/6 transform transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        {/* Logo */}
        <div className="p-5 flex items-center gap-3 border-b border-white/6">
          <div className="w-10 h-10 rounded-2xl bg-[#fcd12a]/15 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-base text-white leading-tight">Golden Track</h1>
            <p className="text-[11px] text-white/30">believe in yourself</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 mt-4 space-y-0.5">
          {visibleNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-[#fcd12a]/12 text-[#fcd12a] border border-[#fcd12a]/20"
                    : "text-white/40 hover:bg-white/5 hover:text-white/70"
                }`}>
                <item.icon className={`w-4 h-4 ${active ? "text-[#fcd12a]" : "text-white/30"}`} />
                {item.label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#fcd12a]" />}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#fcd12a]/15 flex items-center justify-center text-sm font-bold text-[#fcd12a] shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user.full_name || "Utente"}
                </p>
                <p className="text-xs text-white/30 truncate">{user.email}</p>
              </div>
              <button onClick={() => base44.auth.logout()}
                className="p-1.5 rounded-xl hover:bg-white/8 transition-colors" title="Logout">
                <LogOut className="w-4 h-4 text-white/30" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between px-8 py-4 border-b border-white/5 bg-[#1c1f28]/60 backdrop-blur-sm">
          <div />
          <div className="flex items-center gap-2 bg-[#fcd12a]/10 border border-[#fcd12a]/20 rounded-2xl px-4 py-2">
            <Dumbbell className="w-5 h-5 text-[#fcd12a]" />
            <span className="font-heading font-bold text-base text-[#fcd12a]">GOLDEN TRACK</span>
          </div>
        </div>
        <div className="p-4 lg:p-8 pb-28 lg:pb-10 max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <BottomTabBar />
      <GlobalRestTimer />
    </div>
  );
}