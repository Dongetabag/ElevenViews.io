import React, { useState, useRef, useEffect } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Repeat, Shuffle, Heart, ListMusic, X, ChevronUp, ChevronDown
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  coverUrl?: string;
  audioUrl: string;
  duration: number;
}

interface MusicPlayerProps {
  playlist?: Track[];
  initialTrack?: Track;
  onClose?: () => void;
  minimized?: boolean;
}

const DEFAULT_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Pretty Girls Have Wild Stories',
    artist: 'Simeon Views',
    album: 'PGWS',
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 234
  },
  {
    id: '2',
    title: 'Midnight in Morocco',
    artist: 'Eleven Views',
    album: 'Global Sessions',
    coverUrl: 'https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 198
  },
  {
    id: '3',
    title: 'Tokyo Drift',
    artist: 'Eleven Views',
    album: 'Global Sessions',
    coverUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=300&h=300&fit=crop',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 267
  }
];

const MusicPlayer: React.FC<MusicPlayerProps> = ({
  playlist = DEFAULT_TRACKS,
  initialTrack,
  onClose,
  minimized: initialMinimized = true
}) => {
  const [currentTrack, setCurrentTrack] = useState<Track>(initialTrack || playlist[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'none' | 'all' | 'one'>('none');
  const [isLiked, setIsLiked] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [minimized, setMinimized] = useState(initialMinimized);
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
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, repeatMode]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playTrack = (track: Track) => {
    setCurrentTrack(track);
    setCurrentTime(0);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }, 100);
  };

  const playNext = () => {
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    let nextIndex;
    if (isShuffled) {
      nextIndex = Math.floor(Math.random() * playlist.length);
    } else {
      nextIndex = (currentIndex + 1) % playlist.length;
    }
    playTrack(playlist[nextIndex]);
  };

  const playPrevious = () => {
    if (currentTime > 3) {
      // If more than 3 seconds in, restart current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
      return;
    }
    const currentIndex = playlist.findIndex(t => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    playTrack(playlist[prevIndex]);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * duration;
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const cycleRepeat = () => {
    const modes: ('none' | 'all' | 'one')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(repeatMode);
    setRepeatMode(modes[(currentIndex + 1) % 3]);
  };

  if (minimized) {
    return (
      <div className="fixed bottom-0 left-0 right-0 h-20 bg-black/95 backdrop-blur-xl border-t border-white/5 z-50">
        <audio ref={audioRef} src={currentTrack.audioUrl} preload="metadata" />

        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 bg-white/10 cursor-pointer group"
          onClick={seekTo}
        >
          <div
            className="h-full bg-brand-gold transition-all"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-brand-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${(currentTime / duration) * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between h-full px-4">
          {/* Track Info */}
          <div className="flex items-center gap-4 w-1/4">
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
              {currentTrack.coverUrl ? (
                <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-brand-gold">
                  <ListMusic className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-white truncate">{currentTrack.title}</p>
              <p className="text-sm text-gray-400 truncate">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-1 w-2/4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffled(!isShuffled)}
                className={`p-2 transition-colors ${isShuffled ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={playPrevious} className="p-2 text-gray-400 hover:text-white transition-colors">
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={playNext} className="p-2 text-gray-400 hover:text-white transition-colors">
                <SkipForward className="w-5 h-5" />
              </button>
              <button
                onClick={cycleRepeat}
                className={`p-2 transition-colors relative ${repeatMode !== 'none' ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
              >
                <Repeat className="w-4 h-4" />
                {repeatMode === 'one' && (
                  <span className="absolute -top-1 -right-1 text-[10px] font-bold">1</span>
                )}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 w-full max-w-md">
              <span className="w-10 text-right">{formatTime(currentTime)}</span>
              <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-brand-gold" style={{ width: `${(currentTime / duration) * 100}%` }} />
              </div>
              <span className="w-10">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center justify-end gap-4 w-1/4">
            <button
              onClick={() => setShowPlaylist(!showPlaylist)}
              className={`p-2 transition-colors ${showPlaylist ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
            >
              <ListMusic className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-gray-400 hover:text-white">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
                className="w-24 accent-brand-gold"
              />
            </div>
            <button
              onClick={() => setMinimized(false)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Playlist Dropdown */}
        {showPlaylist && (
          <div className="absolute bottom-full right-4 mb-2 w-80 max-h-96 bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-white/5">
              <h3 className="font-semibold text-white">Queue</h3>
            </div>
            <div className="overflow-y-auto max-h-72">
              {playlist.map((track, i) => (
                <button
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors ${
                    track.id === currentTrack.id ? 'bg-brand-gold/10' : ''
                  }`}
                >
                  <span className="w-6 text-center text-sm text-gray-500">
                    {track.id === currentTrack.id && isPlaying ? (
                      <span className="text-brand-gold">♪</span>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="w-10 h-10 rounded overflow-hidden bg-white/10 flex-shrink-0">
                    {track.coverUrl && (
                      <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className={`text-sm truncate ${track.id === currentTrack.id ? 'text-brand-gold' : 'text-white'}`}>
                      {track.title}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                  </div>
                  <span className="text-xs text-gray-500">{formatTime(track.duration)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Expanded view
  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <audio ref={audioRef} src={currentTrack.audioUrl} preload="metadata" />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <button
          onClick={() => setMinimized(true)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <span className="text-sm text-gray-400 uppercase tracking-wider">Now Playing</span>
        <button
          onClick={() => setShowPlaylist(!showPlaylist)}
          className={`p-2 transition-colors ${showPlaylist ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
        >
          <ListMusic className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {/* Album Art */}
          <div className="w-80 h-80 mx-auto rounded-2xl overflow-hidden shadow-2xl mb-8">
            {currentTrack.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-brand-gold/20 to-purple-500/20 flex items-center justify-center">
                <ListMusic className="w-24 h-24 text-brand-gold" />
              </div>
            )}
          </div>

          {/* Track Info */}
          <h2 className="text-2xl font-bold text-white mb-2">{currentTrack.title}</h2>
          <p className="text-gray-400 mb-8">{currentTrack.artist}</p>

          {/* Progress */}
          <div className="mb-6">
            <div
              className="h-1 bg-white/10 rounded-full cursor-pointer group"
              onClick={seekTo}
            >
              <div
                className="h-full bg-brand-gold rounded-full relative"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-brand-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-sm text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={() => setIsShuffled(!isShuffled)}
              className={`p-3 transition-colors ${isShuffled ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
            >
              <Shuffle className="w-6 h-6" />
            </button>
            <button onClick={playPrevious} className="p-3 text-gray-400 hover:text-white transition-colors">
              <SkipBack className="w-8 h-8" />
            </button>
            <button
              onClick={togglePlay}
              className="w-16 h-16 rounded-full bg-brand-gold text-black flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
            </button>
            <button onClick={playNext} className="p-3 text-gray-400 hover:text-white transition-colors">
              <SkipForward className="w-8 h-8" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`p-3 transition-colors relative ${repeatMode !== 'none' ? 'text-brand-gold' : 'text-gray-400 hover:text-white'}`}
            >
              <Repeat className="w-6 h-6" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-xs font-bold">1</span>
              )}
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-gray-400 hover:text-white">
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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
              className="w-32 accent-brand-gold"
            />
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
