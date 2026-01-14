import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAssetStreamUrl } from '../services/wasabiService';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Minimize, PictureInPicture2, Settings, X,
  ChevronRight, ChevronLeft, Clock, Folder, SortAsc,
  Grid, List, Search, Film, Loader2
} from 'lucide-react';
import { VideoTrack, Asset } from '../types';

interface VideoPlayerProps {
  videos: Asset[];
  initialVideo?: Asset;
  onClose?: () => void;
  onVideoSelect?: (video: Asset) => void;
}

type SortOption = 'recent' | 'name' | 'duration' | 'category';

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videos,
  initialVideo,
  onClose,
  onVideoSelect
}) => {
  const [currentVideo, setCurrentVideo] = useState<Asset | null>(initialVideo || videos[0] || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [libraryView, setLibraryView] = useState<'grid' | 'list'>('list');
  const [hoveredVideo, setHoveredVideo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingAutoPlayRef = useRef<boolean>(false);

  // Filter videos to only show video type
  const videoFiles = videos.filter(v => v.type === 'video');

  // Sort and filter videos
  const filteredVideos = videoFiles
    .filter(v =>
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'duration':
          return (b.duration || 0) - (a.duration || 0);
        case 'category':
          return (a.subcategory || '').localeCompare(b.subcategory || '');
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Handle volume changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Handle playback speed changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleCanPlay = () => {
      if (pendingAutoPlayRef.current) {
        pendingAutoPlayRef.current = false;
        video.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Auto-play failed:', err);
          setIsPlaying(false);
        });
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [currentVideo]);

  // Hide controls after inactivity
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'm':
          setIsMuted(m => !m);
          break;
        case 'ArrowLeft':
          if (videoRef.current) videoRef.current.currentTime -= 10;
          break;
        case 'ArrowRight':
          if (videoRef.current) videoRef.current.currentTime += 10;
          break;
        case 'ArrowUp':
          setVolume(v => Math.min(1, v + 0.1));
          break;
        case 'ArrowDown':
          setVolume(v => Math.max(0, v - 0.1));
          break;
        case 'l':
          setShowLibrary(s => !s);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playVideo = (video: Asset) => {
    pendingAutoPlayRef.current = true;
    setCurrentVideo(video);
    setCurrentTime(0);
    onVideoSelect?.(video);
  };

  const playNext = () => {
    if (!currentVideo) return;
    const currentIndex = filteredVideos.findIndex(v => v.id === currentVideo.id);
    const nextIndex = (currentIndex + 1) % filteredVideos.length;
    if (filteredVideos[nextIndex]) {
      playVideo(filteredVideos[nextIndex]);
    }
  };

  const playPrevious = () => {
    if (!currentVideo) return;
    if (currentTime > 3 && videoRef.current) {
      videoRef.current.currentTime = 0;
      return;
    }
    const currentIndex = filteredVideos.findIndex(v => v.id === currentVideo.id);
    const prevIndex = currentIndex === 0 ? filteredVideos.length - 1 : currentIndex - 1;
    if (filteredVideos[prevIndex]) {
      playVideo(filteredVideos[prevIndex]);
    }
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = percent * duration;
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex"
      onMouseMove={resetControlsTimeout}
    >
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col relative ${showLibrary ? 'md:mr-80' : ''}`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 left-4 z-20 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <X className="w-6 h-6" />
        </button>

        {/* Mobile Library Toggle */}
        <button
          onClick={() => setShowLibrary(!showLibrary)}
          className={`md:hidden absolute top-4 right-4 z-20 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-all ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <List className="w-6 h-6" />
        </button>

        {/* Video Container */}
        <div className="flex-1 flex items-center justify-center relative">
          {currentVideo ? (
            <>
              <video
                key={currentVideo.id}
                ref={videoRef}
                src={getAssetStreamUrl(currentVideo)}
                className="max-w-full max-h-full cursor-pointer"
                onClick={togglePlay}
                playsInline
              />
              {/* Buffering Indicator */}
              {isBuffering && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-12 h-12 text-brand-gold animate-spin" />
                </div>
              )}
              {/* Play/Pause Overlay */}
              {!isPlaying && !isBuffering && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                >
                  <div className="w-20 h-20 rounded-full bg-brand-gold/90 flex items-center justify-center">
                    <Play className="w-10 h-10 text-black ml-1" />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-gray-500 flex flex-col items-center gap-4">
              <Film className="w-16 h-16" />
              <p>Select a video from the library</p>
            </div>
          )}
        </div>

        {/* Controls Bar */}
        <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3 sm:p-4 transition-opacity ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}>
          {/* Progress Bar */}
          <div
            className="h-2 sm:h-1 bg-white/20 rounded-full cursor-pointer group mb-3 sm:mb-4"
            onClick={seekTo}
          >
            <div
              className="h-full bg-brand-gold rounded-full relative"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-3 sm:h-3 bg-brand-gold rounded-full sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={playPrevious} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-brand-gold transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={playNext} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-brand-gold transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume - Hidden on mobile */}
              <div className="hidden sm:flex items-center gap-2 group">
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-brand-gold">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    setVolume(parseFloat(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-0 group-hover:w-20 transition-all accent-brand-gold"
                />
              </div>

              {/* Time Display */}
              <span className="text-white text-xs sm:text-sm whitespace-nowrap">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Video Title - Hidden on mobile */}
            {currentVideo && (
              <div className="hidden md:flex flex-1 text-center px-4">
                <p className="text-white font-medium truncate w-full">{currentVideo.name}</p>
              </div>
            )}

            {/* Right Controls */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Playback Speed - Hidden on mobile */}
              <div className="hidden sm:block relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-brand-gold transition-colors"
                >
                  <Settings className="w-5 h-5" />
                </button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-lg p-2 min-w-[150px]">
                    <p className="text-xs text-gray-400 mb-2 px-2">Playback Speed</p>
                    {speedOptions.map(speed => (
                      <button
                        key={speed}
                        onClick={() => {
                          setPlaybackSpeed(speed);
                          setShowSettings(false);
                        }}
                        className={`w-full text-left px-3 py-2 min-h-[44px] rounded text-sm transition-colors ${
                          playbackSpeed === speed
                            ? 'bg-brand-gold/20 text-brand-gold'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {speed === 1 ? 'Normal' : `${speed}x`}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* PiP - Hidden on mobile */}
              <button
                onClick={togglePictureInPicture}
                className="hidden sm:flex p-2 min-h-[44px] min-w-[44px] items-center justify-center text-white hover:text-brand-gold transition-colors"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>

              {/* Toggle Library - Hidden on mobile (use top button) */}
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className={`hidden md:flex p-2 min-h-[44px] min-w-[44px] items-center justify-center transition-colors ${showLibrary ? 'text-brand-gold' : 'text-white hover:text-brand-gold'}`}
              >
                {showLibrary ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white hover:text-brand-gold transition-colors"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Video Library Sidebar - Mobile drawer / Desktop fixed */}
      {showLibrary && (
        <div className="fixed inset-0 md:relative md:inset-auto w-full md:w-80 bg-black/95 md:border-l border-white/10 flex flex-col h-full z-40 md:z-auto">
          {/* Mobile Close Button */}
          <button
            onClick={() => setShowLibrary(false)}
            className="md:hidden absolute top-4 right-4 z-10 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full bg-white/10 text-white"
          >
            <X className="w-6 h-6" />
          </button>
          {/* Library Header */}
          <div className="p-4 border-b border-white/10 pt-16 md:pt-4">
            <h3 className="font-semibold text-white mb-3">Video Library</h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
              />
            </div>

            {/* Sort & View Controls */}
            <div className="flex items-center justify-between">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-white/5 border border-white/10 rounded text-white text-xs px-2 py-2 min-h-[44px] focus:outline-none"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="duration">Duration</option>
                <option value="category">Category</option>
              </select>
              <div className="flex gap-1">
                <button
                  onClick={() => setLibraryView('list')}
                  className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded ${libraryView === 'list' ? 'bg-brand-gold/20 text-brand-gold' : 'text-gray-400 hover:text-white'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setLibraryView('grid')}
                  className={`p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded ${libraryView === 'grid' ? 'bg-brand-gold/20 text-brand-gold' : 'text-gray-400 hover:text-white'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Video List - Smooth momentum scroll */}
          <div className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-contain">
            {filteredVideos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Film className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No videos found</p>
              </div>
            ) : libraryView === 'list' ? (
              <div className="divide-y divide-white/5">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => { playVideo(video); if (window.innerWidth < 768) setShowLibrary(false); }}
                    onMouseEnter={() => setHoveredVideo(video.id)}
                    onMouseLeave={() => setHoveredVideo(null)}
                    className={`w-full flex items-center gap-3 p-3 min-h-[64px] hover:bg-white/5 transition-colors ${
                      currentVideo?.id === video.id ? 'bg-brand-gold/10' : ''
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-24 h-14 rounded overflow-hidden bg-white/10 flex-shrink-0 relative">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      {/* Duration badge */}
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                          {formatTime(video.duration)}
                        </span>
                      )}
                      {/* Play indicator on hover */}
                      {hoveredVideo === video.id && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm truncate ${
                        currentVideo?.id === video.id ? 'text-brand-gold' : 'text-white'
                      }`}>
                        {video.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {video.subcategory && (
                          <span className="flex items-center gap-1">
                            <Folder className="w-3 h-3" />
                            {video.subcategory}
                          </span>
                        )}
                        <span>{formatFileSize(video.size)}</span>
                      </div>
                    </div>

                    {/* Now Playing indicator */}
                    {currentVideo?.id === video.id && isPlaying && (
                      <div className="flex gap-0.5">
                        {[1,2,3].map(i => (
                          <div
                            key={i}
                            className="w-0.5 bg-brand-gold animate-pulse"
                            style={{
                              height: `${8 + Math.random() * 8}px`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              // Grid View
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 p-2">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => { playVideo(video); if (window.innerWidth < 768) setShowLibrary(false); }}
                    onMouseEnter={() => setHoveredVideo(video.id)}
                    onMouseLeave={() => setHoveredVideo(null)}
                    className={`rounded-lg overflow-hidden relative group ${
                      currentVideo?.id === video.id ? 'ring-2 ring-brand-gold' : ''
                    }`}
                  >
                    <div className="aspect-video bg-white/10">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                    </div>

                    {/* Overlay */}
                    <div className={`absolute inset-0 bg-black/60 flex flex-col justify-end p-2 transition-opacity ${
                      hoveredVideo === video.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <p className="text-white text-xs truncate">{video.name}</p>
                      {video.duration && (
                        <p className="text-gray-400 text-xs">{formatTime(video.duration)}</p>
                      )}
                    </div>

                    {/* Duration badge */}
                    {video.duration && (
                      <span className="absolute top-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                        {formatTime(video.duration)}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Library Footer */}
          <div className="p-3 border-t border-white/10 text-center">
            <p className="text-xs text-gray-500">
              {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
