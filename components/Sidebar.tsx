import React from 'react';
import { NAV_ITEMS } from '../constants.tsx';
import { LogOut, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule, collapsed, setCollapsed, onLogout }) => {
  return (
    <aside className={`h-screen border-r border-white/[0.06] bg-brand-dark transition-all duration-300 flex flex-col z-50 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-2xl font-views font-bold tracking-wider text-white">
              <span className="text-brand-gold">VIEWS</span>
            </h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em] mt-1 font-medium">Creative Studio</p>
          </div>
        )}
        {collapsed && <div className="w-10 h-10 bg-brand-gold/10 border border-brand-gold/20 rounded-xl flex items-center justify-center text-brand-gold font-display font-bold text-sm">11</div>}
      </div>

      <nav className="flex-grow px-3 space-y-1 mt-2">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
              activeModule === item.id
                ? 'bg-brand-gold text-brand-dark shadow-[0_0_20px_rgba(201,169,98,0.2)]'
                : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <div className={`transition-transform duration-200 ${activeModule === item.id ? 'scale-105' : 'group-hover:scale-105'}`}>
              {item.icon}
            </div>
            {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/[0.06] space-y-2">
        <a
          href="/"
          className="w-full flex items-center gap-4 p-3 text-brand-gold hover:text-brand-gold/80 transition-colors rounded-xl hover:bg-brand-gold/5"
        >
          <ExternalLink className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Main Site</span>}
        </a>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-4 p-3 text-gray-600 hover:text-white transition-colors rounded-xl hover:bg-white/[0.04]"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-3 text-gray-600 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/5"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;