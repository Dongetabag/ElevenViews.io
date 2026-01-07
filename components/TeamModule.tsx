import React, { useState } from 'react';
import { UserPlus, MoreHorizontal, Activity, CheckCircle2, Clock, ShieldCheck, User, X, Trash2 } from 'lucide-react';
import { TeamMember, Activity as ActivityType } from '../types.ts';
import { DataStore } from '../hooks/useDataStore';
import EmptyState from './EmptyState';

interface TeamModuleProps {
  team: TeamMember[];
  activities: ActivityType[];
  addTeamMember: DataStore['addTeamMember'];
  updateTeamMember: DataStore['updateTeamMember'];
  deleteTeamMember: DataStore['deleteTeamMember'];
}

const TeamModule: React.FC<TeamModuleProps> = ({ team, activities, addTeamMember, updateTeamMember, deleteTeamMember }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    status: 'active' as 'active' | 'away' | 'offline',
    workload: 0,
    avatar: ''
  });

  const resetForm = () => {
    setFormData({ name: '', email: '', role: '', status: 'active', workload: 0, avatar: '' });
    setEditingMember(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const avatar = formData.avatar || formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (editingMember) {
      updateTeamMember(editingMember.id, { ...formData, avatar });
    } else {
      addTeamMember({ ...formData, avatar });
    }
    setShowAddModal(false);
    resetForm();
  };

  const handleEdit = (member: TeamMember) => {
    setFormData({
      name: member.name,
      email: member.email || '',
      role: member.role,
      status: member.status,
      workload: member.workload,
      avatar: member.avatar
    });
    setEditingMember(member);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this team member?')) {
      deleteTeamMember(id);
    }
  };

  function renderModal() {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="glass w-full max-w-lg rounded-2xl border-white/10 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white font-orbitron">
              {editingMember ? 'Edit Team Member' : 'Add Team Member'}
            </h3>
            <button onClick={() => { setShowAddModal(false); resetForm(); }} className="text-gray-500 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="john@company.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Role *</label>
                <input
                  type="text"
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                  placeholder="Designer, Strategist..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-brand-gold focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="away">Away</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Workload (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.workload}
                  onChange={(e) => setFormData({ ...formData, workload: parseInt(e.target.value) || 0 })}
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
                {editingMember ? 'Update' : 'Add Member'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (team.length === 0 && !showAddModal) {
    return (
      <div className="p-8 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white font-orbitron tracking-tighter uppercase">Team Collaboration</h2>
            <p className="text-sm text-gray-500 mt-1">Manage workloads, roles, and real-time agency activity.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold text-black font-bold text-sm rounded-xl hover:scale-105 transition-all"
          >
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        </div>
        <EmptyState type="team" onAction={() => setShowAddModal(true)} />
        {showAddModal && renderModal()}
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-fadeIn h-full flex flex-col bg-[#050505]">
      <div className="flex items-center justify-between border-b border-white/5 pb-6">
        <div>
          <h2 className="text-3xl font-bold text-white font-orbitron tracking-tighter uppercase">Team Collaboration</h2>
          <p className="text-sm text-gray-500 mt-1">Manage workloads, roles, and real-time agency activity.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-gold text-black font-bold text-sm rounded-xl hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
        >
          <UserPlus className="w-4 h-4" /> Invite Member
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1 min-h-0">
        {/* Members List */}
        <div className="xl:col-span-2 space-y-6 overflow-y-auto pr-2 scrollbar-hide">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {team.map((member) => (
              <div key={member.id} className="glass p-6 rounded-3xl border-white/5 hover:border-brand-gold/30 transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold font-bold text-xl relative">
                      {member.avatar}
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#1a1a1a] ${
                        member.status === 'active' ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' :
                        member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}></div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-brand-gold transition-colors">{member.name}</h3>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-[0.2em]">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(member)} className="text-gray-600 hover:text-brand-gold">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDelete(member.id)} className="text-gray-600 hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-8 space-y-3 relative z-10">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                    <span>Active Workload</span>
                    <span className={member.workload > 80 ? 'text-red-400' : 'text-brand-gold'}>{member.workload}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${member.workload > 80 ? 'bg-red-500' : 'bg-brand-gold'}`}
                      style={{ width: `${member.workload}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Activity Log */}
        <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden flex flex-col bg-black/40">
          <div className="p-6 bg-white/5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-brand-gold" />
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Agency Pulse</h3>
            </div>
            <ShieldCheck className="w-4 h-4 text-green-500/50" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
            {activities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-xs text-gray-500">No activity yet</p>
              </div>
            ) : (
              activities.slice(0, 20).map((activity) => (
                <div key={activity.id} className="relative pl-6 border-l border-white/10">
                  <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-brand-gold border-2 border-[#111111]"></div>
                  <div className="space-y-1">
                    <p className="text-xs text-gray-300">
                      <span className="font-bold text-white">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-[10px] font-bold text-brand-gold uppercase tracking-tighter">Target: {activity.target}</p>
                    <p className="text-[10px] text-gray-600 font-mono">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 bg-white/5 border-t border-white/5">
            <div className="p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-2xl text-center">
              <p className="text-[10px] font-bold text-brand-gold uppercase tracking-[0.2em]">Network Status</p>
              <p className="text-[9px] text-gray-500 font-mono mt-1">ENCRYPTED COLLABORATION ACTIVE</p>
            </div>
          </div>
        </div>
      </div>

      {showAddModal && renderModal()}
    </div>
  );
};

export default TeamModule;
