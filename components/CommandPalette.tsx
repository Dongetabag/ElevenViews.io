// Command Palette - Quick Actions for Power Users
// Keyboard shortcut: Cmd/Ctrl + K

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Command, ArrowRight, Sparkles, Video, Music, Image,
  FileText, Users, Settings, Home, Folder, Upload, Download,
  Play, Mic, Scissors, Wand2, Brain, MessageSquare, Mail,
  BarChart3, Calendar, Clock, Star, Zap, Film, Camera, Globe,
  Palette, Layout, LogOut, HelpCircle, ChevronRight, Hash
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string) => void;
  onAction?: (action: string) => void;
}

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ElementType;
  category: 'navigation' | 'ai' | 'action' | 'create' | 'recent';
  shortcut?: string;
  action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onAction
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Define all commands
  const commands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', title: 'Dashboard', description: 'Go to dashboard home', icon: Home, category: 'navigation', action: () => onNavigate('dashboard') },
    { id: 'nav-studio', title: 'Studio Engine', description: 'Open production studio', icon: Film, category: 'navigation', shortcut: 'S', action: () => onNavigate('studio-engine') },
    { id: 'nav-brand', title: 'Brand Engine', description: 'Manage brand assets', icon: Palette, category: 'navigation', action: () => onNavigate('brand-engine') },
    { id: 'nav-design', title: 'Design Agent', description: 'AI image generation', icon: Image, category: 'navigation', action: () => onNavigate('design-agent') },
    { id: 'nav-production', title: 'Production', description: 'Video editing suite', icon: Video, category: 'navigation', shortcut: 'P', action: () => onNavigate('production') },
    { id: 'nav-ar', title: 'A&R Hub', description: 'Demo submissions', icon: Music, category: 'navigation', action: () => onNavigate('ar-hub') },
    { id: 'nav-assets', title: 'Media Library', description: 'Browse all assets', icon: Folder, category: 'navigation', shortcut: 'M', action: () => onNavigate('assets') },
    { id: 'nav-media', title: 'Media Studio', description: 'AI media creation', icon: Camera, category: 'navigation', action: () => onNavigate('media') },
    { id: 'nav-team', title: 'Crew', description: 'Team collaboration', icon: Users, category: 'navigation', shortcut: 'T', action: () => onNavigate('team') },
    { id: 'nav-ai', title: 'AI Tools', description: 'AI assistant suite', icon: Brain, category: 'navigation', shortcut: 'A', action: () => onNavigate('ai-tools') },
    { id: 'nav-leads', title: 'Projects Pipeline', description: 'Manage project leads', icon: BarChart3, category: 'navigation', action: () => onNavigate('leads') },
    { id: 'nav-clients', title: 'Clients', description: 'Client management', icon: Globe, category: 'navigation', action: () => onNavigate('clients') },
    { id: 'nav-campaigns', title: 'Campaigns', description: 'Marketing campaigns', icon: Mail, category: 'navigation', action: () => onNavigate('campaigns') },
    { id: 'nav-reports', title: 'Reports', description: 'Analytics dashboard', icon: BarChart3, category: 'navigation', action: () => onNavigate('reports') },
    { id: 'nav-integrations', title: 'Integrations', description: 'Connected services', icon: Layout, category: 'navigation', action: () => onNavigate('integrations') },
    { id: 'nav-settings', title: 'Settings', description: 'Account settings', icon: Settings, category: 'navigation', shortcut: ',', action: () => onNavigate('settings') },

    // AI Commands
    { id: 'ai-generate-video', title: 'Generate Video', description: 'Create AI video from text', icon: Video, category: 'ai', action: () => onAction?.('ai-video') },
    { id: 'ai-voiceover', title: 'Generate Voice-Over', description: 'AI narration', icon: Mic, category: 'ai', action: () => onAction?.('ai-voiceover') },
    { id: 'ai-music', title: 'Generate Music', description: 'AI background music', icon: Music, category: 'ai', action: () => onAction?.('ai-music') },
    { id: 'ai-transcribe', title: 'Transcribe Audio', description: 'Convert speech to text', icon: FileText, category: 'ai', action: () => onAction?.('ai-transcribe') },
    { id: 'ai-smart-cuts', title: 'Smart Cuts', description: 'AI editing suggestions', icon: Scissors, category: 'ai', action: () => onAction?.('ai-cuts') },
    { id: 'ai-auto-edit', title: 'Auto Edit', description: 'AI automatic editing', icon: Wand2, category: 'ai', action: () => onAction?.('ai-auto-edit') },
    { id: 'ai-scene-analysis', title: 'Analyze Scenes', description: 'Detect scenes in video', icon: Brain, category: 'ai', action: () => onAction?.('ai-analyze') },
    { id: 'ai-command-center', title: 'AI Command Center', description: 'Open AI hub', icon: Sparkles, category: 'ai', shortcut: 'I', action: () => onAction?.('ai-command-center') },

    // Actions
    { id: 'action-upload', title: 'Upload Files', description: 'Add new media to library', icon: Upload, category: 'action', shortcut: 'U', action: () => onAction?.('upload') },
    { id: 'action-new-project', title: 'New Project', description: 'Create a new project', icon: Folder, category: 'action', shortcut: 'N', action: () => onAction?.('new-project') },
    { id: 'action-export', title: 'Export', description: 'Export current project', icon: Download, category: 'action', shortcut: 'E', action: () => onAction?.('export') },
    { id: 'action-help', title: 'Help & Support', description: 'Get help', icon: HelpCircle, category: 'action', shortcut: '?', action: () => onAction?.('help') },
    { id: 'action-logout', title: 'Sign Out', description: 'Log out of account', icon: LogOut, category: 'action', action: () => onAction?.('logout') },
  ], [onNavigate, onAction]);

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search) return commands;
    const searchLower = search.toLowerCase();
    return commands.filter(cmd =>
      cmd.title.toLowerCase().includes(searchLower) ||
      cmd.description?.toLowerCase().includes(searchLower) ||
      cmd.category.toLowerCase().includes(searchLower)
    );
  }, [search, commands]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      ai: [],
      navigation: [],
      action: [],
      create: [],
      recent: []
    };
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, { label: string; icon: React.ElementType }> = {
    ai: { label: 'AI Powered', icon: Sparkles },
    navigation: { label: 'Navigation', icon: ArrowRight },
    action: { label: 'Actions', icon: Zap },
    create: { label: 'Create', icon: Star },
    recent: { label: 'Recent', icon: Clock }
  };

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-brand-surface border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Command className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-lg"
          />
          <kbd className="px-2 py-1 bg-white/10 rounded text-xs text-gray-500 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500">No commands found</p>
              <p className="text-sm text-gray-600 mt-1">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, items]) => {
              if (items.length === 0) return null;
              const { label, icon: CategoryIcon } = categoryLabels[category];

              return (
                <div key={category} className="mb-4">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <CategoryIcon className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  {items.map((cmd) => {
                    const index = globalIndex++;
                    const isSelected = index === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-index={index}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-brand-gold/10 text-brand-gold'
                            : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-brand-gold/20' : 'bg-white/5'
                        }`}>
                          <cmd.icon className={`w-4 h-4 ${isSelected ? 'text-brand-gold' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-medium ${isSelected ? 'text-brand-gold' : 'text-white'}`}>
                            {cmd.title}
                          </p>
                          {cmd.description && (
                            <p className="text-xs text-gray-500">{cmd.description}</p>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className={`px-2 py-1 rounded text-xs font-mono ${
                            isSelected ? 'bg-brand-gold/20 text-brand-gold' : 'bg-white/10 text-gray-500'
                          }`}>
                            {cmd.shortcut}
                          </kbd>
                        )}
                        <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-brand-gold' : 'text-gray-600'}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono">↵</kbd>
              Select
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-brand-gold" />
            <span className="text-xs text-gray-500">Eleven Views</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
