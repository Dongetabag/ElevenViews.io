import React, { useState } from 'react';
import {
  Film, Camera, Video, Plus, Calendar, MapPin, Users, Clock,
  CheckCircle, AlertCircle, Play, MoreVertical, Filter, Search,
  Globe, DollarSign, FileText, Image, Clapperboard
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  type: 'video_production' | 'photo_shoot' | 'music_video' | 'campaign' | 'brand_content';
  status: 'planning' | 'pre_production' | 'production' | 'post_production' | 'delivered';
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: number;
  thumbnail?: string;
  team: string[];
  progress: number;
}

const MOCK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Patagonia Brand Film',
    type: 'video_production',
    status: 'post_production',
    client: 'Outdoor Collective',
    location: 'Patagonia, Chile',
    startDate: '2026-01-15',
    endDate: '2026-02-28',
    budget: 85000,
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    team: ['Director', 'DP', 'Producer', 'Editor'],
    progress: 75
  },
  {
    id: '2',
    name: 'Tokyo Night Sessions',
    type: 'music_video',
    status: 'production',
    client: 'Simeon Views',
    location: 'Tokyo, Japan',
    startDate: '2026-01-20',
    endDate: '2026-01-30',
    budget: 45000,
    thumbnail: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
    team: ['Director', 'DP', 'Gaffer', 'Art Director'],
    progress: 45
  },
  {
    id: '3',
    name: 'Morocco Editorial',
    type: 'photo_shoot',
    status: 'planning',
    client: 'Wanderlust Magazine',
    location: 'Marrakech, Morocco',
    startDate: '2026-02-10',
    endDate: '2026-02-15',
    budget: 28000,
    thumbnail: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=400&h=300&fit=crop',
    team: ['Photographer', 'Stylist', 'Assistant'],
    progress: 15
  },
  {
    id: '4',
    name: 'Cape Town Campaign',
    type: 'campaign',
    status: 'pre_production',
    client: 'Global Ventures',
    location: 'Cape Town, South Africa',
    startDate: '2026-02-20',
    endDate: '2026-03-10',
    budget: 120000,
    thumbnail: 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=400&h=300&fit=crop',
    team: ['Director', 'Producer', 'DP', 'Art Director', 'Editor'],
    progress: 25
  }
];

const STATUS_CONFIG = {
  planning: { label: 'Planning', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  pre_production: { label: 'Pre-Production', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  production: { label: 'In Production', color: 'text-blue-400', bg: 'bg-blue-400/10' },
  post_production: { label: 'Post-Production', color: 'text-purple-400', bg: 'bg-purple-400/10' },
  delivered: { label: 'Delivered', color: 'text-green-400', bg: 'bg-green-400/10' }
};

const TYPE_CONFIG = {
  video_production: { label: 'Video Production', icon: Video },
  photo_shoot: { label: 'Photo Shoot', icon: Camera },
  music_video: { label: 'Music Video', icon: Film },
  campaign: { label: 'Campaign', icon: Globe },
  brand_content: { label: 'Brand Content', icon: Clapperboard }
};

const ProductionModule: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProjects = projects.filter(project => {
    const matchesStatus = filterStatus === 'all' || project.status === filterStatus;
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          project.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: projects.length,
    inProduction: projects.filter(p => p.status === 'production').length,
    totalBudget: projects.reduce((acc, p) => acc + p.budget, 0),
    locations: [...new Set(projects.map(p => p.location.split(',')[1]?.trim() || p.location))].length
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-orbitron text-white">Production</h1>
          <p className="text-gray-400 mt-1">Manage video and photo production projects</p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-bold rounded-xl hover:scale-105 transition-transform">
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Projects', value: stats.total, icon: Film, color: 'text-brand-gold' },
          { label: 'In Production', value: stats.inProduction, icon: Video, color: 'text-blue-400' },
          { label: 'Total Budget', value: formatCurrency(stats.totalBudget), icon: DollarSign, color: 'text-green-400' },
          { label: 'Locations', value: stats.locations, icon: Globe, color: 'text-purple-400' }
        ].map((stat, i) => (
          <div key={i} className="glass p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/5 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'planning', 'pre_production', 'production', 'post_production', 'delivered'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-brand-gold text-black'
                  : 'bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {status === 'all' ? 'All' : STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-2 gap-6">
        {filteredProjects.map(project => {
          const TypeIcon = TYPE_CONFIG[project.type].icon;
          return (
            <div key={project.id} className="glass rounded-xl overflow-hidden group hover:border-brand-gold/30 transition-all">
              {/* Thumbnail */}
              <div className="relative h-48 overflow-hidden">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-brand-gold/20 to-purple-500/20 flex items-center justify-center">
                    <TypeIcon className="w-16 h-16 text-brand-gold/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[project.status].bg} ${STATUS_CONFIG[project.status].color}`}>
                    {STATUS_CONFIG[project.status].label}
                  </span>
                </div>

                {/* Type Badge */}
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-black/50 text-white flex items-center gap-1">
                    <TypeIcon className="w-3 h-3" />
                    {TYPE_CONFIG[project.type].label}
                  </span>
                </div>

                {/* Play Button */}
                {(project.type === 'video_production' || project.type === 'music_video') && (
                  <button className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-brand-gold/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-black ml-1" />
                    </div>
                  </button>
                )}

                {/* Bottom Info */}
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-1">{project.name}</h3>
                  <p className="text-gray-300 text-sm">{project.client}</p>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Location & Date */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-gray-400">
                    <MapPin className="w-4 h-4" />
                    {project.location}
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Calendar className="w-4 h-4" />
                    {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -
                    {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-medium">{project.progress}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-gold rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">{project.team.length} team members</span>
                  </div>
                  <div className="text-sm font-medium text-brand-gold">
                    {formatCurrency(project.budget)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400">No Projects Found</h3>
          <p className="text-gray-500 mt-2">Try adjusting your filters or create a new project</p>
        </div>
      )}
    </div>
  );
};

export default ProductionModule;
