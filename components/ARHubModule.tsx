import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Music, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Upload, Star, MessageSquare, Clock, User, Filter, Search,
  ChevronDown, MoreVertical, ThumbsUp, ThumbsDown, Send, X,
  Headphones, Mic2, TrendingUp, CheckCircle, XCircle, AlertCircle,
  Loader2, Sparkles, RefreshCw, FolderOpen
} from 'lucide-react';
import { arService, DemoSubmission, ARRatings } from '../services/arService';
import { useCurrentUser } from '../hooks/useAppStore';

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

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

const ARHubModule: React.FC = () => {
  const { user: currentUser } = useCurrentUser();
  const [demos, setDemos] = useState<DemoSubmission[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<DemoSubmission | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newComment, setNewComment] = useState('');
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Keep selectedDemo in ref to avoid stale closures
  const selectedDemoRef = useRef<DemoSubmission | null>(null);
  selectedDemoRef.current = selectedDemo;

  // Fetch demos from MCP on mount
  const fetchDemos = useCallback(async () => {
    setIsFetching(true);
    try {
      const fetchedDemos = await arService.fetchDemos();
      setDemos(fetchedDemos);
    } catch (err) {
      console.error('Failed to fetch demos:', err);
    }
    setIsFetching(false);
  }, []);

  useEffect(() => {
    fetchDemos();
  }, [fetchDemos]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle audio source change when demo changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedDemo) return;

    // Reset state for new track
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioError(null);
    setIsLoading(true);

    // Set source and load
    audio.src = selectedDemo.audioUrl;
    audio.load();
  }, [selectedDemo?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setAudioError(null);
    };
    const handleCanPlay = () => {
      setIsLoading(false);
      setAudioError(null);
    };
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setAudioError('Unable to load audio file');
      setIsLoading(false);
      setIsPlaying(false);
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      setAudioError(null);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  const togglePlay = async () => {
    if (!audioRef.current || !selectedDemo) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback error:', err);
        setAudioError('Unable to play audio');
      }
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedDemo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const targetDuration = duration || selectedDemo.duration;
    seekTo(percent * targetDuration);
  };

  const updateRating = (category: keyof ARRatings, value: number) => {
    if (!selectedDemo) return;

    // Update via service (persists to storage)
    const updatedRatings = arService.updateRatings(selectedDemo.key, { [category]: value });

    // Update local state
    const updatedDemo = {
      ...selectedDemo,
      ratings: updatedRatings
    };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
  };

  const updateStatus = (status: DemoSubmission['status']) => {
    if (!selectedDemo) return;

    // Update via service (persists to storage)
    arService.updateStatus(selectedDemo.key, status, currentUser?.name);

    // Update local state
    const updatedDemo = { ...selectedDemo, status };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
  };

  const updatePriority = (priority: DemoSubmission['priority']) => {
    if (!selectedDemo) return;

    // Update via service
    arService.updateMetadata(selectedDemo.key, { priority });

    // Update local state
    const updatedDemo = { ...selectedDemo, priority };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
  };

  const addComment = () => {
    if (!selectedDemo || !newComment.trim()) return;

    // Add via service (persists to storage)
    const comment = arService.addComment(selectedDemo.key, {
      oderId: currentUser?.id || 'anonymous',
      userName: currentUser?.name || 'Anonymous',
      comment: newComment,
      timestampSeconds: Math.floor(currentTime)
    });

    // Update local state
    const updatedDemo = {
      ...selectedDemo,
      comments: [...selectedDemo.comments, comment]
    };
    setSelectedDemo(updatedDemo);
    setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
    setNewComment('');
  };

  const generateAIFeedback = async () => {
    if (!selectedDemo || isGeneratingFeedback) return;
    setIsGeneratingFeedback(true);

    try {
      const prompt = `You are an A&R professional at Eleven Views, a boutique production company. Generate constructive feedback for a demo submission.

Track: "${selectedDemo.title}"
Artist: ${selectedDemo.artistName}
Genre: ${selectedDemo.genre}
Current Ratings: Production ${selectedDemo.ratings.production}/10, Vocals ${selectedDemo.ratings.vocals}/10, Lyrics ${selectedDemo.ratings.lyrics}/10, Commercial Potential ${selectedDemo.ratings.commercial}/10

Provide brief, professional A&R feedback (2-3 sentences) focusing on:
- What works well in this track
- One specific area for improvement
- Commercial viability assessment

Keep the tone supportive but honest. Be specific, not generic.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 256
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (feedback) {
          // Add via service
          const comment = arService.addComment(selectedDemo.key, {
            oderId: 'ai',
            userName: 'AI A&R Assistant',
            comment: feedback
          });

          const updatedDemo = {
            ...selectedDemo,
            comments: [...selectedDemo.comments, comment]
          };
          setSelectedDemo(updatedDemo);
          setDemos(demos.map(d => d.id === selectedDemo.id ? updatedDemo : d));
        }
      }
    } catch (err) {
      console.error('AI feedback error:', err);
    } finally {
      setIsGeneratingFeedback(false);
    }
  };

  const filteredDemos = demos.filter(demo => {
    const matchesStatus = filterStatus === 'all' || demo.status === filterStatus;
    const matchesSearch = demo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          demo.artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          demo.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const stats = arService.getStats(demos);

  return (
    <div className="p-6 space-y-6 h-full flex flex-col bg-[#050505]">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold font-orbitron text-white">A&R Hub</h1>
          <p className="text-gray-400 mt-1">Review and manage all audio submissions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDemos}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-brand-gold text-black font-bold rounded-xl hover:scale-105 transition-transform"
          >
            <Upload className="w-5 h-5" />
            Submit Demo
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 flex-shrink-0">
        {[
          { label: 'Total Demos', value: stats.total, icon: Music, color: 'text-brand-gold' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
          { label: 'In Review', value: stats.underReview, icon: Headphones, color: 'text-blue-400' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-400' },
          { label: 'Avg Rating', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-purple-400' }
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
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
      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search demos by title, artist, genre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
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

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Demo List */}
        <div className="col-span-5 overflow-y-auto space-y-3 pr-2">
          {isFetching && demos.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 text-brand-gold animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading audio files...</p>
              </div>
            </div>
          ) : filteredDemos.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Music className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  {demos.length === 0 ? 'No demos yet' : 'No matching demos'}
                </h3>
                <p className="text-gray-500">
                  {demos.length === 0 ? 'Upload audio files to start reviewing' : 'Try adjusting your filters'}
                </p>
              </div>
            </div>
          ) : (
            filteredDemos.map(demo => {
              const StatusIcon = STATUS_CONFIG[demo.status].icon;
              return (
                <div
                  key={demo.id}
                  onClick={() => setSelectedDemo(demo)}
                  className={`p-4 rounded-xl bg-white/[0.02] border cursor-pointer transition-all hover:border-brand-gold/30 ${
                    selectedDemo?.id === demo.id ? 'border-brand-gold/50 bg-brand-gold/5' : 'border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-brand-gold/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-brand-gold" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white truncate">{demo.title}</h3>
                        {demo.priority === 'urgent' && <span className="text-xs text-red-400">●</span>}
                        {demo.priority === 'high' && <span className="text-xs text-orange-400">●</span>}
                      </div>
                      <p className="text-sm text-gray-400 truncate">{demo.artistName}</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${STATUS_CONFIG[demo.status].bg} ${STATUS_CONFIG[demo.status].color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {STATUS_CONFIG[demo.status].label}
                        </span>
                        <span className="text-xs text-gray-500">{demo.genre}</span>
                        <span className="text-xs text-gray-500">{formatTime(demo.duration)}</span>
                      </div>
                      {demo.projectName && (
                        <div className="flex items-center gap-1 mt-2">
                          <FolderOpen className="w-3 h-3 text-purple-400" />
                          <span className="text-xs text-purple-400">{demo.projectName}</span>
                        </div>
                      )}
                    </div>
                    {demo.ratings.overall > 0 && (
                      <div className="flex items-center gap-1 text-brand-gold flex-shrink-0">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{demo.ratings.overall}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Demo Detail & Player */}
        <div className="col-span-7 overflow-y-auto">
          {selectedDemo ? (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              {/* Audio Element */}
              <audio ref={audioRef} preload="auto" />

              {/* Player Header */}
              <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedDemo.title}</h2>
                    <p className="text-gray-400 mt-1">{selectedDemo.artistName} • {selectedDemo.genre}</p>
                    {selectedDemo.projectName && (
                      <div className="flex items-center gap-1 mt-2">
                        <FolderOpen className="w-4 h-4 text-purple-400" />
                        <span className="text-sm text-purple-400">{selectedDemo.projectName}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDemo.priority}
                      onChange={(e) => updatePriority(e.target.value as DemoSubmission['priority'])}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-brand-gold/50"
                    >
                      <option value="low">Low Priority</option>
                      <option value="normal">Normal</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <select
                      value={selectedDemo.status}
                      onChange={(e) => updateStatus(e.target.value as DemoSubmission['status'])}
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
                      const targetDuration = duration || selectedDemo.duration;
                      const progress = currentTime / targetDuration;
                      const isPlayed = i / (selectedDemo.waveformData?.length || 100) <= progress;
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
                  {selectedDemo.comments.filter(c => c.timestampSeconds).map(comment => {
                    const targetDuration = duration || selectedDemo.duration;
                    return (
                      <div
                        key={comment.id}
                        className="absolute top-0 w-0.5 h-full bg-purple-500/50"
                        style={{ left: `${(comment.timestampSeconds! / targetDuration) * 100}%` }}
                        title={comment.comment}
                      />
                    );
                  })}
                </div>

                {/* Controls */}
                <div className="mt-4 flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={isLoading || !!audioError}
                    className="w-14 h-14 rounded-full bg-brand-gold text-black flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6 ml-1" />
                    )}
                  </button>
                  <div className="flex-1">
                    {/* Progress slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-10 text-right font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <div className="flex-1">
                        <input
                          type="range"
                          min="0"
                          max={duration || selectedDemo.duration || 100}
                          value={currentTime}
                          onChange={(e) => seekTo(parseFloat(e.target.value))}
                          className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-brand-gold
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:shadow-lg
                            [&::-webkit-slider-thumb]:shadow-brand-gold/30"
                          style={{
                            background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${(currentTime / (duration || selectedDemo.duration || 1)) * 100}%, rgba(255,255,255,0.1) ${(currentTime / (duration || selectedDemo.duration || 1)) * 100}%, rgba(255,255,255,0.1) 100%)`
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-10 font-mono">
                        {formatTime(duration || selectedDemo.duration)}
                      </span>
                    </div>
                    {audioError && (
                      <p className="text-xs text-red-400 mt-2">{audioError}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-gray-400 hover:text-white">
                      {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        setVolume(parseFloat(e.target.value));
                        if (parseFloat(e.target.value) > 0) setIsMuted(false);
                      }}
                      className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-white
                        [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Ratings */}
              <div className="p-6 border-b border-white/[0.06]">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Ratings</h3>
                <div className="grid grid-cols-5 gap-4">
                  {(['overall', 'production', 'vocals', 'lyrics', 'commercial'] as const).map(category => (
                    <div key={category} className="text-center">
                      <p className="text-xs text-gray-500 mb-2 capitalize">{category}</p>
                      <div className="flex items-center justify-center gap-0.5">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                          <button
                            key={n}
                            onClick={() => updateRating(category, n)}
                            className={`w-2 h-6 rounded-sm transition-colors ${
                              n <= selectedDemo.ratings[category] ? 'bg-brand-gold' : 'bg-white/10 hover:bg-white/20'
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                    Team Comments ({selectedDemo.comments.length})
                  </h3>
                  <button
                    onClick={generateAIFeedback}
                    disabled={isGeneratingFeedback || !GOOGLE_AI_API_KEY}
                    className="flex items-center gap-2 px-3 py-1.5 bg-brand-gold/10 text-brand-gold text-xs font-medium rounded-lg hover:bg-brand-gold/20 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingFeedback ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isGeneratingFeedback ? 'Generating...' : 'AI Feedback'}
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto mb-4">
                  {selectedDemo.comments.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No comments yet</p>
                    </div>
                  ) : (
                    selectedDemo.comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 p-3 bg-white/5 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          comment.userName === 'AI A&R Assistant'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-brand-gold/20 text-brand-gold'
                        }`}>
                          {comment.userName === 'AI A&R Assistant' ? (
                            <Sparkles className="w-4 h-4" />
                          ) : (
                            comment.userName.charAt(0)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{comment.userName}</span>
                            {comment.timestampSeconds !== undefined && (
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
                    ))
                  )}
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
                    disabled={!newComment.trim()}
                    className="px-4 py-3 bg-brand-gold text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="text-center">
                <Headphones className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-400">Select a Demo</h3>
                <p className="text-gray-500 mt-2">Choose a demo from the list to start reviewing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Submit Demo</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                Upload audio files to the Media Library. They will automatically appear here for A&R review.
              </p>
              <div className="p-8 border-2 border-dashed border-white/10 rounded-xl text-center">
                <Upload className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 mb-2">Use the Asset Library to upload audio files</p>
                <p className="text-xs text-gray-500">All audio uploads appear here for review</p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="w-full py-3 bg-brand-gold text-black font-bold rounded-xl"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARHubModule;
