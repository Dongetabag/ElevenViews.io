import React, { useState } from 'react';
import { LEAD_STATUS_COLUMNS } from '../constants.tsx';
import { Filter, Search, Plus, MoreHorizontal, User, Globe, Mail, TrendingUp, X, Trash2 } from 'lucide-react';
import { Lead, LeadStatus } from '../types.ts';
import { DataStore } from '../hooks/useDataStore';
import EmptyState from './EmptyState';

interface LeadsModuleProps {
  leads: Lead[];
  addLead: DataStore['addLead'];
  updateLead: DataStore['updateLead'];
  deleteLead: DataStore['deleteLead'];
}

const LeadsModule: React.FC<LeadsModuleProps> = ({ leads, addLead, updateLead, deleteLead }) => {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    status: 'new' as LeadStatus,
    score: 50,
    value: 0,
    source: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '', company: '', email: '', phone: '', website: '',
      status: 'new', score: 50, value: 0, source: '', notes: ''
    });
    setEditingLead(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLead) {
      updateLead(editingLead.id, formData);
    } else {
      addLead(formData);
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone || '',
      website: lead.website,
      status: lead.status,
      score: lead.score,
      value: lead.value,
      source: lead.source || '',
      notes: lead.notes || ''
    });
    setEditingLead(lead);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLead(id);
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (leads.length === 0 && !showAddModal) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-white font-orbitron">Lead Pipeline</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
        <EmptyState type="leads" onAction={() => setShowAddModal(true)} />
        {showAddModal && renderModal()}
      </div>
    );
  }

  function renderModal() {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden">
        <div className="glass w-full max-w-lg rounded-2xl border-white/10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white font-orbitron">
              {editingLead ? 'Edit Lead' : 'Add New Lead'}
            </h3>
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Contact Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Company *</label>
                <input
                  type="text"
                  required
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="Acme Inc"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="john@acme.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="+1 555 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                placeholder="acme.com"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal">Proposal</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Score (0-100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.score}
                  onChange={(e) => setFormData({ ...formData, score: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                placeholder="Referral, LinkedIn, Website..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none resize-none"
                placeholder="Additional notes..."
              />
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
                {editingLead ? 'Update Lead' : 'Add Lead'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h2 className="text-xl sm:text-2xl font-bold text-white font-orbitron">Lead Pipeline</h2>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-brand-gold focus:outline-none w-full sm:w-48"
            />
          </div>
          <div className="hidden sm:flex p-1 bg-white/5 rounded-lg border border-white/10">
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'kanban' ? 'bg-brand-gold text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${view === 'list' ? 'bg-brand-gold text-black' : 'text-gray-500 hover:text-white'}`}
            >
              Table
            </button>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all min-h-[44px]"
          >
            <Plus className="w-4 h-4" /> Add Lead
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex-1 flex gap-3 sm:gap-6 overflow-x-auto pb-4 min-h-0 scrollbar-hide snap-x snap-mandatory [-webkit-overflow-scrolling:touch] overscroll-x-contain touch-pan-x">
          {LEAD_STATUS_COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-[85vw] sm:w-80 h-full flex flex-col gap-3 sm:gap-4 snap-center min-h-0">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-gold"></div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">{col.label}</h3>
                </div>
                <span className="text-[10px] font-mono text-gray-600 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  {filteredLeads.filter(l => l.status === col.id).length}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
                {filteredLeads.filter(l => l.status === col.id).map(lead => (
                  <div key={lead.id} className="glass p-5 rounded-2xl border-white/10 hover:border-brand-gold/30 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold font-bold">
                        {lead.company[0]}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(lead)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-brand-gold">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(lead.id)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-white truncate">{lead.company}</h4>
                    <p className="text-[10px] text-gray-500 mt-0.5">{lead.name}</p>

                    <div className="mt-4 flex flex-col gap-2">
                      {lead.website && (
                        <div className="flex items-center gap-2 text-[10px] text-gray-400">
                          <Globe className="w-3 h-3 text-brand-gold" /> {lead.website}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <Mail className="w-3 h-3 text-brand-gold" /> {lead.email}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-[10px] font-bold text-white">{lead.score}% Score</span>
                      </div>
                      <span className="text-xs font-bold text-brand-gold">${lead.value.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    setFormData({ ...formData, status: col.id as LeadStatus });
                    setShowAddModal(true);
                  }}
                  className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-[10px] font-bold text-gray-600 hover:text-brand-gold hover:border-brand-gold/30 hover:bg-brand-gold/5 transition-all uppercase tracking-[0.2em]"
                >
                  + Add Lead
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden border-white/10 overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="bg-white/5 border-b border-white/5 text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500">
              <tr>
                <th className="px-6 py-4">Lead Info</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Score</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredLeads.map(lead => (
                <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold font-bold">
                        {lead.company[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{lead.company}</p>
                        <p className="text-xs text-gray-500">{lead.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-gold" style={{ width: `${lead.score}%` }}></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-sm text-white">
                    ${lead.value.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => handleEdit(lead)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-brand-gold transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(lead.id)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && renderModal()}
    </div>
  );
};

export default LeadsModule;
