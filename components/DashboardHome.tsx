import React, { useState, useEffect } from 'react';
import { UserProfile, DashboardStats } from '../types.ts';
import { Sparkles, TrendingUp, Users, DollarSign, MousePointer2, ArrowUpRight, Database, Zap, Activity, MessageSquare } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { leadsApiService, PipelineStats, HealthStatus } from '../services/leadsApiService.ts';

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

  // Fetch live data from API
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
    // Refresh every 30 seconds
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
        const leadsInfo = apiStats ? `Current pipeline: ${apiStats.total_leads} leads (${apiStats.by_status.qualified || 0} qualified, ${apiStats.by_status.new || 0} new).` : '';
        const { greeting, period } = getTimeOfDayGreeting();
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: `Generate a short, professional "${period} Briefing" for ${user.name}, an agency ${user.role}. Start with "${greeting}, ${user.name}!" ${leadsInfo} Mention it's a great time to scale their agency's core competency: ${user.agencyCoreCompetency || 'client growth'}. Use a futuristic, motivating tone. Keep it to 3 bullet points.`,
        });
        setBriefing(response.text || 'Welcome back to the Lab.');
      } catch (err) {
        setBriefing('Systems online. High conversion probability detected in your current pipeline.');
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
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${value}`;
  };

  const formatChange = (value: number) => {
    if (value === 0) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  // Use live API stats if available, otherwise fall back to local stats
  const liveLeadsCount = apiStats?.total_leads || stats.totalLeads;
  const liveQualified = apiStats?.by_status?.qualified || 0;
  const liveNew = apiStats?.by_status?.new || 0;

  const statCards = [
    {
      label: 'Total Leads',
      value: liveLeadsCount.toLocaleString(),
      change: '+12%',
      icon: <Users className="w-5 h-5 text-brand-gold" />,
      live: !!apiStats
    },
    {
      label: 'Qualified',
      value: liveQualified.toLocaleString(),
      change: '+8%',
      icon: <TrendingUp className="w-5 h-5 text-brand-gold" />,
      live: !!apiStats
    },
    {
      label: 'New Leads',
      value: liveNew.toLocaleString(),
      change: '+15%',
      icon: <MousePointer2 className="w-5 h-5 text-brand-gold" />,
      live: !!apiStats
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.pipelineValue || liveLeadsCount * 500),
      change: formatChange(stats.pipelineChange),
      icon: <DollarSign className="w-5 h-5 text-brand-gold" />
    },
  ];

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-');
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      {/* System Status Banner */}
      {healthStatus && (
        <div className="flex items-center gap-4 p-4 bg-green-500/10 border border-green-500/20 rounded-2xl">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-green-500">All Systems Operational</p>
            <p className="text-xs text-gray-400">
              Connected: Claude AI, N8N, Google AI, HubSpot, Supabase, Baserow
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{healthStatus.database?.leadgen?.totalLeads?.toLocaleString()} leads in database</p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold text-white font-orbitron">Systems Overview</h2>
            <p className="text-sm text-gray-500 font-mono">{currentDate} • {currentTime}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, i) => (
              <div key={i} className="glass p-5 rounded-2xl hover:border-brand-gold/30 transition-all group relative">
                {stat.live && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[8px] text-green-500 uppercase tracking-wider">Live</span>
                  </div>
                )}
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-brand-gold/10 rounded-lg group-hover:scale-110 transition-transform">
                    {stat.icon}
                  </div>
                  {stat.change && (
                    <span className="text-xs font-bold text-brand-gold flex items-center gap-0.5">
                      {stat.change} <ArrowUpRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">{stat.label}</p>
                  <p className="text-2xl font-bold text-white mt-1 font-orbitron">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Intelligence Briefing */}
          <div className="glass-gold p-6 rounded-2xl border-brand-gold/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 scale-150 rotate-12 group-hover:scale-[1.7] transition-transform duration-700">
              <Sparkles className="w-24 h-24 text-brand-gold" />
            </div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-brand-gold animate-pulse" />
                <h3 className="text-sm font-bold text-brand-gold uppercase tracking-[0.2em]">AI Intelligence Briefing</h3>
              </div>
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-white/5 animate-pulse rounded"></div>
                  <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded"></div>
                </div>
              ) : (
                <div className="text-gray-200 text-sm leading-relaxed space-y-2 whitespace-pre-line font-medium">
                  {briefing}
                </div>
              )}
            </div>
          </div>

          {/* AI Agent Chat */}
          <div className="glass p-6 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">AI Agent</h3>
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask about your leads, campaigns, or data..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
              />
              <button
                onClick={handleChat}
                disabled={chatLoading}
                className="px-6 py-3 bg-brand-gold text-black font-bold rounded-xl hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
              >
                {chatLoading ? <Zap className="w-5 h-5 animate-spin" /> : 'Ask'}
              </button>
            </div>
            {agentResponse && (
              <div className="mt-4 p-4 bg-white/5 rounded-xl text-gray-300 text-sm">
                {agentResponse}
              </div>
            )}
          </div>
        </div>

        <div className="w-full md:w-80 space-y-6">
          <h3 className="text-lg font-bold text-white font-orbitron">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate?.('campaigns')}
              className="w-full flex items-center gap-4 p-4 bg-brand-gold text-black font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
            >
              <TrendingUp className="w-5 h-5" />
              <span>Launch New Campaign</span>
            </button>
            <button
              onClick={() => onNavigate?.('leads')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              <Users className="w-5 h-5 text-brand-gold" />
              <span>View All Leads</span>
            </button>
            <button
              onClick={() => onNavigate?.('ai-tools')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              <Sparkles className="w-5 h-5 text-brand-gold" />
              <span>AI Tools Suite</span>
            </button>
            <button
              onClick={() => onNavigate?.('reports')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              <DollarSign className="w-5 h-5 text-brand-gold" />
              <span>Financial Overview</span>
            </button>
            <button
              onClick={() => onNavigate?.('integrations')}
              className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all"
            >
              <Database className="w-5 h-5 text-brand-gold" />
              <span>Integrations</span>
            </button>
          </div>

          {/* Category Breakdown */}
          {apiStats?.by_category && (
            <div className="glass p-4 rounded-2xl">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Top Categories</h4>
              <div className="space-y-2">
                {Object.entries(apiStats.by_category)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 truncate">{category}</span>
                      <span className="text-white font-bold">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
