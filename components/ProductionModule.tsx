import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Film, Video, Play, Pause, Upload, Download, Share2, X, Loader2,
  Sparkles, Plus, Grid3X3, List, Search, Filter, MoreVertical,
  Image, Type, Wand2, Clock, Check, ChevronDown, Trash2, Edit3,
  Copy, Heart, FolderOpen, Layers, ZoomIn, Move, RotateCcw,
  Volume2, VolumeX, Maximize2, Settings, ArrowLeft, Music,
  Scissors, Link, Twitter, Instagram, MessageCircle, CheckCircle,
  Sliders, Zap, FileText, Mic, AlertCircle, Bot, Palette,
  FastForward, Rewind, SkipBack, SkipForward, Gauge, Eye, EyeOff
} from 'lucide-react';
import { veoService, VideoGenerationConfig, GenerationResult, VideoAsset, AspectRatio } from '../services/veoService';
import { getGoogleAIKey } from '../services/aiConfig';
import { videoAgents, VideoProductionAgentManager } from '../services/videoProductionAgents';


// localStorage key for production videos
const PRODUCTION_STORAGE_KEY = "eleven-views-production-videos";

// Types
type ViewMode = 'library' | 'generate' | 'editor' | 'preview';
type GenerateMode = 'text-to-video' | 'image-to-video';
type LibraryFilter = 'all' | 'generated' | 'uploaded' | 'favorites';
type ActiveTool = 'enhance' | 'captions' | 'audio' | 'trim' | 'speed' | 'filters' | 'text' | 'agents' | null;
type ExportQuality = '720p' | '1080p' | '4k';
type ExportFormat = 'mp4' | 'webm' | 'mov';

interface Caption {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface AudioTrack {
  id: string;
  name: string;
  type: 'music' | 'voiceover' | 'sfx';
  url?: string;
  volume: number;
}

interface EnhancementSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  stabilization: boolean;
  noiseReduction: boolean;
  colorGrading: 'none' | 'cinematic' | 'vibrant' | 'vintage' | 'bw';
}

interface TrimSettings {
  startTime: number;
  endTime: number;
}

interface SpeedSettings {
  rate: number;
  preservePitch: boolean;
}

interface FilterSettings {
  type: string;
  intensity: number;
}

interface TextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
  startTime: number;
  endTime: number;
  animation: string;
}

interface AgentResult {
  agentId: string;
  result: any;
  timestamp: string;
}

interface VideoItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: number;
  aspectRatio: AspectRatio;
  type: 'generated' | 'uploaded';
  createdAt: string;
  isFavorite: boolean;
  prompt?: string;
}

// Sample data for demo
const SAMPLE_VIDEOS: VideoItem[] = [
  {
    id: '1',
    name: 'Product Showcase',
    thumbnailUrl: 'https://picsum.photos/seed/v1/400/225',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 8,
    aspectRatio: '16:9',
    type: 'generated',
    createdAt: new Date().toISOString(),
    isFavorite: true,
    prompt: 'A sleek product rotating on a white background with soft lighting'
  },
  {
    id: '2',
    name: 'Brand Intro',
    thumbnailUrl: 'https://picsum.photos/seed/v2/400/225',
    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 15,
    aspectRatio: '16:9',
    type: 'generated',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    isFavorite: false,
    prompt: 'Modern logo animation with particle effects'
  },
  {
    id: '3',
    name: 'Social Reel',
    thumbnailUrl: 'https://picsum.photos/seed/v3/225/400',
    duration: 12,
    aspectRatio: '9:16',
    type: 'uploaded',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    isFavorite: false
  },
];

const STYLE_PRESETS = [
  { id: 'cinematic', name: 'Cinematic', icon: '🎬' },
  { id: 'minimal', name: 'Minimal', icon: '◻️' },
  { id: 'dynamic', name: 'Dynamic', icon: '⚡' },
  { id: 'elegant', name: 'Elegant', icon: '✨' },
  { id: 'bold', name: 'Bold', icon: '💥' },
  { id: 'soft', name: 'Soft', icon: '🌸' },
];

const FILTER_PRESETS = [
  { id: 'none', name: 'Original', css: '' },
  { id: 'cinematic', name: 'Cinematic', css: 'contrast(1.1) saturate(0.9) brightness(0.95)' },
  { id: 'vibrant', name: 'Vibrant', css: 'saturate(1.3) contrast(1.05)' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.3) saturate(0.8) contrast(0.9)' },
  { id: 'bw', name: 'B&W', css: 'grayscale(1) contrast(1.1)' },
  { id: 'cool', name: 'Cool', css: 'saturate(1.1) hue-rotate(-10deg) brightness(1.05)' },
  { id: 'warm', name: 'Warm', css: 'saturate(1.1) hue-rotate(10deg) brightness(1.02)' },
  { id: 'dramatic', name: 'Dramatic', css: 'contrast(1.3) saturate(0.85) brightness(0.9)' },
  { id: 'soft', name: 'Soft', css: 'contrast(0.9) brightness(1.05) saturate(0.95)' },
  { id: 'noir', name: 'Film Noir', css: 'grayscale(1) contrast(1.4) brightness(0.85)' },
];

const SPEED_PRESETS = [
  { value: 0.25, label: '0.25x' },
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
];

const TEXT_ANIMATIONS = [
  { id: 'fade', name: 'Fade In' },
  { id: 'slideUp', name: 'Slide Up' },
  { id: 'slideDown', name: 'Slide Down' },
  { id: 'typewriter', name: 'Typewriter' },
  { id: 'bounce', name: 'Bounce' },
  { id: 'scale', name: 'Scale' },
];

const ProductionModule: React.FC = () => {
  // View state
  const [view, setView] = useState<ViewMode>('library');
  const [generateMode, setGenerateMode] = useState<GenerateMode>('text-to-video');

  // Library state
  const [videos, setVideos] = useState<VideoItem[]>(() => {
    try {
      const stored = localStorage.getItem(PRODUCTION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load production videos:", e);
    }
    return SAMPLE_VIDEOS;
  });
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStyle, setViewStyle] = useState<'grid' | 'list'>('grid');

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [duration, setDuration] = useState<4 | 6 | 8>(8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');

  // Image-to-video state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [motionPrompt, setMotionPrompt] = useState('');

  // Editor state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // AI Tools state
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Enhancement state
  const [enhancementSettings, setEnhancementSettings] = useState<EnhancementSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    stabilization: false,
    noiseReduction: false,
    colorGrading: 'none'
  });

  // Captions state
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionStyle, setCaptionStyle] = useState<'minimal' | 'bold' | 'highlight'>('minimal');

  // Audio state
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState(50);
  const [originalVolume, setOriginalVolume] = useState(100);

  // Trim state
  const [trimSettings, setTrimSettings] = useState<TrimSettings>({ startTime: 0, endTime: 0 });
  const [trimPreviewActive, setTrimPreviewActive] = useState(false);

  // Speed state
  const [speedSettings, setSpeedSettings] = useState<SpeedSettings>({ rate: 1, preservePitch: true });

  // Filters state
  const [activeFilter, setActiveFilter] = useState<FilterSettings | null>(null);
  const [filterIntensity, setFilterIntensity] = useState(100);

  // Text overlay state
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [newTextOverlay, setNewTextOverlay] = useState('');

  // AI Agents state
  const [agentResults, setAgentResults] = useState<AgentResult[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [agentProcessing, setAgentProcessing] = useState(false);

  // Share/Export state
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportQuality, setExportQuality] = useState<ExportQuality>('1080p');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [shareLink, setShareLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Refs
  
  // Save videos to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(PRODUCTION_STORAGE_KEY, JSON.stringify(videos));
    } catch (e) {
      console.error("Failed to save production videos:", e);
    }
  }, [videos]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Filter videos
  const filteredVideos = videos.filter(v => {
    if (libraryFilter === 'favorites' && !v.isFavorite) return false;
    if (libraryFilter === 'generated' && v.type !== 'generated') return false;
    if (libraryFilter === 'uploaded' && v.type !== 'uploaded') return false;
    if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Handle video upload
  const handleUpload = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('video/')) {
      alert('Please select a video file');
      return;
    }

    const newVideo: VideoItem = {
      id: `upload_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      thumbnailUrl: 'https://picsum.photos/seed/' + Date.now() + '/400/225',
      videoUrl: URL.createObjectURL(file),
      duration: 0,
      aspectRatio: '16:9',
      type: 'uploaded',
      createdAt: new Date().toISOString(),
      isFavorite: false
    };

    setVideos(prev => [newVideo, ...prev]);
    setSelectedVideo(newVideo);
    setView('editor');
  }, []);

  // Handle image selection for image-to-video
  const handleImageSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Generate video
  const handleGenerate = async () => {
    if (generateMode === 'text-to-video' && !prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    if (generateMode === 'image-to-video' && !selectedImage) {
      alert('Please select an image');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing AI...');

    try {
      const config: VideoGenerationConfig = {
        aspectRatio,
        durationSeconds: duration,
        resolution: '1080p',
        generateAudio: true,
      };

      let result: GenerationResult;

      if (generateMode === 'text-to-video') {
        const enhancedPrompt = `${prompt}. Style: ${selectedStyle}. High quality, professional.`;
        result = await veoService.generateFromText(enhancedPrompt, config);
      } else {
        result = await veoService.generateFromImage(
          selectedImage!,
          motionPrompt || 'Gentle cinematic motion with smooth camera movement',
          config
        );
      }

      // Poll for updates
      const pollInterval = setInterval(() => {
        const status = veoService.getStatus(result.id);
        if (status) {
          setGenerationProgress(status.progress);
          if (status.progress < 30) setGenerationStatus('Analyzing prompt...');
          else if (status.progress < 60) setGenerationStatus('Generating frames...');
          else if (status.progress < 90) setGenerationStatus('Rendering video...');
          else setGenerationStatus('Finalizing...');

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);

            if (status.status === 'completed' && status.videoUrl) {
              const newVideo: VideoItem = {
                id: result.id,
                name: generateMode === 'text-to-video'
                  ? prompt.slice(0, 30) + '...'
                  : 'Animated Image',
                thumbnailUrl: status.thumbnailUrl || 'https://picsum.photos/seed/' + result.id + '/400/225',
                videoUrl: status.videoUrl,
                duration: status.duration || duration,
                aspectRatio,
                type: 'generated',
                createdAt: new Date().toISOString(),
                isFavorite: false,
                prompt: generateMode === 'text-to-video' ? prompt : motionPrompt
              };

              setVideos(prev => [newVideo, ...prev]);
              setSelectedVideo(newVideo);
              setView('editor');
              setPrompt('');
              setMotionPrompt('');
              setSelectedImage(null);
            } else if (status.status === 'failed') {
              alert(status.error || 'Generation failed');
            }

            setIsGenerating(false);
            setGenerationProgress(0);
          }
        }
      }, 500);

    } catch (error: any) {
      console.error('Generation error:', error);
      alert(error.message || 'Generation failed');
      setIsGenerating(false);
    }
  };

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setVideos(prev => prev.map(v =>
      v.id === id ? { ...v, isFavorite: !v.isFavorite } : v
    ));
  };

  // Delete video
  const deleteVideo = (id: string) => {
    if (confirm('Delete this video?')) {
      setVideos(prev => prev.filter(v => v.id !== id));
      if (selectedVideo?.id === id) {
        setSelectedVideo(null);
        setView('library');
      }
    }
  };

  // Video playback controls
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize trim settings when video is selected
  useEffect(() => {
    if (selectedVideo) {
      setTrimSettings({ startTime: 0, endTime: selectedVideo.duration });
    }
  }, [selectedVideo]);

  // ============================================
  // AI TOOLS HANDLERS
  // ============================================

  // AI Enhance - Apply video enhancement
  const handleEnhance = async () => {
    if (!selectedVideo) return;
    setIsProcessing(true);
    setProcessingStatus('Analyzing video...');

    try {
      // Simulate AI enhancement process
      const steps = [
        'Analyzing video quality...',
        'Applying color correction...',
        enhancementSettings.stabilization ? 'Stabilizing footage...' : null,
        enhancementSettings.noiseReduction ? 'Reducing noise...' : null,
        enhancementSettings.colorGrading !== 'none' ? `Applying ${enhancementSettings.colorGrading} grading...` : null,
        'Finalizing enhancements...'
      ].filter(Boolean);

      for (let i = 0; i < steps.length; i++) {
        setProcessingStatus(steps[i] as string);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Update video with enhanced flag
      setVideos(prev => prev.map(v =>
        v.id === selectedVideo.id ? { ...v, name: v.name + ' (Enhanced)' } : v
      ));

      setActiveTool(null);
      setProcessingStatus('');
    } catch (error) {
      console.error('Enhancement error:', error);
      alert('Enhancement failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // AI Captions - Generate captions from video
  const handleGenerateCaptions = async () => {
    if (!selectedVideo) return;
    setIsGeneratingCaptions(true);
    setProcessingStatus('Transcribing audio...');

    try {
      // Simulate caption generation with AI
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStatus('Generating timestamps...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate sample captions based on video duration
      const duration = selectedVideo.duration || 8;
      const numCaptions = Math.ceil(duration / 3);
      const sampleTexts = [
        "Welcome to the production",
        "Creating amazing content",
        "Professional quality results",
        "Powered by AI technology",
        "Thank you for watching"
      ];

      const generatedCaptions: Caption[] = [];
      for (let i = 0; i < numCaptions; i++) {
        generatedCaptions.push({
          id: `cap_${i}`,
          startTime: i * 3,
          endTime: Math.min((i + 1) * 3, duration),
          text: sampleTexts[i % sampleTexts.length]
        });
      }

      setCaptions(generatedCaptions);
      setProcessingStatus('');
    } catch (error) {
      console.error('Caption generation error:', error);
      alert('Failed to generate captions.');
    } finally {
      setIsGeneratingCaptions(false);
    }
  };

  // Audio - Add background music
  const MUSIC_PRESETS = [
    { id: 'upbeat', name: 'Upbeat Corporate', mood: 'energetic' },
    { id: 'cinematic', name: 'Cinematic Epic', mood: 'dramatic' },
    { id: 'ambient', name: 'Ambient Chill', mood: 'relaxed' },
    { id: 'inspiring', name: 'Inspiring Piano', mood: 'emotional' },
    { id: 'electronic', name: 'Electronic Beat', mood: 'modern' },
  ];

  const handleAddMusic = (musicId: string) => {
    setSelectedMusic(musicId);
    const music = MUSIC_PRESETS.find(m => m.id === musicId);
    if (music) {
      setAudioTracks(prev => [
        ...prev.filter(t => t.type !== 'music'),
        { id: musicId, name: music.name, type: 'music', volume: musicVolume }
      ]);
    }
  };

  // Trim - Apply trim to video
  const handleApplyTrim = () => {
    if (!selectedVideo) return;
    const newDuration = trimSettings.endTime - trimSettings.startTime;

    setVideos(prev => prev.map(v =>
      v.id === selectedVideo.id
        ? { ...v, duration: newDuration, name: v.name + ' (Trimmed)' }
        : v
    ));

    setSelectedVideo(prev => prev ? { ...prev, duration: newDuration } : null);
    setActiveTool(null);
  };

  // Speed - Apply playback speed
  const handleApplySpeed = () => {
    if (!selectedVideo || !videoRef.current) return;
    videoRef.current.playbackRate = speedSettings.rate;

    // Update video duration based on speed
    const newDuration = selectedVideo.duration / speedSettings.rate;
    setVideos(prev => prev.map(v =>
      v.id === selectedVideo.id
        ? { ...v, duration: newDuration, name: v.name + ` (${speedSettings.rate}x)` }
        : v
    ));
    setActiveTool(null);
  };

  // Filter - Apply filter to video
  const handleApplyFilter = (filterId: string) => {
    const filter = FILTER_PRESETS.find(f => f.id === filterId);
    if (filter && videoRef.current) {
      videoRef.current.style.filter = filter.css;
      setActiveFilter({ type: filterId, intensity: filterIntensity });
    }
  };

  // Text Overlay - Add text
  const handleAddTextOverlay = () => {
    if (!newTextOverlay.trim() || !selectedVideo) return;

    const overlay: TextOverlay = {
      id: `text_${Date.now()}`,
      text: newTextOverlay,
      position: { x: 50, y: 80 },
      style: {
        fontSize: 32,
        fontFamily: 'Inter',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.5)',
      },
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, selectedVideo.duration),
      animation: 'fade',
    };

    setTextOverlays(prev => [...prev, overlay]);
    setNewTextOverlay('');
  };

  // AI Agents - Run agent analysis
  const handleRunAgent = async (agentId: string) => {
    if (!selectedVideo) return;
    setAgentProcessing(true);
    setActiveAgent(agentId);

    try {
      let result;
      const dummyFrame = selectedVideo.thumbnailUrl;

      switch (agentId) {
        case 'director':
          result = await videoAgents.director.analyzeProject(
            selectedVideo.prompt || selectedVideo.name,
            'General audience',
            'professional'
          );
          break;
        case 'colorist':
          result = await videoAgents.colorist.analyzeColorProfile(dummyFrame);
          break;
        case 'sound':
          result = await videoAgents.soundDesigner.suggestMusic(
            [dummyFrame],
            undefined,
            selectedVideo.duration
          );
          break;
        case 'motion':
          result = await videoAgents.motionGraphics.suggestTextOverlay(
            dummyFrame,
            selectedVideo.name,
            'modern'
          );
          break;
        case 'export':
          result = await videoAgents.export.recommendExportSettings(
            {
              duration: selectedVideo.duration,
              aspectRatio: selectedVideo.aspectRatio,
              resolution: '1080p',
              hasAudio: true,
            },
            'youtube'
          );
          break;
        default:
          result = { success: false, error: 'Unknown agent' };
      }

      if (result.success) {
        setAgentResults(prev => [...prev, {
          agentId,
          result: result.data,
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (error: any) {
      console.error('Agent error:', error);
    } finally {
      setAgentProcessing(false);
      setActiveAgent(null);
    }
  };

  // Run all agents
  const handleRunAllAgents = async () => {
    const agents = ['director', 'colorist', 'sound', 'motion', 'export'];
    for (const agent of agents) {
      await handleRunAgent(agent);
    }
  };

  // ============================================
  // SHARE & EXPORT HANDLERS
  // ============================================

  // Generate shareable link
  const handleShare = () => {
    if (!selectedVideo) return;
    const link = `https://elevenviews.io/portal/share/${selectedVideo.id}`;
    setShareLink(link);
    setShowShareModal(true);
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Share to social platforms
  const handleSocialShare = (platform: 'twitter' | 'instagram' | 'whatsapp') => {
    const text = `Check out this video: ${selectedVideo?.name}`;
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`,
      instagram: shareLink, // Instagram doesn't support direct sharing via URL
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + shareLink)}`
    };

    if (platform === 'instagram') {
      handleCopyLink();
      alert('Link copied! Open Instagram to share.');
    } else {
      window.open(urls[platform], '_blank', 'width=600,height=400');
    }
  };

  // Export video
  const handleExport = async () => {
    if (!selectedVideo?.videoUrl) {
      alert('No video available to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate export progress
      for (let i = 0; i <= 100; i += 10) {
        setExportProgress(i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Download the video
      const response = await fetch(selectedVideo.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedVideo.name.replace(/[^a-z0-9]/gi, '_')}_${exportQuality}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // ============================================
  // AI TOOL PANELS (Modals)
  // ============================================

  // Enhance Panel
  const renderEnhancePanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-brand-gold" />
            AI Enhance
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enhancement Sliders */}
        <div className="space-y-4">
          {[
            { key: 'brightness', label: 'Brightness', icon: Zap },
            { key: 'contrast', label: 'Contrast', icon: Sliders },
            { key: 'saturation', label: 'Saturation', icon: Sparkles },
          ].map(({ key, label, icon: Icon }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {label}
                </span>
                <span className="text-xs text-brand-gold">{(enhancementSettings as any)[key]}</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={(enhancementSettings as any)[key]}
                onChange={(e) => setEnhancementSettings(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
              />
            </div>
          ))}
        </div>

        {/* Toggle Options */}
        <div className="flex gap-2">
          <button
            onClick={() => setEnhancementSettings(prev => ({ ...prev, stabilization: !prev.stabilization }))}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              enhancementSettings.stabilization ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
            }`}
          >
            Stabilize
          </button>
          <button
            onClick={() => setEnhancementSettings(prev => ({ ...prev, noiseReduction: !prev.noiseReduction }))}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
              enhancementSettings.noiseReduction ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
            }`}
          >
            Denoise
          </button>
        </div>

        {/* Color Grading */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Color Grading</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['none', 'cinematic', 'vibrant', 'vintage', 'bw'] as const).map((grade) => (
              <button
                key={grade}
                onClick={() => setEnhancementSettings(prev => ({ ...prev, colorGrading: grade }))}
                className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  enhancementSettings.colorGrading === grade ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                {grade === 'none' ? 'Original' : grade === 'bw' ? 'B&W' : grade.charAt(0).toUpperCase() + grade.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={handleEnhance}
          disabled={isProcessing}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {processingStatus}
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Apply Enhancements
            </>
          )}
        </button>
      </div>
    </div>
  );

  // Captions Panel
  const renderCaptionsPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-brand-gold" />
            AI Captions
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generate Captions Button */}
        {captions.length === 0 ? (
          <button
            onClick={handleGenerateCaptions}
            disabled={isGeneratingCaptions}
            className="w-full py-4 bg-white/10 border border-white/20 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20"
          >
            {isGeneratingCaptions ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {processingStatus || 'Generating...'}
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-brand-gold" />
                Auto-Generate Captions
              </>
            )}
          </button>
        ) : (
          <>
            {/* Caption Style */}
            <div>
              <p className="text-sm text-gray-400 mb-2">Caption Style</p>
              <div className="flex gap-2">
                {(['minimal', 'bold', 'highlight'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setCaptionStyle(style)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                      captionStyle === style ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {style.charAt(0).toUpperCase() + style.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {captions.map((caption, index) => (
                <div key={caption.id} className="bg-white/5 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">
                      {formatTime(caption.startTime)} - {formatTime(caption.endTime)}
                    </span>
                    <button
                      onClick={() => setCaptions(prev => prev.filter(c => c.id !== caption.id))}
                      className="text-gray-500 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={caption.text}
                    onChange={(e) => setCaptions(prev => prev.map(c =>
                      c.id === caption.id ? { ...c, text: e.target.value } : c
                    ))}
                    className="w-full bg-transparent text-white text-sm focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Regenerate Button */}
            <button
              onClick={handleGenerateCaptions}
              disabled={isGeneratingCaptions}
              className="w-full py-3 bg-white/10 rounded-xl text-gray-400 text-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate
            </button>
          </>
        )}

        {/* Apply Button */}
        {captions.length > 0 && (
          <button
            onClick={() => setActiveTool(null)}
            className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Apply Captions
          </button>
        )}
      </div>
    </div>
  );

  // Audio Panel
  const renderAudioPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-brand-gold" />
            Audio & Music
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Original Audio Volume */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <Mic className="w-4 h-4" />
              Original Audio
            </span>
            <span className="text-xs text-brand-gold">{originalVolume}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={originalVolume}
            onChange={(e) => setOriginalVolume(parseInt(e.target.value))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Music Selection */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Add Background Music</p>
          <div className="space-y-2">
            {MUSIC_PRESETS.map((music) => (
              <button
                key={music.id}
                onClick={() => handleAddMusic(music.id)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                  selectedMusic === music.id ? 'bg-brand-gold/20 border border-brand-gold' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Music className="w-4 h-4 text-brand-gold" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-white">{music.name}</p>
                    <p className="text-xs text-gray-500">{music.mood}</p>
                  </div>
                </div>
                {selectedMusic === music.id && (
                  <CheckCircle className="w-5 h-5 text-brand-gold" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Music Volume */}
        {selectedMusic && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Music Volume</span>
              <span className="text-xs text-brand-gold">{musicVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={musicVolume}
              onChange={(e) => setMusicVolume(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        )}

        {/* Apply Button */}
        <button
          onClick={() => setActiveTool(null)}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Apply Audio
        </button>
      </div>
    </div>
  );

  // Trim Panel
  const renderTrimPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Scissors className="w-5 h-5 text-brand-gold" />
            Trim Video
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trim Range Display */}
        <div className="bg-white/5 rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Duration</span>
            <span className="text-white font-medium">
              {formatTime(trimSettings.endTime - trimSettings.startTime)}
            </span>
          </div>
        </div>

        {/* Start Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Start Time</span>
            <span className="text-xs text-brand-gold">{formatTime(trimSettings.startTime)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={selectedVideo?.duration || 10}
            step="0.1"
            value={trimSettings.startTime}
            onChange={(e) => setTrimSettings(prev => ({
              ...prev,
              startTime: Math.min(parseFloat(e.target.value), prev.endTime - 0.5)
            }))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* End Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">End Time</span>
            <span className="text-xs text-brand-gold">{formatTime(trimSettings.endTime)}</span>
          </div>
          <input
            type="range"
            min="0"
            max={selectedVideo?.duration || 10}
            step="0.1"
            value={trimSettings.endTime}
            onChange={(e) => setTrimSettings(prev => ({
              ...prev,
              endTime: Math.max(parseFloat(e.target.value), prev.startTime + 0.5)
            }))}
            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
          />
        </div>

        {/* Apply Button */}
        <button
          onClick={handleApplyTrim}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
        >
          <Scissors className="w-5 h-5" />
          Apply Trim
        </button>
      </div>
    </div>
  );

  // Speed Panel
  const renderSpeedPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Gauge className="w-5 h-5 text-brand-gold" />
            Playback Speed
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Speed */}
        <div className="bg-white/5 rounded-xl p-4 text-center">
          <span className="text-4xl font-bold text-brand-gold">{speedSettings.rate}x</span>
          <p className="text-xs text-gray-500 mt-1">
            {speedSettings.rate > 1 ? 'Fast forward' : speedSettings.rate < 1 ? 'Slow motion' : 'Normal speed'}
          </p>
        </div>

        {/* Speed Presets */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {SPEED_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setSpeedSettings(prev => ({ ...prev, rate: preset.value }))}
              className={`py-3 rounded-xl text-sm font-medium transition-colors ${
                speedSettings.rate === preset.value ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Preserve Pitch */}
        <button
          onClick={() => setSpeedSettings(prev => ({ ...prev, preservePitch: !prev.preservePitch }))}
          className={`w-full flex items-center justify-between p-3 rounded-xl ${
            speedSettings.preservePitch ? 'bg-brand-gold/20 border border-brand-gold' : 'bg-white/5'
          }`}
        >
          <span className="text-sm text-white">Preserve Audio Pitch</span>
          <div className={`w-10 h-6 rounded-full flex items-center ${speedSettings.preservePitch ? 'bg-brand-gold' : 'bg-white/20'}`}>
            <div className={`w-4 h-4 rounded-full bg-white mx-1 transition-transform ${speedSettings.preservePitch ? 'translate-x-4' : ''}`} />
          </div>
        </button>

        <button
          onClick={handleApplySpeed}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Apply Speed
        </button>
      </div>
    </div>
  );

  // Filters Panel
  const renderFiltersPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-gold" />
            Video Filters
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 gap-3">
          {FILTER_PRESETS.map((filter) => (
            <button
              key={filter.id}
              onClick={() => handleApplyFilter(filter.id)}
              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                activeFilter?.type === filter.id ? 'border-brand-gold' : 'border-transparent'
              }`}
            >
              <img
                src={selectedVideo?.thumbnailUrl || 'https://picsum.photos/200/112'}
                alt={filter.name}
                className="w-full h-full object-cover"
                style={{ filter: filter.css }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <span className="text-xs text-white font-medium">{filter.name}</span>
              </div>
              {activeFilter?.type === filter.id && (
                <div className="absolute top-2 right-2 p-1 bg-brand-gold rounded-full">
                  <Check className="w-3 h-3 text-black" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Intensity Slider */}
        {activeFilter && activeFilter.type !== 'none' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Intensity</span>
              <span className="text-xs text-brand-gold">{filterIntensity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={filterIntensity}
              onChange={(e) => setFilterIntensity(parseInt(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-brand-gold [&::-webkit-slider-thumb]:rounded-full"
            />
          </div>
        )}

        <button
          onClick={() => setActiveTool(null)}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Apply Filter
        </button>
      </div>
    </div>
  );

  // Text Panel
  const renderTextPanel = () => (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
      <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Type className="w-5 h-5 text-brand-gold" />
            Text Overlay
          </h3>
          <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add New Text */}
        <div className="space-y-3">
          <input
            type="text"
            value={newTextOverlay}
            onChange={(e) => setNewTextOverlay(e.target.value)}
            placeholder="Enter text..."
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-brand-gold/50 focus:outline-none"
          />
          <button
            onClick={handleAddTextOverlay}
            disabled={!newTextOverlay.trim()}
            className="w-full py-3 bg-white/10 rounded-xl text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Text at {formatTime(currentTime)}
          </button>
        </div>

        {/* Existing Overlays */}
        {textOverlays.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Text Overlays</p>
            {textOverlays.map((overlay) => (
              <div key={overlay.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                <div>
                  <p className="text-sm text-white">{overlay.text}</p>
                  <p className="text-xs text-gray-500">
                    {formatTime(overlay.startTime)} - {formatTime(overlay.endTime)}
                  </p>
                </div>
                <button
                  onClick={() => setTextOverlays(prev => prev.filter(t => t.id !== overlay.id))}
                  className="p-2 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Animation Selection */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Animation Style</p>
          <div className="flex gap-2 flex-wrap">
            {TEXT_ANIMATIONS.map((anim) => (
              <button
                key={anim.id}
                className="px-4 py-2 bg-white/10 rounded-lg text-xs text-gray-400 hover:bg-white/20"
              >
                {anim.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setActiveTool(null)}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Done
        </button>
      </div>
    </div>
  );

  // AI Agents Panel
  const renderAgentsPanel = () => {
    const agents = videoAgents.getAgentList();

    return (
      <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setActiveTool(null)}>
        <div className="w-full max-w-lg bg-[#111] rounded-t-3xl lg:rounded-3xl p-4 sm:p-6 space-y-3 sm:space-y-4 animate-slideUp lg:animate-fadeIn lg:mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bot className="w-5 h-5 text-brand-gold" />
              AI Production Agents
            </h3>
            <button onClick={() => setActiveTool(null)} className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Run All Button */}
          <button
            onClick={handleRunAllAgents}
            disabled={agentProcessing}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-brand-gold rounded-xl text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {agentProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Run All Agents
              </>
            )}
          </button>

          {/* Agent List */}
          <div className="space-y-3">
            {agents.map((agent) => {
              const result = agentResults.find(r => r.agentId === agent.id);
              const isProcessing = agentProcessing && activeAgent === agent.id;

              return (
                <div key={agent.id} className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${agent.color}20` }}>
                        <Bot className="w-4 h-4" style={{ color: agent.color }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{agent.name}</p>
                        <p className="text-xs text-gray-500">{agent.description}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRunAgent(agent.id)}
                      disabled={agentProcessing}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isProcessing
                          ? 'bg-brand-gold/20 text-brand-gold'
                          : result
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-white/10 text-gray-400 hover:bg-white/20'
                      }`}
                    >
                      {isProcessing ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : result ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        'Run'
                      )}
                    </button>
                  </div>

                  {/* Agent Result */}
                  {result && (
                    <div className="mt-3 p-3 bg-black/30 rounded-lg">
                      <p className="text-xs text-gray-400 mb-1">Result:</p>
                      <pre className="text-xs text-white whitespace-pre-wrap overflow-auto max-h-32">
                        {JSON.stringify(result.result, null, 2).slice(0, 500)}
                        {JSON.stringify(result.result, null, 2).length > 500 && '...'}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTool(null)}
            className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            Done
          </button>
        </div>
      </div>
    );
  };

  // Share Modal
  const renderShareModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowShareModal(false)}>
      <div className="w-full max-w-md bg-[#111] rounded-2xl p-6 space-y-4 animate-fadeUp" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Share Video</h3>
          <button onClick={() => setShowShareModal(false)} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Link */}
        <div className="flex gap-2">
          <input
            type="text"
            value={shareLink}
            readOnly
            className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white"
          />
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 bg-brand-gold rounded-xl text-black font-medium flex items-center gap-2"
          >
            {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {linkCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Social Share */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Share to</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleSocialShare('twitter')}
              className="flex-1 py-3 bg-[#1DA1F2]/20 rounded-xl text-[#1DA1F2] font-medium flex items-center justify-center gap-2 hover:bg-[#1DA1F2]/30"
            >
              <Twitter className="w-5 h-5" />
              Twitter
            </button>
            <button
              onClick={() => handleSocialShare('instagram')}
              className="flex-1 py-3 bg-gradient-to-r from-[#833AB4]/20 via-[#FD1D1D]/20 to-[#F77737]/20 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:from-[#833AB4]/30 hover:via-[#FD1D1D]/30 hover:to-[#F77737]/30"
            >
              <Instagram className="w-5 h-5" />
              Instagram
            </button>
            <button
              onClick={() => handleSocialShare('whatsapp')}
              className="flex-1 py-3 bg-[#25D366]/20 rounded-xl text-[#25D366] font-medium flex items-center justify-center gap-2 hover:bg-[#25D366]/30"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Export Modal
  const renderExportModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowExportModal(false)}>
      <div className="w-full max-w-md bg-[#111] rounded-2xl p-6 space-y-4 animate-fadeUp" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Export Video</h3>
          <button onClick={() => setShowExportModal(false)} className="p-2 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quality Selection */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Quality</p>
          <div className="flex gap-2">
            {(['720p', '1080p', '4k'] as ExportQuality[]).map((quality) => (
              <button
                key={quality}
                onClick={() => setExportQuality(quality)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  exportQuality === quality ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                {quality.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <p className="text-sm text-gray-400 mb-2">Format</p>
          <div className="flex gap-2">
            {(['mp4', 'webm', 'mov'] as ExportFormat[]).map((format) => (
              <button
                key={format}
                onClick={() => setExportFormat(format)}
                className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
                  exportFormat === format ? 'bg-brand-gold text-black' : 'bg-white/10 text-gray-400'
                }`}
              >
                .{format.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-white/5 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">File name</span>
            <span className="text-white">{selectedVideo?.name}_{exportQuality}.{exportFormat}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Estimated size</span>
            <span className="text-white">
              {exportQuality === '4k' ? '~150MB' : exportQuality === '1080p' ? '~50MB' : '~20MB'}
            </span>
          </div>
        </div>

        {/* Export Progress */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Exporting...</span>
              <span className="text-brand-gold">{exportProgress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-gold to-yellow-500 transition-all duration-300"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Export Video
            </>
          )}
        </button>
      </div>
    </div>
  );

  // ============================================
  // LIBRARY VIEW
  // ============================================
  const renderLibrary = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-gold/20 to-purple-500/20">
              <Film className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Video Library</h1>
              <p className="text-xs text-gray-500">{videos.length} assets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewStyle(viewStyle === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5"
            >
              {viewStyle === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-4 pb-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search videos..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:border-brand-gold/50 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'generated', 'uploaded', 'favorites'] as LibraryFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setLibraryFilter(filter)}
                className={`px-4 py-2.5 min-h-[44px] rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center ${
                  libraryFilter === filter
                    ? 'bg-brand-gold text-black'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                {filter === 'favorites' && <Heart className="w-3 h-3 ml-1 inline" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <FolderOpen className="w-12 h-12 text-gray-600 mb-4" />
            <p className="text-gray-400 mb-2">No videos found</p>
            <p className="text-sm text-gray-600">Create your first AI video</p>
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 ${viewStyle === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => {
                  setSelectedVideo(video);
                  setView('editor');
                }}
                className={`group relative bg-white/5 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-gold/50 transition-all ${
                  viewStyle === 'list' ? 'flex items-center gap-3 p-2' : ''
                }`}
              >
                {/* Thumbnail */}
                <div className={`relative ${viewStyle === 'list' ? 'w-24 h-16 flex-shrink-0' : 'aspect-video'}`}>
                  <img
                    src={video.thumbnailUrl}
                    alt={video.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-8 h-8 text-white" fill="white" />
                  </div>
                  {/* Duration badge */}
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
                    {formatTime(video.duration)}
                  </div>
                  {/* Type indicator */}
                  {video.type === 'generated' && (
                    <div className="absolute top-1 left-1 p-1 bg-brand-gold/90 rounded">
                      <Sparkles className="w-3 h-3 text-black" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className={`${viewStyle === 'list' ? 'flex-1 min-w-0' : 'p-2'}`}>
                  <p className="text-sm font-medium text-white truncate">{video.name}</p>
                  <p className="text-xs text-gray-500">
                    {video.aspectRatio} • {new Date(video.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(video.id); }}
                    className="p-1.5 bg-black/50 rounded-lg hover:bg-black/70"
                  >
                    <Heart className={`w-3.5 h-3.5 ${video.isFavorite ? 'text-red-400 fill-red-400' : 'text-white'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteVideo(video.id); }}
                    className="p-1.5 bg-black/50 rounded-lg hover:bg-red-500/50"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB - Create New */}
      <button
        onClick={() => setView('generate')}
        className="fixed bottom-24 right-4 md:bottom-8 md:right-8 p-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-full shadow-lg shadow-brand-gold/30 hover:scale-105 transition-transform z-30"
      >
        <Plus className="w-6 h-6 text-black" />
      </button>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />
    </div>
  );

  // ============================================
  // GENERATE VIEW
  // ============================================
  const renderGenerate = () => (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setView('library')}
            className="p-2 -ml-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-white">Create Video</h1>
          <div className="w-9" />
        </div>

        {/* Mode Toggle */}
        <div className="flex p-1 mx-4 mb-3 bg-white/5 rounded-xl">
          <button
            onClick={() => setGenerateMode('text-to-video')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              generateMode === 'text-to-video'
                ? 'bg-brand-gold text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            Text to Video
          </button>
          <button
            onClick={() => setGenerateMode('image-to-video')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              generateMode === 'image-to-video'
                ? 'bg-brand-gold text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Image className="w-4 h-4" />
            Image to Video
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {generateMode === 'text-to-video' ? (
          <>
            {/* Prompt Input */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Describe your video
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A golden retriever running on a beach at sunset, slow motion, cinematic lighting..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-brand-gold/50 focus:outline-none resize-none"
              />
              <p className="text-xs text-gray-600 mt-1">{prompt.length}/500 characters</p>
            </div>

            {/* Style Presets */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Style
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                      selectedStyle === style.id
                        ? 'bg-brand-gold/20 border-2 border-brand-gold'
                        : 'bg-white/5 border-2 border-transparent hover:border-white/20'
                    }`}
                  >
                    <span className="text-xl">{style.icon}</span>
                    <span className="text-xs text-white">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Select Image
              </label>
              {selectedImage ? (
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Selected"
                    className="w-full aspect-video object-cover rounded-xl"
                  />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg hover:bg-black/70"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-brand-gold/50 transition-colors">
                  <Image className="w-10 h-10 text-gray-500 mb-3" />
                  <p className="text-sm text-gray-400">Tap to select image</p>
                  <p className="text-xs text-gray-600 mt-1">PNG, JPG up to 10MB</p>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Motion Prompt */}
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
                Motion Description (optional)
              </label>
              <textarea
                value={motionPrompt}
                onChange={(e) => setMotionPrompt(e.target.value)}
                placeholder="Gentle zoom in with subtle parallax effect..."
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:border-brand-gold/50 focus:outline-none resize-none"
              />
            </div>
          </>
        )}

        {/* Settings */}
        <div className="grid grid-cols-2 gap-3">
          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
              Aspect Ratio
            </label>
            <div className="flex gap-2">
              {(['16:9', '9:16', '1:1'] as AspectRatio[]).map((ratio) => (
                <button
                  key={ratio}
                  onClick={() => setAspectRatio(ratio)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    aspectRatio === ratio
                      ? 'bg-brand-gold text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">
              Duration
            </label>
            <div className="flex gap-2">
              {([4, 6, 8] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    duration === d
                      ? 'bg-brand-gold text-black'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Upload option */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-400 hover:border-white/20 flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Or upload existing video
        </button>
      </div>

      {/* Generate Button */}
      <div className="sticky bottom-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-8">
        {isGenerating ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{generationStatus}</span>
              <span className="text-brand-gold">{generationProgress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-gold to-yellow-500 transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              />
            </div>
            <button
              onClick={() => setIsGenerating(false)}
              className="w-full py-3 bg-white/10 rounded-xl text-sm text-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={(generateMode === 'text-to-video' && !prompt.trim()) || (generateMode === 'image-to-video' && !selectedImage)}
            className="w-full py-4 bg-gradient-to-r from-brand-gold to-yellow-500 rounded-xl text-black font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
          >
            <Sparkles className="w-5 h-5" />
            Generate Video
          </button>
        )}
      </div>
    </div>
  );

  // ============================================
  // EDITOR VIEW
  // ============================================
  const renderEditor = () => {
    if (!selectedVideo) return null;

    // Editing Tools Component (reusable for both layouts)
    const EditingToolsPanel = ({ inSidebar = false }: { inSidebar?: boolean }) => (
      <div className={`bg-[#0a0a0a] ${inSidebar ? 'p-4' : 'border-t border-white/5 p-4'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`${inSidebar ? 'text-base' : 'text-sm'} font-bold text-white`}>Editing Tools</h3>
          <Sparkles className="w-4 h-4 text-brand-gold" />
        </div>
        <div className={`grid ${inSidebar ? 'grid-cols-2' : 'grid-cols-4'} gap-2 mb-3`}>
          {[
            { icon: Wand2, label: 'Enhance', tool: 'enhance' as ActiveTool, color: 'text-brand-gold', desc: 'AI Enhancement' },
            { icon: Type, label: 'Captions', tool: 'captions' as ActiveTool, color: 'text-brand-gold', desc: 'Auto Subtitles' },
            { icon: Volume2, label: 'Audio', tool: 'audio' as ActiveTool, color: 'text-brand-gold', desc: 'Audio Mixer' },
            { icon: Scissors, label: 'Trim', tool: 'trim' as ActiveTool, color: 'text-brand-gold', desc: 'Cut & Trim' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTool(item.tool)}
              className={`flex ${inSidebar ? 'flex-row items-center gap-3 p-4' : 'flex-col items-center gap-1.5 p-3'} bg-white/5 rounded-xl hover:bg-brand-gold/20 hover:border-brand-gold/30 border border-transparent transition-all active:scale-95 min-h-[60px]`}
            >
              <div className={`${inSidebar ? 'w-10 h-10' : ''} flex items-center justify-center ${inSidebar ? 'bg-brand-gold/10 rounded-lg' : ''}`}>
                <item.icon className={`${inSidebar ? 'w-5 h-5' : 'w-5 h-5'} ${item.color}`} />
              </div>
              <div className={inSidebar ? 'text-left' : 'text-center'}>
                <span className={`${inSidebar ? 'text-sm font-medium text-white block' : 'text-[10px] text-gray-400'}`}>{item.label}</span>
                {inSidebar && <span className="text-[10px] text-gray-500">{item.desc}</span>}
              </div>
            </button>
          ))}
        </div>
        <div className={`grid ${inSidebar ? 'grid-cols-2' : 'grid-cols-4'} gap-2`}>
          {[
            { icon: Gauge, label: 'Speed', tool: 'speed' as ActiveTool, color: 'text-purple-400', desc: 'Playback Speed' },
            { icon: Palette, label: 'Filters', tool: 'filters' as ActiveTool, color: 'text-pink-400', desc: 'Color Grading' },
            { icon: Type, label: 'Text', tool: 'text' as ActiveTool, color: 'text-cyan-400', desc: 'Text Overlays' },
            { icon: Bot, label: 'AI Agents', tool: 'agents' as ActiveTool, color: 'text-green-400', desc: 'Smart Editing' },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTool(item.tool)}
              className={`flex ${inSidebar ? 'flex-row items-center gap-3 p-4' : 'flex-col items-center gap-1.5 p-3'} bg-white/5 rounded-xl hover:bg-white/10 border border-transparent hover:border-white/10 transition-all active:scale-95 min-h-[60px]`}
            >
              <div className={`${inSidebar ? 'w-10 h-10' : ''} flex items-center justify-center ${inSidebar ? 'bg-white/5 rounded-lg' : ''}`}>
                <item.icon className={`${inSidebar ? 'w-5 h-5' : 'w-5 h-5'} ${item.color}`} />
              </div>
              <div className={inSidebar ? 'text-left' : 'text-center'}>
                <span className={`${inSidebar ? 'text-sm font-medium text-white block' : 'text-[10px] text-gray-400'}`}>{item.label}</span>
                {inSidebar && <span className="text-[10px] text-gray-500">{item.desc}</span>}
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className={`${inSidebar ? 'mt-6 space-y-3' : 'hidden'}`}>
          <button
            onClick={handleShare}
            className="w-full py-3.5 bg-white/10 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4" />
            Share Video
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            className="w-full py-3.5 bg-brand-gold rounded-xl text-black font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Video
          </button>
        </div>
      </div>
    );

    return (
      <div className="flex flex-col lg:flex-row h-full bg-black">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="sticky top-0 z-20 bg-black/90 backdrop-blur-xl border-b border-white/5">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => {
                  setSelectedVideo(null);
                  setView('library');
                }}
                className="p-2 -ml-2 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-sm font-medium text-white truncate max-w-[200px] lg:max-w-[400px]">
                {selectedVideo.name}
              </h1>
              <button className="p-2 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Video Player */}
          <div className="flex-1 flex items-center justify-center bg-black relative min-h-[200px] lg:min-h-[400px]">
            {selectedVideo.videoUrl ? (
              <video
                ref={videoRef}
                src={selectedVideo.videoUrl}
                className="max-w-full max-h-full object-contain"
                playsInline
                onClick={togglePlay}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onEnded={() => setIsPlaying(false)}
                muted={isMuted}
              />
            ) : (
              <img
                src={selectedVideo.thumbnailUrl}
                alt={selectedVideo.name}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {/* Play overlay */}
            {!isPlaying && selectedVideo.videoUrl && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/20"
              >
                <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                  <Play className="w-8 h-8 text-white" fill="white" />
                </div>
              </button>
            )}
          </div>

          {/* Timeline */}
          <div className="bg-[#111] border-t border-white/10 p-4 space-y-3">
            {/* Progress bar */}
            <div className="relative h-2 bg-white/10 rounded-full cursor-pointer">
              <div
                className="absolute left-0 top-0 h-full bg-brand-gold rounded-full"
                style={{ width: `${(currentTime / (selectedVideo.duration || 1)) * 100}%` }}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="p-3 bg-white/10 rounded-lg hover:bg-white/20 min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {isPlaying ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-3 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <span className="text-sm text-gray-400 font-mono">
                  {formatTime(currentTime)} / {formatTime(selectedVideo.duration)}
                </span>
              </div>
              <button className="p-3 text-gray-400 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center">
                <Maximize2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mobile/Tablet Tools Panel (shown below video on smaller screens) */}
          <div className="lg:hidden">
            <EditingToolsPanel inSidebar={false} />

            {/* Mobile Bottom Actions */}
            <div className="bg-[#0a0a0a] border-t border-white/5 p-4 flex gap-3">
              <button
                onClick={handleShare}
                className="flex-1 py-3.5 bg-white/10 rounded-xl text-white font-medium flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all min-h-[50px]"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex-1 py-3.5 bg-brand-gold rounded-xl text-black font-bold flex items-center justify-center gap-2 hover:bg-yellow-400 active:scale-95 transition-all min-h-[50px]"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Desktop/iPad Sidebar (shown on larger screens) */}
        <div className="hidden lg:flex lg:flex-col w-[320px] xl:w-[360px] border-l border-white/5 bg-[#0a0a0a] overflow-y-auto">
          <EditingToolsPanel inSidebar={true} />
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <div className="h-full bg-[#0a0a0a] overflow-hidden">
      {view === 'library' && renderLibrary()}
      {view === 'generate' && renderGenerate()}
      {view === 'editor' && renderEditor()}

      {/* AI Tool Panels */}
      {activeTool === 'enhance' && renderEnhancePanel()}
      {activeTool === 'captions' && renderCaptionsPanel()}
      {activeTool === 'audio' && renderAudioPanel()}
      {activeTool === 'trim' && renderTrimPanel()}
      {activeTool === 'speed' && renderSpeedPanel()}
      {activeTool === 'filters' && renderFiltersPanel()}
      {activeTool === 'text' && renderTextPanel()}
      {activeTool === 'agents' && renderAgentsPanel()}

      {/* Modals */}
      {showShareModal && renderShareModal()}
      {showExportModal && renderExportModal()}
    </div>
  );
};

export default ProductionModule;
