import React, { useState } from 'react';
import { Plus, MoreVertical, Shield, ExternalLink, Activity, X, Trash2 } from 'lucide-react';
import { Client } from '../types.ts';
import { DataStore } from '../hooks/useDataStore';
import EmptyState from './EmptyState';

interface ClientsModuleProps {
  clients: Client[];
  addClient: DataStore['addClient'];
  updateClient: DataStore['updateClient'];
  deleteClient: DataStore['deleteClient'];
}

const ClientsModule: React.FC<ClientsModuleProps> = ({ clients, addClient, updateClient, deleteClient }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    industry: '',
    healthScore: 'green' as 'green' | 'yellow' | 'red',
    activeProjects: 0,
    totalValue: 0,
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '', contactName: '', email: '', phone: '', industry: '',
      healthScore: 'green', activeProjects: 0, totalValue: 0, notes: ''
    });
    setEditingClient(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      updateClient(editingClient.id, formData);
    } else {
      addClient(formData);
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (client: Client) => {
    setFormData({
      name: client.name,
      contactName: client.contactName || '',
      email: client.email || '',
      phone: client.phone || '',
      industry: client.industry,
      healthScore: client.healthScore,
      activeProjects: client.activeProjects,
      totalValue: client.totalValue,
      notes: client.notes || ''
    });
    setEditingClient(client);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this client?')) {
      deleteClient(id);
    }
  };

  function renderModal() {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass w-full max-w-lg rounded-2xl border-white/10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white font-orbitron">
              {editingClient ? 'Edit Client' : 'Add New Client'}
            </h3>
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Company Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                placeholder="Acme Corporation"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Industry *</label>
                <input
                  type="text"
                  required
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="Technology, Finance..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="contact@acme.com"
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

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Health Score</label>
                <select
                  value={formData.healthScore}
                  onChange={(e) => setFormData({ ...formData, healthScore: e.target.value as 'green' | 'yellow' | 'red' })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                >
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Active Projects</label>
                <input
                  type="number"
                  min="0"
                  value={formData.activeProjects}
                  onChange={(e) => setFormData({ ...formData, activeProjects: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Total Value ($)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.totalValue}
                  onChange={(e) => setFormData({ ...formData, totalValue: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                />
              </div>
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
                {editingClient ? 'Update Client' : 'Add Client'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (clients.length === 0 && !showAddModal) {
    return (
      <div className="p-8 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white font-orbitron">Client Management</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" /> New Client
          </button>
        </div>
        <EmptyState type="clients" onAction={() => setShowAddModal(true)} />
        {showAddModal && renderModal()}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white font-orbitron">Client Management</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-bold text-sm rounded-lg hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
        >
          <Plus className="w-4 h-4" /> New Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="glass p-6 rounded-2xl border-white/5 hover:border-brand-gold/20 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-brand-gold/10 transition-all"></div>

            <div className="flex justify-between items-start relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold font-bold text-lg">
                  {client.name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{client.name}</h3>
                  <p className="text-xs text-gray-500 uppercase tracking-widest">{client.industry}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(client)} className="text-gray-600 hover:text-brand-gold">
                  <MoreVertical className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(client.id)} className="text-gray-600 hover:text-red-500">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {client.contactName && (
              <p className="text-xs text-gray-400 mt-2 relative z-10">Contact: {client.contactName}</p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-4 relative z-10">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Health Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${
                    client.healthScore === 'green' ? 'bg-green-500' :
                    client.healthScore === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm font-bold text-white uppercase">{client.healthScore}</span>
                </div>
              </div>
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tighter">Total Value</p>
                <p className="text-sm font-bold text-brand-gold mt-1">${client.totalValue.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Activity className="w-4 h-4 text-brand-gold" />
                <span>{client.activeProjects} Active Projects</span>
              </div>
              <button className="text-xs font-bold text-gray-500 hover:text-white flex items-center gap-1 transition-colors">
                Portal <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && renderModal()}
    </div>
  );
};

export default ClientsModule;
