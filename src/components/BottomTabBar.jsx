import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Weight, Bell } from "lucide-react";

const tabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schede", label: "Schede", icon: ClipboardList },
  { path: "/peso", label: "Peso", icon: Weight },
  { path: "/notifiche", label: "Notifiche", icon: Bell },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all duration-200 select-none ${
              active ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}