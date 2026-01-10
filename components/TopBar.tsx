import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Command, User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { UserProfile } from '../types.ts';

interface TopBarProps {
  user: UserProfile;
  onLogout?: () => void;
  onNavigate?: (module: string) => void;
}

const TopBar: React.FC<TopBarProps> = ({ user, onLogout, onNavigate }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowUserMenu(false);
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <header className="h-16 border-b border-white/[0.06] bg-brand-dark/80 backdrop-blur-xl sticky top-0 z-40 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4 w-1/3">
        <div className="relative group w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-gold transition-colors" />
          <input
            type="text"
            placeholder="Search projects, locations..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/40 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[10px] text-gray-600 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/[0.04]">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-gold rounded-full border-2 border-brand-dark"></span>
        </button>

        <div className="h-8 w-px bg-white/[0.08]"></div>

        {/* User Menu with Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-white/[0.04] transition-colors"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-white leading-none">{user.name}</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{user.role}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold font-display font-semibold">
              {user.name[0]}
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-brand-dark border border-white/[0.08] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              <div className="p-4 border-b border-white/[0.06]">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onNavigate?.('settings');
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;