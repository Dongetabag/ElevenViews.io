import React, { useState } from 'react';
import { Zap, Shield, CheckCircle2, ChevronRight, MessageSquare, Globe, Database, Send, Loader2 } from 'lucide-react';
import { discordService } from '../services/discordService.ts';

const IntegrationsModule: React.FC = () => {
  const [testingSending, setTestingSending] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestDiscord = async () => {
    setTestingSending(true);
    setTestResult(null);

    try {
      const success = await discordService.notify(
        'Test Notification',
        'This is a test message from the Eleven Views Portal. Discord integration is working correctly!',
        0xC9A962
      );
      setTestResult(success ? 'success' : 'error');
    } catch (error) {
      console.error('Discord test failed:', error);
      setTestResult('error');
    } finally {
      setTestingSending(false);
    }
  };

  const integrations = [
    {
      name: 'Discord',
      desc: 'Real-time team notifications and project alerts.',
      icon: <MessageSquare className="w-6 h-6 text-indigo-400" />,
      status: 'Connected',
      hasTest: true
    },
    {
      name: 'Frame.io',
      desc: 'Video review and collaboration platform.',
      icon: <Globe className="w-6 h-6 text-purple-400" />,
      status: 'Not Connected',
      hasTest: false
    },
    {
      name: 'Google Drive',
      desc: 'Cloud storage for raw footage and assets.',
      icon: <Database className="w-6 h-6 text-blue-400" />,
      status: 'Not Connected',
      hasTest: false
    },
    {
      name: 'Notion',
      desc: 'Production documentation and call sheets.',
      icon: <Shield className="w-6 h-6 text-white" />,
      status: 'Not Connected',
      hasTest: false
    },
  ];

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-display font-bold text-white">Integrations</h2>
        <p className="text-sm text-gray-500 mt-2">Connect Eleven Views to your workflow and automate notifications across platforms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {integrations.map((item) => (
          <div key={item.name} className="glass p-6 rounded-2xl border-white/[0.06] flex gap-6 hover:border-brand-gold/20 transition-all group">
            <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/[0.08] flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-all">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                {item.status === 'Connected' ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500 uppercase tracking-wide">
                    <CheckCircle2 className="w-3 h-3" /> {item.status}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                    {item.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.desc}</p>

              {item.hasTest && item.status === 'Connected' ? (
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={handleTestDiscord}
                    disabled={testingSending}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold rounded-lg hover:bg-brand-gold/20 transition-all disabled:opacity-50"
                  >
                    {testingSending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Send className="w-3 h-3" />
                    )}
                    Test Notification
                  </button>
                  {testResult === 'success' && (
                    <span className="text-xs text-emerald-500 font-medium">Sent successfully!</span>
                  )}
                  {testResult === 'error' && (
                    <span className="text-xs text-red-400 font-medium">Failed to send</span>
                  )}
                </div>
              ) : (
                <button className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-gold hover:underline">
                  Connect <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Discord Notification Events */}
      <div className="glass p-6 rounded-2xl max-w-5xl">
        <h3 className="text-lg font-semibold text-white mb-4">Discord Notification Events</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { event: 'New Project Inquiry', enabled: true },
            { event: 'User Registration', enabled: true },
            { event: 'Production Updates', enabled: true },
            { event: 'Demo Submissions', enabled: true },
            { event: 'Campaign Launches', enabled: true },
            { event: 'New Client Added', enabled: false },
          ].map((item) => (
            <div key={item.event} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
              <span className="text-sm text-gray-400">{item.event}</span>
              <div className={`w-8 h-5 rounded-full ${item.enabled ? 'bg-brand-gold' : 'bg-gray-700'} relative transition-all`}>
                <div className={`absolute top-0.5 ${item.enabled ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full shadow-sm transition-all`}></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-8 rounded-2xl border-dashed border-white/10 max-w-5xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center text-gray-500">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white">Custom Webhooks & API</h3>
          <p className="text-sm text-gray-500">Build custom automations using webhooks or connect to n8n workflows.</p>
        </div>
        <button className="px-6 py-2.5 bg-white/5 border border-white/10 text-white font-medium text-sm rounded-xl hover:bg-white/10 transition-all">
          Generate API Key
        </button>
      </div>
    </div>
  );
};

export default IntegrationsModule;
