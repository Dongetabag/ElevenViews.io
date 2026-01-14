import React, { useState, useEffect } from 'react';
import { UserProfile, DashboardStats } from '../types.ts';
import { Aperture, TrendingUp, Film, DollarSign, Camera, ArrowUpRight, Globe, Zap, Activity, MessageSquare, Play, MapPin } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { leadsApiService, PipelineStats, HealthStatus } from '../services/leadsApiService.ts';
import { AI_MODELS } from '../services/aiConfig';

interface DashboardHomeProps {
  user: UserProfile;
  stats: DashboardStats;
  onNavigate?: (id: string) => void;
}

const DashboardHome: React.FC<DashboardHomeProps> = ({ user, stats, onNavigate }) => {
  const [briefing, setBriefing] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [apiStats, setApiStats] = useState<PipelineStats | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [agentResponse, setAgentResponse] = useState<string>('');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [pipelineData, health] = await Promise.all([
          leadsApiService.getPipelineStats(),
          leadsApiService.getHealth()
        ]);
        setApiStats(pipelineData);
        setHealthStatus(health);
      } catch (error) {
        console.error('Failed to fetch live data:', error);
      }
    };

    fetchLiveData();
    const interval = setInterval(fetchLiveData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getTimeOfDayGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { greeting: 'Good morning', period: 'Morning' };
    if (hour >= 12 && hour < 17) return { greeting: 'Good afternoon', period: 'Afternoon' };
    if (hour >= 17 && hour < 21) return { greeting: 'Good evening', period: 'Evening' };
    return { greeting: 'Good evening', period: 'Night' };
  };

  useEffect(() => {
    const generateBriefing = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const projectInfo = apiStats ? `Current pipeline: ${apiStats.total_leads} active projects.` : '';
        const { greeting, period } = getTimeOfDayGreeting();
        const response = await ai.models.generateContent({
          model: AI_MODELS.text.default,
          contents: `Generate a short, cinematic "${period} Briefing" for ${user.name}, a ${user.role || 'creative'} at Eleven Views production company. Start with "${greeting}, ${user.name}." ${projectInfo} Reference their work in visual storytelling and global production. Company focus: ${user.agencyCoreCompetency || 'cinematic narratives'}. Use an inspiring, sophisticated tone. Keep it to 3 brief lines.`,
        });
        setBriefing(response.text || 'Welcome back to the studio.');
      } catch (err) {
        setBriefing('Studio systems online. Your next visual story awaits.');
      } finally {
        setLoading(false);
      }
    };
    generateBriefing();
  }, [user, apiStats]);

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    setChatLoading(true);
    try {
      const response = await leadsApiService.chat(chatInput, { currentPage: 'dashboard', userProfile: { name: user.name, role: user.role, department: '', specialization: '' } });
      setAgentResponse(response);
    } catch (error) {
      setAgentResponse('Sorry, I encountered an error. Please try again.');
    } finally {
      setChatLoading(false);
      setChatInput('');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
  };

  const liveProjectCount = apiStats?.total_leads || stats.totalLeads || 12;
  const liveInProduction = apiStats?.by_status?.qualified || 4;
  const liveIncoming = apiStats?.by_status?.new || 3;

  const statCards = [
    {
      label: 'Active Projects',
      value: liveProjectCount.toLocaleString(),
      change: '+3',
      icon: <Film className="w-5 h-5 text-brand-gold" />,
      live: !!apiStats
    },
    {
      label: 'In Production',
      value: liveInProduction.toLocaleString(),
      change: null,
      icon: <Play className="w-5 h-5 text-brand-gold" />,
      live: !!apiStats
    },
    {
      label: 'Locations',
      value: '7',
      change: null,
      icon: <MapPin className="w-5 h-5 text-brand-gold" />,
    },
    {
      label: 'Revenue YTD',
      value: formatCurrency(stats.pipelineValue || 285000),
      change: '+18%',
      icon: <DollarSign className="w-5 h-5 text-brand-gold" />
    },
  ];

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="p-3 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 animate-fadeIn">
      {/* System Status Banner */}
      {healthStatus && (
        <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-500">All Systems Operational</p>
            <p className="text-xs text-gray-500">
              Production tools, AI suite, and members portal connected
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white">Production Overview</h2>
              <p className="text-sm text-gray-500 mt-1">{currentDate}</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass rounded-xl">
              <Globe className="w-4 h-4 text-brand-gold" />
              <span className="text-xs text-gray-400 font-medium">Global Operations</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCards.map((stat, i) => (
              <div key={i} className="glass p-3 sm:p-5 rounded-xl sm:rounded-2xl hover:border-brand-gold/20 transition-all group relative">
                {stat.live && (
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-emerald-500 uppercase tracking-wider">Live</span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="p-2.5 bg-brand-gold/10 rounded-xl group-hover:bg-brand-gold/15 transition-colors">
                    {stat.icon}
                  </div>
                  {stat.change && (
                    <span className="text-xs font-semibold text-brand-gold flex items-center gap-0.5">
                      {stat.change} <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 font-semibold">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-display font-bold text-white mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Creative Briefing */}
          <div className="glass-gold p-6 rounded-2xl border-brand-gold/15 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 scale-150 rotate-12 group-hover:scale-[1.6] transition-transform duration-700">
              <Aperture className="w-32 h-32 text-brand-gold" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Aperture className="w-5 h-5 text-brand-gold" />
                <h3 className="text-sm font-semibold text-brand-gold uppercase tracking-[0.15em]">Creative Brief</h3>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded"></div>
                  <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded"></div>
                </div>
              ) : (
                <div className="text-gray-300 text-sm leading-relaxed space-y-2 whitespace-pre-line">
                  {briefing}
                </div>
              )}
            </div>
          </div>

          {/* AI Assistant */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-[0.15em]">Production Assistant</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask about projects, schedules, or locations..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/40 transition-colors"
              />
              <button
                onClick={handleChat}
                disabled={chatLoading}
                className="px-6 py-3 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
              >
                {chatLoading ? <Zap className="w-5 h-5 animate-spin" /> : 'Ask'}
              </button>
            </div>
            {agentResponse && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl text-gray-300 text-sm border border-white/5">
                {agentResponse}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 space-y-6">
          <h3 className="text-lg font-display font-bold text-white">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('production')}
              className="w-full flex items-center gap-4 p-4 bg-brand-gold text-brand-dark font-semibold rounded-xl hover:bg-brand-gold/90 transition-all shadow-[0_0_30px_rgba(201,169,98,0.15)]"
            >
              <Film className="w-5 h-5" />
              <span>New Production</span>
            </button>
            <button
              onClick={() => onNavigate?.('clients')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              <Camera className="w-5 h-5 text-brand-gold" />
              <span>View All Projects</span>
            </button>
            <button
              onClick={() => onNavigate?.('ar-hub')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              <Aperture className="w-5 h-5 text-brand-gold" />
              <span>A&R Hub</span>
            </button>
            <button
              onClick={() => onNavigate?.('media')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              <Play className="w-5 h-5 text-brand-gold" />
              <span>Media Studio</span>
            </button>
            <button
              onClick={() => onNavigate?.('assets')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all"
            >
              <Globe className="w-5 h-5 text-brand-gold" />
              <span>Asset Library</span>
            </button>
          </div>

          {/* Recent Locations */}
          <div className="glass p-3 sm:p-5 rounded-xl sm:rounded-2xl">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Recent Locations</h4>
            <div className="space-y-3">
              {['Patagonia, Chile', 'Tokyo, Japan', 'Marrakech, Morocco', 'Cape Town, SA'].map((location, i) => (
                <div key={i} className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-brand-gold/60" />
                  <span className="text-sm text-gray-400">{location}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming */}
          <div className="glass p-3 sm:p-5 rounded-xl sm:rounded-2xl">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming Shoots</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Iceland Campaign</span>
                <span className="text-xs text-brand-gold">Jan 15</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">NYC Editorial</span>
                <span className="text-xs text-brand-gold">Jan 22</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Dubai Brand Film</span>
                <span className="text-xs text-brand-gold">Feb 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
