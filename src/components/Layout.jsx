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
{ path: "/notifiche", label: "Notifiche", icon: Bell },
{ path: "/trainer-request", label: "Accesso Trainer", icon: UserCog, userOnly: true },
{ path: "/clienti", label: "Clienti", icon: Users, trainerOnly: true },
{ path: "/admin", label: "Admin", icon: Settings, adminOnly: true },
{ path: "/misure", label: "Misure", icon: Ruler },
{ path: "/account", label: "Account", icon: User }];


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

  return (
    <div className="min-h-screen bg-background font-body" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border h-16 flex items-center px-4" style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(4rem + env(safe-area-inset-top))" }}>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Dumbbell className="w-6 h-6 text-primary" />
          <span className="font-heading font-bold text-lg">GymTrack</span>
        </div>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen &&
      <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      }

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 lg:z-30 h-full w-64 bg-card border-r border-border transform transition-transform duration-300 ease-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Golden Track</h1>
            <p className="text-xs text-muted-foreground">believe in yorself</p>
          </div>
        </div>

        <nav className="px-3 mt-4 space-y-1">
          {visibleNav.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                active ?
                "bg-primary text-primary-foreground shadow-lg shadow-primary/25" :
                "text-muted-foreground hover:bg-secondary hover:text-foreground"}`
                }>
                
                <item.icon className="w-4.5 h-4.5" />
                {item.label}
              </Link>);

          })}
        </nav>

        {user &&
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                {user.first_name?.[0] || user.full_name?.[0] || user.email?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.full_name || "Utente"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              <button onClick={() => base44.auth.logout()} className="p-1.5 rounded-lg hover:bg-secondary transition-colors" title="Logout">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        }
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="hidden lg:flex items-center justify-end px-8 py-4 border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 bg-primary/10 rounded-xl px-4 py-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-lg text-primary">GOLDEN EIGHT</span>
          </div>
        </div>
        <div className="p-4 lg:p-8 pb-24 lg:pb-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <BottomTabBar />
      <GlobalRestTimer />
    </div>);

}