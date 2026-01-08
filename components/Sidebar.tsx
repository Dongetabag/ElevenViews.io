import React from 'react';
import { NAV_ITEMS } from '../constants.tsx';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (id: string) => void;
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule, collapsed, setCollapsed, onLogout }) => {
  return (
    <aside className={`h-screen border-r border-white/5 bg-brand-dark transition-all duration-300 flex flex-col z-50 ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        {!collapsed && (
          <h1 className="text-xl font-bold font-orbitron tracking-widest text-brand-gold">
            11 <span className="text-xs text-gray-500 font-sans block tracking-normal">VIEWS</span>
          </h1>
        )}
        {collapsed && <div className="w-8 h-8 bg-brand-gold rounded-lg flex items-center justify-center text-black font-bold text-sm">11</div>}
      </div>

      <nav className="flex-grow px-3 space-y-1 mt-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
              activeModule === item.id 
                ? 'bg-brand-gold text-black shadow-[0_0_15px_rgba(255,215,0,0.3)]' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <div className={`transition-transform duration-200 ${activeModule === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
              {item.icon}
            </div>
            {!collapsed && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 space-y-2">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center gap-4 p-3 text-gray-500 hover:text-white transition-colors rounded-xl hover:bg-white/5"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-sm">Collapse</span>}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-4 p-3 text-red-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-500/5"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Log Out</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;