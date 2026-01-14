import React, { useState } from 'react';
import { Mail, Plus, TrendingUp, BarChart2, Pause, Play, Trash2, X } from 'lucide-react';
import { Campaign } from '../types.ts';
import { DataStore } from '../hooks/useDataStore';
import EmptyState from './EmptyState';

interface CampaignsModuleProps {
  campaigns: Campaign[];
  addCampaign: DataStore['addCampaign'];
  updateCampaign: DataStore['updateCampaign'];
  deleteCampaign: DataStore['deleteCampaign'];
}

const CampaignsModule: React.FC<CampaignsModuleProps> = ({ campaigns, addCampaign, updateCampaign, deleteCampaign }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as 'active' | 'paused' | 'draft' | 'completed',
    type: 'email' as 'email' | 'social' | 'ads' | 'content',
    openRate: 0,
    clickRate: 0,
    sent: 0,
    replies: 0
  });

  const resetForm = () => {
    setFormData({
      name: '', description: '', status: 'draft', type: 'email',
      openRate: 0, clickRate: 0, sent: 0, replies: 0
    });
    setEditingCampaign(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCampaign) {
      updateCampaign(editingCampaign.id, formData);
    } else {
      addCampaign(formData);
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (campaign: Campaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status,
      type: campaign.type || 'email',
      openRate: campaign.openRate,
      clickRate: campaign.clickRate,
      sent: campaign.sent,
      replies: campaign.replies || 0
    });
    setEditingCampaign(campaign);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      deleteCampaign(id);
    }
  };

  const toggleStatus = (campaign: Campaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active';
    updateCampaign(campaign.id, { status: newStatus });
  };

  // Calculate stats from real data
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const totalSent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const totalReplies = campaigns.reduce((sum, c) => sum + (c.replies || 0), 0);
  const avgOpenRate = campaigns.length > 0
    ? campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length
    : 0;

  function renderModal() {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass w-full max-w-lg rounded-2xl border-white/10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white font-orbitron">
              {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
            </h3>
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Campaign Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                placeholder="Q1 Outreach"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none resize-none"
                placeholder="Campaign description..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                >
                  <option value="email">Email</option>
                  <option value="social">Social</option>
                  <option value="ads">Ads</option>
                  <option value="content">Content</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Open Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.openRate}
                  onChange={(e) => setFormData({ ...formData, openRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Click Rate (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.clickRate}
                  onChange={(e) => setFormData({ ...formData, clickRate: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Sent</label>
                <input
                  type="number"
                  min="0"
                  value={formData.sent}
                  onChange={(e) => setFormData({ ...formData, sent: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Replies</label>
                <input
                  type="number"
                  min="0"
                  value={formData.replies}
                  onChange={(e) => setFormData({ ...formData, replies: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 py-3 bg-white/5 border border-white/10 text-white font-bold rounded-lg hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-brand-gold text-black font-bold rounded-lg hover:scale-[1.02] transition-all"
              >
                {editingCampaign ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (campaigns.length === 0 && !showAddModal) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white font-orbitron">Campaign Sequences</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </button>
        </div>
        <EmptyState type="campaigns" onAction={() => setShowAddModal(true)} />
        {showAddModal && renderModal()}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white font-orbitron">Campaign Sequences</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Campaign
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="glass p-4 sm:p-5 rounded-2xl border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 sm:gap-0 group hover:border-brand-gold/30 transition-all">
            <div className="flex items-center gap-3 sm:gap-6 flex-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${campaign.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{campaign.name}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    campaign.status === 'active' ? 'border-green-500/50 text-green-500 bg-green-500/5' :
                    campaign.status === 'paused' ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/5' :
                    'border-gray-500/50 text-gray-500'
                  }`}>
                    {campaign.status}
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {campaign.sent} Sent
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop stats */}
            <div className="hidden md:flex items-center gap-6 lg:gap-12 px-4 lg:px-12">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Open Rate</p>
                <p className="text-xl font-bold text-white">{campaign.openRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Click Rate</p>
                <p className="text-xl font-bold text-brand-gold">{campaign.clickRate}%</p>
              </div>
            </div>

            {/* Mobile stats */}
            <div className="flex md:hidden items-center gap-4 px-2 border-t border-white/5 pt-3 sm:border-0 sm:pt-0">
              <span className="text-sm text-white"><span className="text-gray-500 text-xs">Open:</span> {campaign.openRate}%</span>
              <span className="text-sm text-brand-gold"><span className="text-gray-500 text-xs">Click:</span> {campaign.clickRate}%</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <button
                onClick={() => handleEdit(campaign)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
                title="Edit"
              >
                <BarChart2 className="w-5 h-5" />
              </button>
              {campaign.status === 'active' ? (
                <button
                  onClick={() => toggleStatus(campaign)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/5 rounded-lg transition-all"
                  title="Pause"
                >
                  <Pause className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => toggleStatus(campaign)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-brand-gold hover:bg-brand-gold/5 rounded-lg transition-all"
                  title="Play"
                >
                  <Play className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => handleDelete(campaign.id)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats Panel - calculated from real data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="glass p-6 rounded-2xl">
          <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Avg Open Rate</p>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-white font-orbitron">{avgOpenRate.toFixed(1)}%</span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl">
          <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Total Replies</p>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-white font-orbitron">{totalReplies}</span>
            <span className="text-xs text-brand-gold font-bold mb-1">{totalSent} sent</span>
          </div>
        </div>
        <div className="glass p-6 rounded-2xl">
          <p className="text-sm font-bold text-gray-500 mb-4 uppercase tracking-widest">Active Campaigns</p>
          <div className="flex items-end gap-4">
            <span className="text-4xl font-bold text-white font-orbitron">{activeCampaigns}</span>
            <span className="text-xs text-gray-500 font-bold mb-1">of {campaigns.length} total</span>
          </div>
        </div>
      </div>

      {showAddModal && renderModal()}
    </div>
  );
};

export default CampaignsModule;
