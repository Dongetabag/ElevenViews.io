// AI Command Center - Unified AI Interface for Eleven Views
// One-stop access to all AI-powered creative capabilities

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles, Video, Mic, Music, Scissors, Wand2, Image, FileText,
  Play, Pause, Download, RefreshCw, ChevronRight, Clock, Zap,
  Brain, Film, Volume2, Palette, X, Check, AlertCircle, Loader2,
  Command, ArrowRight, Star, TrendingUp, Target, Lightbulb
} from 'lucide-react';
import { vortexMediaService, VOICE_OPTIONS, VIDEO_STYLE_PRESETS, MUSIC_MOODS } from '../services/vortexMediaService';

interface AICommandCenterProps {
  onClose?: () => void;
  onAssetCreated?: (asset: { type: string; url: string; name: string }) => void;
}

type AITask =
  | 'video-generate'
  | 'voiceover'
  | 'music'
  | 'transcribe'
  | 'auto-edit'
  | 'smart-cuts'
  | 'thumbnail'
  | 'scene-analysis';

interface TaskConfig {
  id: AITask;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'create' | 'enhance' | 'analyze';
}

const AI_TASKS: TaskConfig[] = [
  {
    id: 'video-generate',
    name: 'Generate Video',
    description: 'Create cinematic video from text prompts',
    icon: Video,
    color: 'from-purple-500 to-pink-500',
    category: 'create'
  },
  {
    id: 'voiceover',
    name: 'Voice-Over',
    description: 'Professional AI narration in multiple voices',
    icon: Mic,
    color: 'from-blue-500 to-cyan-500',
    category: 'create'
  },
  {
    id: 'music',
    name: 'Generate Music',
    description: 'AI-composed background tracks and beats',
    icon: Music,
    color: 'from-green-500 to-emerald-500',
    category: 'create'
  },
  {
    id: 'auto-edit',
    name: 'Auto Edit',
    description: 'AI-powered automatic video editing',
    icon: Wand2,
    color: 'from-brand-gold to-amber-500',
    category: 'enhance'
  },
  {
    id: 'smart-cuts',
    name: 'Smart Cuts',
    description: 'Intelligent cut suggestions for your footage',
    icon: Scissors,
    color: 'from-red-500 to-orange-500',
    category: 'enhance'
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: 'Eye-catching thumbnails from video',
    icon: Image,
    color: 'from-indigo-500 to-purple-500',
    category: 'create'
  },
  {
    id: 'transcribe',
    name: 'Transcribe',
    description: 'Convert audio to text with timestamps',
    icon: FileText,
    color: 'from-teal-500 to-green-500',
    category: 'analyze'
  },
  {
    id: 'scene-analysis',
    name: 'Scene Analysis',
    description: 'AI detection of scenes and transitions',
    icon: Brain,
    color: 'from-violet-500 to-purple-500',
    category: 'analyze'
  }
];

const AICommandCenter: React.FC<AICommandCenterProps> = ({ onClose, onAssetCreated }) => {
  const [selectedTask, setSelectedTask] = useState<AITask | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentTasks, setRecentTasks] = useState<{ task: string; time: string; status: 'success' | 'failed' }[]>([]);

  // Form states for different tasks
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(10);
  const [style, setStyle] = useState('cinematic');
  const [voice, setVoice] = useState('narrator-male');
  const [mood, setMood] = useState('inspiring');
  const [videoUrl, setVideoUrl] = useState('');
  const [text, setText] = useState('');

  const resetForm = () => {
    setPrompt('');
    setDuration(10);
    setStyle('cinematic');
    setVoice('narrator-male');
    setMood('inspiring');
    setVideoUrl('');
    setText('');
    setResult(null);
    setError(null);
    setProgress(0);
  };

  const handleTaskSelect = (taskId: AITask) => {
    setSelectedTask(taskId);
    resetForm();
  };

  const simulateProgress = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
    return interval;
  };

  const executeTask = async () => {
    if (!selectedTask) return;

    setIsProcessing(true);
    setError(null);
    const progressInterval = simulateProgress();

    try {
      let taskResult: any;

      switch (selectedTask) {
        case 'video-generate':
          taskResult = await vortexMediaService.generateVideo({
            prompt,
            duration,
            style,
            aspectRatio: '16:9',
            quality: 'high'
          });
          break;

        case 'voiceover':
          taskResult = await vortexMediaService.generateVoiceOver({
            text,
            voice,
            speed: 1.0,
            pitch: 1.0
          });
          break;

        case 'music':
          taskResult = await vortexMediaService.generateBackgroundMusic({
            mood,
            duration,
            genre: 'cinematic',
            tempo: 'medium'
          });
          break;

        case 'transcribe':
          taskResult = await vortexMediaService.transcribeAudio(videoUrl);
          break;

        case 'scene-analysis':
          taskResult = await vortexMediaService.analyzeVideo(videoUrl);
          break;

        case 'smart-cuts':
          taskResult = await vortexMediaService.suggestCuts(videoUrl, {
            keepHighlights: true,
            removeSilence: true
          });
          break;

        case 'thumbnail':
          taskResult = await vortexMediaService.generateThumbnail(videoUrl, {
            style: 'cinematic',
            includeText: false
          });
          break;

        case 'auto-edit':
          taskResult = await vortexMediaService.generateAutoEdit([videoUrl], {
            style: 'cinematic',
            includeMusic: true,
            musicMood: mood
          });
          break;
      }

      clearInterval(progressInterval);
      setProgress(100);
      setResult(taskResult);

      // Add to recent tasks
      setRecentTasks(prev => [{
        task: AI_TASKS.find(t => t.id === selectedTask)?.name || selectedTask,
        time: 'Just now',
        status: 'success'
      }, ...prev.slice(0, 4)]);

      // Notify parent of new asset
      if (onAssetCreated && taskResult) {
        const assetUrl = taskResult.videoUrl || taskResult.audioUrl || taskResult.musicUrl || taskResult.thumbnailUrl;
        if (assetUrl) {
          onAssetCreated({
            type: selectedTask,
            url: assetUrl,
            name: `AI ${AI_TASKS.find(t => t.id === selectedTask)?.name} - ${new Date().toLocaleTimeString()}`
          });
        }
      }

    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'Task failed. Please try again.');
      setRecentTasks(prev => [{
        task: AI_TASKS.find(t => t.id === selectedTask)?.name || selectedTask,
        time: 'Just now',
        status: 'failed'
      }, ...prev.slice(0, 4)]);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderTaskForm = () => {
    if (!selectedTask) return null;

    const task = AI_TASKS.find(t => t.id === selectedTask);
    if (!task) return null;

    return (
      <div className="space-y-6">
        {/* Task Header */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${task.color}`}>
            <task.icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{task.name}</h3>
            <p className="text-sm text-gray-400">{task.description}</p>
          </div>
        </div>

        {/* Task-specific inputs */}
        <div className="space-y-4">
          {(selectedTask === 'video-generate') && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Describe your vision
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="A cinematic drone shot flying over a golden sunset cityscape, moody atmosphere, film grain..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Duration (seconds)
                  </label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={5}
                    max={60}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-gold/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-gold/50"
                  >
                    {VIDEO_STYLE_PRESETS.map(preset => (
                      <option key={preset.id} value={preset.id} className="bg-brand-dark">
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {selectedTask === 'voiceover' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Script
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the text you want to convert to voice-over..."
                  className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Voice
                </label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-gold/50"
                >
                  {VOICE_OPTIONS.map(v => (
                    <option key={v.id} value={v.id} className="bg-brand-dark">
                      {v.name} ({v.gender})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {selectedTask === 'music' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Mood
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {MUSIC_MOODS.map(m => (
                    <button
                      key={m}
                      onClick={() => setMood(m)}
                      className={`p-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        mood === m
                          ? 'bg-brand-gold text-brand-dark'
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={10}
                  max={180}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-gold/50"
                />
              </div>
            </>
          )}

          {(selectedTask === 'transcribe' || selectedTask === 'scene-analysis' ||
            selectedTask === 'smart-cuts' || selectedTask === 'thumbnail' || selectedTask === 'auto-edit') && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Video/Audio URL
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://your-media-url.com/video.mp4"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-gold/50"
              />
              <p className="text-xs text-gray-500 mt-2">
                Paste a URL to your media file from your library
              </p>
            </div>
          )}

          {selectedTask === 'auto-edit' && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Music Mood (Optional)
              </label>
              <select
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-brand-gold/50"
              >
                {MUSIC_MOODS.map(m => (
                  <option key={m} value={m} className="bg-brand-dark capitalize">
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Processing...</span>
              <span className="text-brand-gold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-gold to-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result */}
        {result && !isProcessing && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-green-400 mb-3">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Task Completed!</span>
            </div>
            {(result.videoUrl || result.audioUrl || result.musicUrl || result.thumbnailUrl) && (
              <a
                href={result.videoUrl || result.audioUrl || result.musicUrl || result.thumbnailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-brand-dark font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download Result
              </a>
            )}
            {result.text && (
              <div className="mt-3 p-3 bg-white/5 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.text}</p>
              </div>
            )}
            {result.scenes && (
              <div className="mt-3 space-y-2">
                <p className="text-sm text-gray-400">Detected {result.scenes.length} scenes</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {result.scenes.slice(0, 5).map((scene: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded">
                      <span className="text-gray-300">Scene {i + 1}</span>
                      <span className="text-gray-500">{scene.startTime}s - {scene.endTime}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execute Button */}
        <button
          onClick={executeTask}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all ${
            isProcessing
              ? 'bg-white/10 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-gold to-amber-500 text-brand-dark hover:scale-[1.02] active:scale-[0.98]'
          }`}
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5" />
              Execute {task.name}
            </>
          )}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute inset-0 bg-brand-dark/95 backdrop-blur-xl" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] bg-brand-surface border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Panel - Task Selection */}
        <div className="w-80 border-r border-white/10 bg-white/[0.02] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-brand-gold to-amber-500">
                <Sparkles className="w-6 h-6 text-brand-dark" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">AI Command Center</h2>
                <p className="text-xs text-gray-500">Powered by Vortex AI</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-4 border-b border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 text-brand-gold mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs font-semibold">Credits</span>
                </div>
                <p className="text-lg font-bold text-white">1,000</p>
              </div>
              <div className="p-3 bg-white/5 rounded-xl">
                <div className="flex items-center gap-2 text-green-400 mb-1">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs font-semibold">This Week</span>
                </div>
                <p className="text-lg font-bold text-white">24</p>
              </div>
            </div>
          </div>

          {/* Task Categories */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Create */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Star className="w-3 h-3" /> Create
              </h3>
              <div className="space-y-2">
                {AI_TASKS.filter(t => t.category === 'create').map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedTask === task.id
                        ? 'bg-brand-gold/10 border border-brand-gold/30'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${task.color}`}>
                      <task.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectedTask === task.id ? 'text-brand-gold' : 'text-white'}`}>
                        {task.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Enhance */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Wand2 className="w-3 h-3" /> Enhance
              </h3>
              <div className="space-y-2">
                {AI_TASKS.filter(t => t.category === 'enhance').map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedTask === task.id
                        ? 'bg-brand-gold/10 border border-brand-gold/30'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${task.color}`}>
                      <task.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectedTask === task.id ? 'text-brand-gold' : 'text-white'}`}>
                        {task.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze */}
            <div>
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Brain className="w-3 h-3" /> Analyze
              </h3>
              <div className="space-y-2">
                {AI_TASKS.filter(t => t.category === 'analyze').map(task => (
                  <button
                    key={task.id}
                    onClick={() => handleTaskSelect(task.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      selectedTask === task.id
                        ? 'bg-brand-gold/10 border border-brand-gold/30'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${task.color}`}>
                      <task.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${selectedTask === task.id ? 'text-brand-gold' : 'text-white'}`}>
                        {task.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{task.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Tasks */}
          {recentTasks.length > 0 && (
            <div className="p-4 border-t border-white/10">
              <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-3 h-3" /> Recent
              </h3>
              <div className="space-y-2">
                {recentTasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">{task.task}</span>
                    <span className={task.status === 'success' ? 'text-green-400' : 'text-red-400'}>
                      {task.status === 'success' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Task Configuration */}
        <div className="flex-1 flex flex-col">
          {/* Close Button */}
          <div className="absolute top-4 right-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 p-8 overflow-y-auto">
            {selectedTask ? (
              renderTaskForm()
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="p-6 rounded-full bg-brand-gold/10 mb-6">
                  <Command className="w-12 h-12 text-brand-gold" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Select an AI Task</h3>
                <p className="text-gray-400 max-w-md">
                  Choose from our suite of AI-powered creative tools to generate videos,
                  voice-overs, music, and more.
                </p>
                <div className="mt-8 grid grid-cols-3 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Lightbulb className="w-6 h-6 text-brand-gold mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Generate creative content</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Target className="w-6 h-6 text-brand-gold mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Enhance existing media</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl">
                    <Brain className="w-6 h-6 text-brand-gold mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Analyze and transcribe</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AICommandCenter;
