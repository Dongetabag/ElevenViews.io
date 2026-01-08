import React, { useState, useRef, useEffect } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Upload, Star, MessageSquare, Clock, User, Filter, Search,
  ChevronDown, MoreVertical, ThumbsUp, ThumbsDown, Send, X,
  Headphones, Mic2, TrendingUp, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';

interface Demo {
  id: string;
  title: string;
  artistName: string;
  artistEmail: string;
  genre: string;
  audioUrl: string;
  duration: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  submittedAt: string;
  ratings: {
    overall: number;
    production: number;
    vocals: number;
    lyrics: number;
    commercial: number;
  };
  comments: Comment[];
  waveformData?: number[];
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  comment: string;
  timestampSeconds?: number;
  createdAt: string;
}

const MOCK_DEMOS: Demo[] = [
  {
    id: '1',
    title: 'Midnight Dreams',
    artistName: 'Luna Wave',
    artistEmail: 'luna@email.com',
    genre: 'R&B',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 234,
    status: 'pending',
    priority: 'high',
    submittedAt: '2026-01-07T10:30:00Z',
    ratings: { overall: 0, production: 0, vocals: 0, lyrics: 0, commercial: 0 },
    comments: [],
    waveformData: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
  },
  {
    id: '2',
    title: 'City Lights',
    artistName: 'Metro Pulse',
    artistEmail: 'metro@email.com',
    genre: 'Hip-Hop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 198,
    status: 'under_review',
    priority: 'normal',
    submittedAt: '2026-01-06T14:20:00Z',
    ratings: { overall: 7.5, production: 8, vocals: 7, lyrics: 7.5, commercial: 7.5 },
    comments: [
      { id: '1', userId: '1', userName: 'A&R Team', userAvatar: '', comment: 'Strong production, vocals need work', createdAt: '2026-01-07T09:00:00Z' }
    ],
    waveformData: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
  },
  {
    id: '3',
    title: 'Wild Stories',
    artistName: 'Simeon Views',
    artistEmail: 'simeon@elevenviews.com',
    genre: 'Alternative R&B',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 267,
    status: 'approved',
    priority: 'urgent',
    submittedAt: '2026-01-05T08:00:00Z',
    ratings: { overall: 9.2, production: 9.5, vocals: 9, lyrics: 9, commercial: 9.5 },
    comments: [
      { id: '1', userId: '1', userName: 'A&R Lead', userAvatar: '', comment: 'Exceptional track. Ready for release.', timestampSeconds: 45, createdAt: '2026-01-06T11:00:00Z' },
      { id: '2', userId: '2', userName: 'Producer', userAvatar: '', comment: 'The hook at 1:30 is incredible', timestampSeconds: 90, createdAt: '2026-01-06T12:30:00Z' }
    ],
    waveformData: Array.from({ length: 100 }, () => Math.random() * 0.8 + 0.2)
  }
];

const STATUS_CONFIG = {
  pending: { label: 'Pending Review', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: AlertCircle },
  under_review: { label: 'Under Review', color: 'text-blue-400', bg: 'bg-blue-400/10', icon: Headphones },
  approved: { label: 'Approved', color: 'text-green-400', bg: 'bg-green-400/10', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-red-400', bg: 'bg-red-400/10', icon: XCircle }
};

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'text-gray-400' },
  normal: { label: 'Normal', color: 'text-blue-400' },
  high: { label: 'High', color: 'text-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' }
};

const ARHubModule: React.FC = () => {
  const [demos, setDemos] = useState<Demo[]>(MOCK_DEMOS);
  const [selectedDemo, setSelectedDemo] = useState<Demo | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedDemo]);

  const togglePlay = () => {
    if (!audioRef.current || !selectedDemo) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDemo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seekTo(percent * selectedDemo.duration);
  };

  const updateRating = (category: keyof Demo['ratings'], value: number) => {
    if (!selectedDemo) return;
    const updatedDemo = {
      ...selectedDemo,
      ratings: { ...selectedDemo.ratings, [category]: value }
    };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
  };

  const updateStatus = (status: Demo['status']) => {
    if (!selectedDemo) return;
    const updatedDemo = { ...selectedDemo, status };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
  };

  const addComment = () => {
    if (!selectedDemo || !newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      userId: '1',
      userName: 'You',
      userAvatar: '',
      comment: newComment,
      timestampSeconds: Math.floor(currentTime),
      createdAt: new Date().toISOString()
    };
    const updatedDemo = {
      ...selectedDemo,
      comments: [...selectedDemo.comments, comment]
    };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
    setNewComment('');
  };

  const filteredDemos = demos.filter(demo => {
    const matchesStatus = filterStatus === 'all' || demo.status === filterStatus;
    const matchesSearch = demo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          demo.artistName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: demos.length,
    pending: demos.filter(d => d.status === 'pending').length,
    approved: demos.filter(d => d.status === 'approved').length,
    avgRating: demos.filter(d => d.ratings.overall > 0).reduce((acc, d) => acc + d.ratings.overall, 0) /
               demos.filter(d => d.ratings.overall > 0).length || 0
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-orbitron text-white">A&R Hub</h1>
          <p className="text-gray-400 mt-1">Review and manage demo submissions</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-bold rounded-xl hover:scale-105 transition-transform"
        >
          <Upload className="w-5 h-5" />
          Submit Demo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Demos', value: stats.total, icon: Music, color: 'text-brand-gold' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Avg Rating', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-purple-400' }
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
            placeholder="Search demos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
          />
        </div>
        <div className="flex items-center gap-2">
          {['all', 'pending', 'under_review', 'approved', 'rejected'].map(status => (
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

      <div className="grid grid-cols-12 gap-6">
        {/* Demo List */}
        <div className="col-span-5 space-y-3">
          {filteredDemos.map(demo => {
            const StatusIcon = STATUS_CONFIG[demo.status].icon;
            return (
              <div
                key={demo.id}
                onClick={() => {
                  setSelectedDemo(demo);
                  setIsPlaying(false);
                  setCurrentTime(0);
                }}
                className={`glass p-4 rounded-xl cursor-pointer transition-all hover:border-brand-gold/30 ${
                  selectedDemo?.id === demo.id ? 'border-brand-gold/50 bg-brand-gold/5' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-gold/20 to-purple-500/20 flex items-center justify-center">
                    <Music className="w-6 h-6 text-brand-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white truncate">{demo.title}</h3>
                      <span className={`text-xs ${PRIORITY_CONFIG[demo.priority].color}`}>
                        {demo.priority === 'urgent' && '●'}
                        {demo.priority === 'high' && '●'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{demo.artistName}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${STATUS_CONFIG[demo.status].bg} ${STATUS_CONFIG[demo.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_CONFIG[demo.status].label}
                      </span>
                      <span className="text-xs text-gray-500">{demo.genre}</span>
                      <span className="text-xs text-gray-500">{formatTime(demo.duration)}</span>
                    </div>
                  </div>
                  {demo.ratings.overall > 0 && (
                    <div className="flex items-center gap-1 text-brand-gold">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="text-sm font-medium">{demo.ratings.overall}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Demo Detail & Player */}
        <div className="col-span-7">
          {selectedDemo ? (
            <div className="glass rounded-xl overflow-hidden">
              {/* Audio Element */}
              <audio ref={audioRef} src={selectedDemo.audioUrl} preload="metadata" />

              {/* Player Header */}
              <div className="p-6 border-b border-white/5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedDemo.title}</h2>
                    <p className="text-gray-400 mt-1">{selectedDemo.artistName} • {selectedDemo.genre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDemo.status}
                      onChange={(e) => updateStatus(e.target.value as Demo['status'])}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="pending">Pending Review</option>
                      <option value="under_review">Under Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Waveform */}
                <div
                  className="mt-6 h-20 bg-white/5 rounded-lg cursor-pointer relative overflow-hidden"
                  onClick={handleWaveformClick}
                >
                  <div className="absolute inset-0 flex items-center justify-around px-1">
                    {selectedDemo.waveformData?.map((height, i) => {
                      const progress = currentTime / selectedDemo.duration;
                      const isPlayed = i / selectedDemo.waveformData!.length <= progress;
                      return (
                        <div
                          key={i}
                          className={`w-1 rounded-full transition-colors ${isPlayed ? 'bg-brand-gold' : 'bg-white/20'}`}
                          style={{ height: `${height * 100}%` }}
                        />
                      );
                    })}
                  </div>
                  {/* Timestamp markers for comments */}
                  {selectedDemo.comments.filter(c => c.timestampSeconds).map(comment => (
                    <div
                      key={comment.id}
                      className="absolute top-0 w-0.5 h-full bg-purple-500/50"
                      style={{ left: `${(comment.timestampSeconds! / selectedDemo.duration) * 100}%` }}
                      title={comment.comment}
                    />
                  ))}
                </div>

                {/* Controls */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="w-14 h-14 rounded-full bg-brand-gold text-black flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(selectedDemo.duration)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-gray-400 hover:text-white">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-20 accent-brand-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Ratings */}
              <div className="p-6 border-b border-white/5">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ratings</h3>
                <div className="grid grid-cols-5 gap-4">
                  {(['overall', 'production', 'vocals', 'lyrics', 'commercial'] as const).map(category => (
                    <div key={category} className="text-center">
                      <p className="text-xs text-gray-500 mb-2 capitalize">{category}</p>
                      <div className="flex items-center justify-center gap-1">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => updateRating(category, n)}
                            className={`w-2 h-6 rounded-sm transition-colors ${
                              n <= selectedDemo.ratings[category] ? 'bg-brand-gold' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-lg font-bold text-white mt-1">
                        {selectedDemo.ratings[category] || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Team Comments ({selectedDemo.comments.length})
                </h3>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {selectedDemo.comments.map(comment => (
                    <div key={comment.id} className="flex gap-3 p-3 bg-white/5 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-brand-gold/20 flex items-center justify-center text-brand-gold text-xs font-bold">
                        {comment.userName.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white text-sm">{comment.userName}</span>
                          {comment.timestampSeconds && (
                            <button
                              onClick={() => seekTo(comment.timestampSeconds!)}
                              className="text-xs text-brand-gold hover:underline"
                            >
                              @{formatTime(comment.timestampSeconds)}
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mt-1">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Add comment at ${formatTime(currentTime)}...`}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addComment()}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
                  />
                  <button
                    onClick={addComment}
                    className="px-4 py-3 bg-brand-gold text-black rounded-xl hover:scale-105 transition-transform"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center">
              <Headphones className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400">Select a Demo</h3>
              <p className="text-gray-500 mt-2">Choose a demo from the list to start reviewing</p>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Submit Demo</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Track Title</label>
                <input type="text" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" placeholder="Enter track title" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Artist Name</label>
                <input type="text" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white" placeholder="Enter artist name" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Genre</label>
                <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white">
                  <option>R&B</option>
                  <option>Hip-Hop</option>
                  <option>Pop</option>
                  <option>Alternative</option>
                  <option>Electronic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Audio File</label>
                <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-brand-gold/30 transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400">Drop audio file or click to upload</p>
                  <p className="text-xs text-gray-500 mt-1">MP3, WAV, FLAC up to 50MB</p>
                </div>
              </div>
              <button className="w-full py-4 bg-brand-gold text-black font-bold rounded-xl hover:scale-[1.02] transition-transform">
                Submit for Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARHubModule;
