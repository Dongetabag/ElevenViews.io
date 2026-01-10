import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Wand2, Eraser, Palette, Scissors, Type, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Download, Upload, Undo2, Redo2, Save,
  Loader2, History, ChevronLeft, ChevronRight, Sparkles,
  Image as ImageIcon, Film, Layers, SlidersHorizontal, RefreshCw,
  MousePointer2, Move, PaintBucket, Eye, EyeOff, Check, AlertCircle
} from 'lucide-react';
import { Asset, EditOperation, MediaRevision } from '../types';

interface MediaEditorProps {
  asset: Asset;
  onClose: () => void;
  onSave: (editedUrl: string, operations: EditOperation[]) => void;
}

type EditMode =
  | 'select'
  | 'background-removal'
  | 'background-replace'
  | 'style-transfer'
  | 'object-removal'
  | 'object-addition'
  | 'color-correction'
  | 'upscale'
  | 'trim'
  | 'text-overlay';

interface EditTool {
  id: EditMode;
  name: string;
  icon: React.ReactNode;
  description: string;
  aiPowered?: boolean;
  forVideo?: boolean;
  forImage?: boolean;
}

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';

const MediaEditor: React.FC<MediaEditorProps> = ({ asset, onClose, onSave }) => {
  const [currentMode, setCurrentMode] = useState<EditMode>('select');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [currentImageUrl, setCurrentImageUrl] = useState(asset.url || '');
  const [originalUrl] = useState(asset.url || '');
  const [history, setHistory] = useState<string[]>([asset.url || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [operations, setOperations] = useState<EditOperation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [zoom, setZoom] = useState(100);
  const [stylePreset, setStylePreset] = useState<string | null>(null);

  // Video-specific state
  const [videoStartTime, setVideoStartTime] = useState(0);
  const [videoEndTime, setVideoEndTime] = useState(0);
  const [textOverlay, setTextOverlay] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 50, y: 50 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isVideo = asset.type === 'video';
  const isImage = asset.type === 'image';

  // Edit tools configuration
  const editTools: EditTool[] = [
    {
      id: 'select',
      name: 'Select',
      icon: <MousePointer2 className="w-5 h-5" />,
      description: 'Select and move elements',
      forImage: true,
      forVideo: true
    },
    {
      id: 'background-removal',
      name: 'Remove Background',
      icon: <Eraser className="w-5 h-5" />,
      description: 'AI removes the background',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'background-replace',
      name: 'Replace Background',
      icon: <Layers className="w-5 h-5" />,
      description: 'Replace background with AI generation',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'style-transfer',
      name: 'Style Transfer',
      icon: <Palette className="w-5 h-5" />,
      description: 'Apply artistic styles',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'object-removal',
      name: 'Remove Object',
      icon: <Wand2 className="w-5 h-5" />,
      description: 'Select and remove objects',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'object-addition',
      name: 'Add Object',
      icon: <Sparkles className="w-5 h-5" />,
      description: 'AI generates and adds elements',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'color-correction',
      name: 'Color Correction',
      icon: <SlidersHorizontal className="w-5 h-5" />,
      description: 'Auto-enhance colors',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'upscale',
      name: 'AI Upscale',
      icon: <ZoomIn className="w-5 h-5" />,
      description: 'Upscale to 2x/4x resolution',
      aiPowered: true,
      forImage: true
    },
    {
      id: 'trim',
      name: 'Trim Video',
      icon: <Scissors className="w-5 h-5" />,
      description: 'Cut and trim video segments',
      forVideo: true
    },
    {
      id: 'text-overlay',
      name: 'Add Text',
      icon: <Type className="w-5 h-5" />,
      description: 'Add text overlays',
      forVideo: true,
      forImage: true
    }
  ];

  // Filter tools based on asset type
  const availableTools = editTools.filter(tool =>
    (isImage && tool.forImage) || (isVideo && tool.forVideo)
  );

  // Style presets for style transfer
  const stylePresets = [
    { id: 'oil-painting', name: 'Oil Painting', prompt: 'Transform into a classic oil painting style with rich textures and brushstrokes' },
    { id: 'watercolor', name: 'Watercolor', prompt: 'Convert to a soft watercolor painting with flowing colors' },
    { id: 'sketch', name: 'Pencil Sketch', prompt: 'Transform into a detailed pencil sketch' },
    { id: 'anime', name: 'Anime', prompt: 'Convert to anime/manga art style' },
    { id: 'cinematic', name: 'Cinematic', prompt: 'Apply cinematic color grading with dramatic lighting' },
    { id: 'vintage', name: 'Vintage', prompt: 'Apply vintage film photography look' },
    { id: 'neon', name: 'Neon Glow', prompt: 'Add cyberpunk neon glow effects' },
    { id: 'minimal', name: 'Minimalist', prompt: 'Simplify to minimalist flat design' }
  ];

  // Load image into canvas for editing
  useEffect(() => {
    if (isImage && imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx?.drawImage(img, 0, 0);
      };
    }
  }, [currentImageUrl, isImage]);

  // Load video duration
  useEffect(() => {
    if (isVideo && videoRef.current) {
      videoRef.current.onloadedmetadata = () => {
        setVideoEndTime(videoRef.current?.duration || 0);
      };
    }
  }, [isVideo]);

  // Add to history
  const addToHistory = useCallback((newUrl: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newUrl);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setCurrentImageUrl(newUrl);
  }, [history, historyIndex]);

  // Undo/Redo
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (canUndo) {
      setHistoryIndex(historyIndex - 1);
      setCurrentImageUrl(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (canRedo) {
      setHistoryIndex(historyIndex + 1);
      setCurrentImageUrl(history[historyIndex + 1]);
    }
  };

  // Convert image URL to base64
  const urlToBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Process with Google Gemini AI
  const processWithAI = async (editPrompt: string, editType: EditMode) => {
    setIsProcessing(true);
    setError(null);

    try {
      // Get base64 image
      const base64Image = await urlToBase64(currentImageUrl);
      const base64Data = base64Image.split(',')[1];

      // Build the prompt based on edit type
      let fullPrompt = '';
      switch (editType) {
        case 'background-removal':
          fullPrompt = 'Remove the background from this image completely, making it transparent. Keep only the main subject.';
          break;
        case 'background-replace':
          fullPrompt = `Remove the current background and replace it with: ${editPrompt}. Make it look natural and seamless.`;
          break;
        case 'style-transfer':
          fullPrompt = editPrompt || 'Transform this image into an artistic style while preserving the subject.';
          break;
        case 'object-removal':
          fullPrompt = `Remove the following from the image: ${editPrompt}. Fill the area naturally.`;
          break;
        case 'object-addition':
          fullPrompt = `Add the following to the image: ${editPrompt}. Make it look natural and well-integrated.`;
          break;
        case 'color-correction':
          fullPrompt = 'Auto-enhance this image: improve colors, contrast, brightness, and overall quality while keeping it natural.';
          break;
        case 'upscale':
          fullPrompt = 'Enhance and upscale this image to higher resolution with improved details and clarity.';
          break;
        default:
          fullPrompt = editPrompt;
      }

      // Call Google Gemini API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_AI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: fullPrompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              responseModalities: ['image', 'text'],
              responseMimeType: 'image/jpeg'
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      // Extract generated image
      const generatedImage = data.candidates?.[0]?.content?.parts?.find(
        (p: { inlineData?: { data: string; mimeType: string } }) => p.inlineData
      );

      if (generatedImage?.inlineData) {
        const newImageUrl = `data:${generatedImage.inlineData.mimeType};base64,${generatedImage.inlineData.data}`;
        addToHistory(newImageUrl);

        // Record operation
        const operation: EditOperation = {
          id: Date.now().toString(),
          type: editType as EditOperation['type'],
          prompt: editPrompt,
          timestamp: new Date().toISOString()
        };
        setOperations([...operations, operation]);
      } else {
        throw new Error('No image generated');
      }
    } catch (err) {
      console.error('AI processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle tool action
  const handleToolAction = () => {
    if (currentMode === 'select') return;

    const needsPrompt = ['background-replace', 'object-removal', 'object-addition'].includes(currentMode);
    const hasStylePreset = currentMode === 'style-transfer' && stylePreset;

    if (needsPrompt && !prompt.trim()) {
      setError('Please enter a description');
      return;
    }

    let editPrompt = prompt;
    if (hasStylePreset) {
      const preset = stylePresets.find(s => s.id === stylePreset);
      editPrompt = preset?.prompt || prompt;
    }

    processWithAI(editPrompt, currentMode);
    setPrompt('');
    setStylePreset(null);
  };

  // Download edited image
  const downloadImage = async () => {
    const link = document.createElement('a');
    link.href = currentImageUrl;
    const ext = currentImageUrl.startsWith('data:image/png') ? 'png' : 'jpg';
    link.download = `${asset.name.replace(/\.[^.]+$/, '')}_edited.${ext}`;
    link.click();
  };

  // Save changes
  const handleSave = () => {
    onSave(currentImageUrl, operations);
    onClose();
  };

  // Render prompt input based on current mode
  const renderPromptInput = () => {
    const modeConfig: Record<string, { placeholder: string; label: string }> = {
      'background-replace': {
        placeholder: 'e.g., "A sunset beach", "A modern office"',
        label: 'New background description:'
      },
      'object-removal': {
        placeholder: 'e.g., "the car in the background", "watermark"',
        label: 'What to remove:'
      },
      'object-addition': {
        placeholder: 'e.g., "a red balloon floating", "sunglasses"',
        label: 'What to add:'
      }
    };

    const config = modeConfig[currentMode];
    if (!config) return null;

    return (
      <div className="space-y-2">
        <label className="text-sm text-gray-400">{config.label}</label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={config.placeholder}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
          onKeyDown={(e) => e.key === 'Enter' && handleToolAction()}
        />
      </div>
    );
  };

  // Render style presets for style transfer
  const renderStylePresets = () => {
    if (currentMode !== 'style-transfer') return null;

    return (
      <div className="space-y-2">
        <label className="text-sm text-gray-400">Choose a style:</label>
        <div className="grid grid-cols-4 gap-2">
          {stylePresets.map(preset => (
            <button
              key={preset.id}
              onClick={() => setStylePreset(preset.id)}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                stylePreset === preset.id
                  ? 'bg-brand-gold text-black'
                  : 'bg-white/5 text-white hover:bg-white/10'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">Or enter a custom style:</p>
        <input
          type="text"
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value);
            setStylePreset(null);
          }}
          placeholder="e.g., Van Gogh's Starry Night style"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex">
      {/* Left Toolbar */}
      <div className="w-16 bg-black/80 border-r border-white/10 flex flex-col items-center py-4 gap-1">
        {availableTools.map(tool => (
          <button
            key={tool.id}
            onClick={() => setCurrentMode(tool.id)}
            className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors relative group ${
              currentMode === tool.id
                ? 'bg-brand-gold/20 text-brand-gold'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
            title={tool.name}
          >
            {tool.icon}
            {tool.aiPowered && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
            )}
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-2 py-1 bg-black/90 border border-white/10 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10">
              {tool.name}
              {tool.aiPowered && <span className="text-purple-400 ml-1">AI</span>}
            </div>
          </button>
        ))}

        <div className="flex-1" />

        {/* History Toggle */}
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
            showHistory ? 'bg-brand-gold/20 text-brand-gold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
          }`}
          title="Edit History"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 bg-black/80 border-b border-white/10 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-white font-medium">{asset.name}</h2>
              <p className="text-xs text-gray-500">
                {isImage ? 'Image Editor' : 'Video Editor'}
                {operations.length > 0 && ` • ${operations.length} edit${operations.length > 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Undo/Redo */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-2 rounded-lg transition-colors ${
                canUndo ? 'text-white hover:bg-white/10' : 'text-gray-600'
              }`}
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-2 rounded-lg transition-colors ${
                canRedo ? 'text-white hover:bg-white/10' : 'text-gray-600'
              }`}
            >
              <Redo2 className="w-5 h-5" />
            </button>

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Compare */}
            <button
              onClick={() => setShowCompare(!showCompare)}
              className={`p-2 rounded-lg transition-colors ${
                showCompare ? 'bg-brand-gold/20 text-brand-gold' : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
              title="Compare with original"
            >
              {showCompare ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Zoom */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2">
              <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-1 text-gray-400 hover:text-white">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-sm text-white w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-1 text-gray-400 hover:text-white">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-white/10 mx-2" />

            {/* Download */}
            <button
              onClick={downloadImage}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>

            {/* Save */}
            <button
              onClick={handleSave}
              disabled={operations.length === 0}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                operations.length > 0
                  ? 'bg-brand-gold text-black hover:bg-brand-gold/90'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center bg-[#1a1a1a] overflow-auto p-8 relative"
        >
          {isImage && (
            <div className="relative" style={{ transform: `scale(${zoom / 100})` }}>
              {/* Original (for comparison) */}
              {showCompare && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${comparePosition}%` }}
                >
                  <img
                    src={originalUrl}
                    alt="Original"
                    className="max-w-none"
                  />
                </div>
              )}

              {/* Current */}
              <img
                ref={imageRef}
                src={currentImageUrl}
                alt={asset.name}
                className="max-w-full max-h-[calc(100vh-200px)] select-none"
                style={{ opacity: showCompare ? 1 : 1 }}
              />

              {/* Compare slider */}
              {showCompare && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
                  style={{ left: `${comparePosition}%` }}
                  onMouseDown={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    const handleMove = (moveE: MouseEvent) => {
                      const x = ((moveE.clientX - rect.left) / rect.width) * 100;
                      setComparePosition(Math.max(0, Math.min(100, x)));
                    };
                    const handleUp = () => {
                      window.removeEventListener('mousemove', handleMove);
                      window.removeEventListener('mouseup', handleUp);
                    };
                    window.addEventListener('mousemove', handleMove);
                    window.addEventListener('mouseup', handleUp);
                  }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <ChevronLeft className="w-4 h-4 text-black" />
                    <ChevronRight className="w-4 h-4 text-black -ml-2" />
                  </div>
                </div>
              )}
            </div>
          )}

          {isVideo && (
            <video
              ref={videoRef}
              src={asset.url}
              className="max-w-full max-h-[calc(100vh-200px)]"
              controls
              style={{ transform: `scale(${zoom / 100})` }}
            />
          )}

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-brand-gold animate-spin mb-4" />
              <p className="text-white font-medium">AI is processing your edit...</p>
              <p className="text-gray-400 text-sm mt-1">This may take a few seconds</p>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>

      {/* Right Panel - Tool Options */}
      <div className="w-80 bg-black/80 border-l border-white/10 flex flex-col">
        {/* Current Tool Info */}
        <div className="p-4 border-b border-white/10">
          {(() => {
            const tool = editTools.find(t => t.id === currentMode);
            return (
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  tool?.aiPowered ? 'bg-purple-500/20 text-purple-400' : 'bg-brand-gold/20 text-brand-gold'
                }`}>
                  {tool?.icon}
                </div>
                <div>
                  <h3 className="text-white font-medium">{tool?.name}</h3>
                  <p className="text-xs text-gray-500">{tool?.description}</p>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tool Options */}
        <div className="flex-1 p-4 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {currentMode === 'select' && (
            <div className="text-center text-gray-500 py-8">
              <MousePointer2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a tool from the left panel to start editing</p>
            </div>
          )}

          {currentMode === 'background-removal' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                AI will automatically detect and remove the background, leaving only the main subject.
              </p>
              <button
                onClick={() => processWithAI('', 'background-removal')}
                disabled={isProcessing}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Remove Background
              </button>
            </div>
          )}

          {currentMode === 'background-replace' && (
            <div className="space-y-4">
              {renderPromptInput()}
              <button
                onClick={handleToolAction}
                disabled={isProcessing || !prompt.trim()}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Replace Background
              </button>
            </div>
          )}

          {currentMode === 'style-transfer' && (
            <div className="space-y-4">
              {renderStylePresets()}
              <button
                onClick={handleToolAction}
                disabled={isProcessing || (!stylePreset && !prompt.trim())}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Apply Style
              </button>
            </div>
          )}

          {currentMode === 'object-removal' && (
            <div className="space-y-4">
              {renderPromptInput()}
              <button
                onClick={handleToolAction}
                disabled={isProcessing || !prompt.trim()}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Remove Object
              </button>
            </div>
          )}

          {currentMode === 'object-addition' && (
            <div className="space-y-4">
              {renderPromptInput()}
              <button
                onClick={handleToolAction}
                disabled={isProcessing || !prompt.trim()}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Add Object
              </button>
            </div>
          )}

          {currentMode === 'color-correction' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                AI will analyze the image and automatically enhance colors, contrast, and brightness.
              </p>
              <button
                onClick={() => processWithAI('', 'color-correction')}
                disabled={isProcessing}
                className="w-full py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Auto Enhance
              </button>
            </div>
          )}

          {currentMode === 'upscale' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                AI will upscale the image with improved details and clarity.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => processWithAI('Upscale to 2x resolution', 'upscale')}
                  disabled={isProcessing}
                  className="py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  2x Upscale
                </button>
                <button
                  onClick={() => processWithAI('Upscale to 4x resolution', 'upscale')}
                  disabled={isProcessing}
                  className="py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  4x Upscale
                </button>
              </div>
            </div>
          )}

          {currentMode === 'text-overlay' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Text content:</label>
                <textarea
                  value={textOverlay}
                  onChange={(e) => setTextOverlay(e.target.value)}
                  placeholder="Enter your text..."
                  className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white resize-none focus:outline-none focus:border-brand-gold/50"
                  rows={3}
                />
              </div>
              <button
                disabled={!textOverlay.trim()}
                className="w-full py-3 bg-brand-gold text-black rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-50"
              >
                Add Text
              </button>
            </div>
          )}

          {currentMode === 'trim' && isVideo && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Start time (seconds):</label>
                <input
                  type="number"
                  value={videoStartTime}
                  onChange={(e) => setVideoStartTime(Number(e.target.value))}
                  min={0}
                  max={videoEndTime}
                  className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">End time (seconds):</label>
                <input
                  type="number"
                  value={videoEndTime}
                  onChange={(e) => setVideoEndTime(Number(e.target.value))}
                  min={videoStartTime}
                  className="w-full mt-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                />
              </div>
              <button className="w-full py-3 bg-brand-gold text-black rounded-lg hover:bg-brand-gold/90 transition-colors">
                Trim Video
              </button>
            </div>
          )}
        </div>

        {/* History Panel */}
        {showHistory && (
          <div className="border-t border-white/10 p-4 max-h-48 overflow-y-auto">
            <h4 className="text-sm font-medium text-white mb-2">Edit History</h4>
            {operations.length === 0 ? (
              <p className="text-xs text-gray-500">No edits yet</p>
            ) : (
              <div className="space-y-2">
                {operations.map((op, i) => (
                  <div key={op.id} className="flex items-center gap-2 text-xs">
                    <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-gray-400">
                      {i + 1}
                    </span>
                    <span className="text-gray-300 capitalize">{op.type.replace('-', ' ')}</span>
                    {op.prompt && (
                      <span className="text-gray-500 truncate">"{op.prompt}"</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaEditor;
