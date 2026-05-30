import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Weight, Bell } from "lucide-react";

const tabs = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/schede", label: "Schede", icon: ClipboardList },
  { path: "/peso", label: "Peso", icon: Weight },
  { path: "/notifiche", label: "Notifiche", icon: Bell },
];

export default function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#1c1f28]/95 backdrop-blur-xl border-t border-white/6 flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => {
              if (location.pathname === tab.path) {
                window.scrollTo({ top: 0, behavior: "smooth" });
              } else {
                navigate(tab.path);
              }
            }}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-all duration-200 select-none ${
              active ? "text-[#fcd12a]" : "text-white/30"
            }`}
          >
            <div className={`relative flex items-center justify-center ${active ? "after:absolute after:-bottom-1 after:w-1 after:h-1 after:rounded-full after:bg-[#fcd12a]" : ""}`}>
              <tab.icon className={`w-5 h-5 transition-transform ${active ? "scale-110" : ""}`} />
            </div>
            <span className={`text-[10px] font-medium ${active ? "text-[#fcd12a]" : "text-white/25"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}