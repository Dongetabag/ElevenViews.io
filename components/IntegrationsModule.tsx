import React from 'react';
import { Zap, Shield, CheckCircle2, ChevronRight, Slack, MessageSquare, Globe, Database } from 'lucide-react';

const IntegrationsModule: React.FC = () => {
  const integrations = [
    { name: 'Slack', desc: 'Real-time agency notifications and lead alerts.', icon: <Slack className="w-6 h-6 text-purple-400" />, status: 'Connected' },
    { name: 'HubSpot', desc: 'Sync leads and client CRM data automatically.', icon: <Database className="w-6 h-6 text-orange-400" />, status: 'Not Connected' },
    { name: 'Google Drive', desc: 'Direct asset storage and collaboration.', icon: <Globe className="w-6 h-6 text-blue-400" />, status: 'Connected' },
    { name: 'Notion', desc: 'Project documentation and agency wiki sync.', icon: <Shield className="w-6 h-6 text-white" />, status: 'Not Connected' },
  ];

  return (
    <div className="p-8 space-y-8 animate-fadeIn">
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold text-white font-orbitron uppercase tracking-widest">Integrations Hub</h2>
        <p className="text-sm text-gray-500 mt-2">Connect Eleven Views to your existing workflow and synchronize data across all your agency platforms.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
        {integrations.map((item) => (
          <div key={item.name} className="glass p-6 rounded-3xl border-white/5 flex gap-6 hover:border-brand-gold/30 transition-all cursor-pointer group">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-all">
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">{item.name}</h3>
                {item.status === 'Connected' ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-green-500 uppercase">
                    <CheckCircle2 className="w-3 h-3" /> {item.status}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-gray-600 uppercase">
                    {item.status}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">{item.desc}</p>
              <button className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-gold hover:underline">
                Configure Settings <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="glass p-8 rounded-3xl border-dashed border-white/10 max-w-5xl flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-gray-500">
          <Zap className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-white">Custom Webhooks & API</h3>
          <p className="text-sm text-gray-500">Build custom automations using our enterprise API or n8n webhooks.</p>
        </div>
        <button className="px-6 py-2 bg-white/5 border border-white/10 text-white font-bold text-sm rounded-lg hover:bg-white/10 transition-all">
          Generate API Key
        </button>
      </div>
    </div>
  );
};

export default IntegrationsModule;