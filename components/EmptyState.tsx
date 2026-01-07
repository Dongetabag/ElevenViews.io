import React from 'react';
import { Plus, Users, Briefcase, Mail, FolderOpen, Users2, BarChart } from 'lucide-react';

interface EmptyStateProps {
  type: 'leads' | 'clients' | 'campaigns' | 'assets' | 'team' | 'reports';
  onAction?: () => void;
}

const CONFIG = {
  leads: {
    icon: Users,
    title: 'No Leads Yet',
    description: 'Start building your pipeline by adding your first lead.',
    action: 'Add Lead'
  },
  clients: {
    icon: Briefcase,
    title: 'No Clients Yet',
    description: 'Convert leads or add clients directly to get started.',
    action: 'Add Client'
  },
  campaigns: {
    icon: Mail,
    title: 'No Campaigns Yet',
    description: 'Create your first campaign to engage with leads and clients.',
    action: 'Create Campaign'
  },
  assets: {
    icon: FolderOpen,
    title: 'No Assets Yet',
    description: 'Upload files to organize your brand assets and deliverables.',
    action: 'Upload Asset'
  },
  team: {
    icon: Users2,
    title: 'No Team Members Yet',
    description: 'Add team members to collaborate on projects.',
    action: 'Add Team Member'
  },
  reports: {
    icon: BarChart,
    title: 'No Data for Reports',
    description: 'Add leads and campaigns to generate meaningful reports.',
    action: null
  }
};

const EmptyState: React.FC<EmptyStateProps> = ({ type, onAction }) => {
  const config = CONFIG[type];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-brand-gold/50" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2 font-orbitron">{config.title}</h3>
      <p className="text-gray-500 text-sm max-w-sm mb-6">{config.description}</p>
      {config.action && onAction && (
        <button
          onClick={onAction}
          className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" />
          {config.action}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
