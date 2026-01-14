// Video Production AI Agents - 5 Specialized Agents for Video Editing
// Each agent handles a specific domain of video production

import { GoogleGenAI } from '@google/genai';
import { getGoogleAIKey } from './aiConfig';

// Types
export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
  confidence?: number;
  suggestions?: string[];
}

export interface VideoContext {
  duration: number;
  aspectRatio: string;
  resolution: string;
  hasAudio: boolean;
  frameCount?: number;
  fps?: number;
}

// Agent 1: Director Agent - High-level creative decisions
export class DirectorAgent {
  private ai: GoogleGenAI | null;
  private model = 'gemini-2.0-flash';

  constructor() {
    const apiKey = getGoogleAIKey();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async analyzeProject(
    description: string,
    targetAudience?: string,
    style?: string
  ): Promise<AgentResponse> {
    if (!this.ai) return { success: false, error: 'AI not configured' };

    try {
      const prompt = `As a professional video director, analyze this project brief and provide creative direction.

Project Description: ${description}
Target Audience: ${targetAudience || 'General'}
Desired Style: ${style || 'Professional'}

Provide:
1. Overall creative vision
2. Recommended visual style (color palette, lighting mood)
3. Pacing suggestions (fast, medium, slow)
4. Key storytelling beats
5. Recommended music mood
6. Shot composition recommendations

Return JSON:
{
  "vision": "string",
  "visualStyle": {
    "colorPalette": ["color1", "color2", "color3"],
    "lightingMood": "string",
    "contrast": "low|medium|high"
  },
  "pacing": "slow|medium|fast|dynamic",
  "storyBeats": ["beat1", "beat2", "beat3"],
  "musicMood": "string",
  "shotRecommendations": ["rec1", "rec2", "rec3"],
  "confidence": 0.0-1.0
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return { success: true, data, confidence: data.confidence || 0.85 };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async suggestCuts(frames: string[], targetDuration?: number): Promise<AgentResponse> {
    if (!this.ai || frames.length === 0) {
      return { success: false, error: 'No frames to analyze' };
    }

    try {
      const prompt = `As a video director, analyze these frames and suggest optimal cut points.
Target Duration: ${targetDuration || 'As needed'} seconds

Identify:
1. Scene changes
2. Emotional beats
3. Pacing issues
4. Recommended cuts
5. Segments to remove

Return JSON:
{
  "cuts": [
    { "frameStart": 0, "frameEnd": 30, "action": "keep|trim|remove", "reason": "string" }
  ],
  "overallPacing": "needs work|good|excellent",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { parts: [{ text: prompt }, ...frames.slice(0, 15).map(f => ({
            inlineData: { mimeType: 'image/jpeg', data: f.replace(/^data:image\/\w+;base64,/, '') }
          }))] }
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Agent 2: Colorist Agent - Color grading and visual correction
export class ColoristAgent {
  private ai: GoogleGenAI | null;
  private model = 'gemini-2.0-flash';

  constructor() {
    const apiKey = getGoogleAIKey();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async analyzeColorProfile(frame: string): Promise<AgentResponse> {
    if (!this.ai || !frame) return { success: false, error: 'No frame provided' };

    try {
      const prompt = `As a professional colorist, analyze this video frame.

Evaluate:
1. Current color temperature
2. Exposure levels
3. Contrast range
4. Color balance
5. Skin tone accuracy (if applicable)

Provide color grading recommendations:
- Lift (shadows)
- Gamma (midtones)
- Gain (highlights)
- Saturation adjustments
- Temperature/tint corrections

Return JSON:
{
  "currentAnalysis": {
    "temperature": "warm|neutral|cool",
    "exposure": "underexposed|normal|overexposed",
    "contrast": "low|medium|high",
    "dominantColors": ["color1", "color2"]
  },
  "corrections": {
    "brightness": -100 to 100,
    "contrast": -100 to 100,
    "saturation": -100 to 100,
    "temperature": -100 to 100,
    "highlights": -100 to 100,
    "shadows": -100 to 100
  },
  "recommendedLUT": "cinematic|vibrant|vintage|dramatic|soft",
  "confidence": 0.0-1.0
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: frame.replace(/^data:image\/\w+;base64,/, '') } }] }
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async matchColors(referenceFrame: string, targetFrame: string): Promise<AgentResponse> {
    if (!this.ai) return { success: false, error: 'AI not configured' };

    try {
      const prompt = `As a colorist, analyze these two frames and provide settings to match the target to the reference.

First image is the REFERENCE (desired look).
Second image is the TARGET (needs adjustment).

Provide exact adjustment values to match the target to reference.

Return JSON:
{
  "adjustments": {
    "brightness": number,
    "contrast": number,
    "saturation": number,
    "temperature": number,
    "tint": number,
    "highlights": number,
    "shadows": number
  },
  "matchConfidence": 0.0-1.0
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: referenceFrame.replace(/^data:image\/\w+;base64,/, '') } },
            { inlineData: { mimeType: 'image/jpeg', data: targetFrame.replace(/^data:image\/\w+;base64,/, '') } }
          ] }
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  getColorPresets() {
    return [
      { id: 'cinematic', name: 'Cinematic', params: { contrast: 15, saturation: -10, temperature: -300, shadows: -10, highlights: -5 } },
      { id: 'vibrant', name: 'Vibrant Pop', params: { contrast: 5, saturation: 25, temperature: 100, shadows: 0, highlights: 5 } },
      { id: 'vintage', name: 'Vintage Film', params: { contrast: -5, saturation: -20, temperature: 400, shadows: 15, highlights: -10 } },
      { id: 'cool', name: 'Cool Blue', params: { contrast: 10, saturation: 5, temperature: -600, shadows: 0, highlights: 10 } },
      { id: 'warm', name: 'Golden Hour', params: { contrast: 5, saturation: 10, temperature: 500, shadows: 10, highlights: 0 } },
      { id: 'dramatic', name: 'Dramatic', params: { contrast: 30, saturation: -15, temperature: -200, shadows: -25, highlights: 20 } },
      { id: 'noir', name: 'Film Noir', params: { contrast: 40, saturation: -100, temperature: 0, shadows: -30, highlights: 10 } },
      { id: 'pastel', name: 'Soft Pastel', params: { contrast: -15, saturation: -10, temperature: 150, shadows: 20, highlights: -20 } },
    ];
  }
}

// Agent 3: Sound Designer Agent - Audio analysis and enhancement
export class SoundDesignerAgent {
  private ai: GoogleGenAI | null;
  private model = 'gemini-2.0-flash';

  constructor() {
    const apiKey = getGoogleAIKey();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async suggestMusic(
    frames: string[],
    mood?: string,
    duration?: number
  ): Promise<AgentResponse> {
    if (!this.ai || frames.length === 0) {
      return { success: false, error: 'No frames to analyze' };
    }

    try {
      const prompt = `As a sound designer, analyze these video frames and suggest appropriate music.

Requested Mood: ${mood || 'Auto-detect'}
Video Duration: ${duration || 'Unknown'} seconds

Analyze the visual content and recommend:
1. Music genre
2. Tempo (BPM range)
3. Instrumentation
4. Mood keywords
5. Energy level throughout

Return JSON:
{
  "primaryGenre": "string",
  "secondaryGenres": ["genre1", "genre2"],
  "tempo": { "min": 60, "max": 120 },
  "instrumentation": ["instrument1", "instrument2"],
  "moodKeywords": ["keyword1", "keyword2", "keyword3"],
  "energyCurve": [
    { "timestamp": 0, "energy": "low|medium|high" },
    { "timestamp": 0.5, "energy": "low|medium|high" },
    { "timestamp": 1.0, "energy": "low|medium|high" }
  ],
  "recommendedTracks": [
    { "type": "string", "mood": "string", "reason": "string" }
  ]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { parts: [{ text: prompt }, ...frames.slice(0, 10).map(f => ({
            inlineData: { mimeType: 'image/jpeg', data: f.replace(/^data:image\/\w+;base64,/, '') }
          }))] }
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateVoiceoverScript(
    description: string,
    duration: number,
    tone?: string
  ): Promise<AgentResponse> {
    if (!this.ai) return { success: false, error: 'AI not configured' };

    try {
      const prompt = `As a sound designer and copywriter, create a voiceover script.

Video Description: ${description}
Target Duration: ${duration} seconds (approximately ${Math.ceil(duration * 2.5)} words)
Tone: ${tone || 'Professional'}

Create a script that:
1. Matches the visual content
2. Has natural pacing
3. Includes timing cues
4. Is engaging and clear

Return JSON:
{
  "script": "Full voiceover text",
  "segments": [
    { "text": "segment text", "startTime": 0, "endTime": 3, "emphasis": "normal|strong" }
  ],
  "wordCount": number,
  "estimatedDuration": number,
  "suggestedVoice": "male|female|neutral",
  "suggestedTone": "string"
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  getMusicPresets() {
    return [
      { id: 'corporate', name: 'Corporate Upbeat', mood: 'professional', tempo: 'medium', genre: 'corporate' },
      { id: 'cinematic', name: 'Cinematic Epic', mood: 'dramatic', tempo: 'slow', genre: 'orchestral' },
      { id: 'tech', name: 'Tech Future', mood: 'innovative', tempo: 'medium', genre: 'electronic' },
      { id: 'inspiring', name: 'Inspiring Journey', mood: 'uplifting', tempo: 'medium', genre: 'ambient' },
      { id: 'energetic', name: 'High Energy', mood: 'exciting', tempo: 'fast', genre: 'electronic' },
      { id: 'chill', name: 'Chill Vibes', mood: 'relaxed', tempo: 'slow', genre: 'lofi' },
    ];
  }
}

// Agent 4: Motion Graphics Agent - Text, animations, and overlays
export class MotionGraphicsAgent {
  private ai: GoogleGenAI | null;
  private model = 'gemini-2.0-flash';

  constructor() {
    const apiKey = getGoogleAIKey();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async suggestTextOverlay(
    frame: string,
    message: string,
    style?: string
  ): Promise<AgentResponse> {
    if (!this.ai || !frame) return { success: false, error: 'No frame provided' };

    try {
      const prompt = `As a motion graphics designer, analyze this frame and suggest text overlay placement.

Message to display: "${message}"
Desired style: ${style || 'Modern'}

Analyze the frame and recommend:
1. Optimal text position (avoiding key visual elements)
2. Font style recommendations
3. Color that contrasts well with background
4. Animation type
5. Timing

Return JSON:
{
  "position": {
    "x": 0-100 (percentage),
    "y": 0-100 (percentage),
    "alignment": "left|center|right"
  },
  "styling": {
    "fontFamily": "string",
    "fontSize": "small|medium|large|xlarge",
    "fontWeight": "normal|bold|black",
    "color": "#HEXCODE",
    "backgroundColor": "#HEXCODE or null",
    "shadow": true/false
  },
  "animation": {
    "type": "fade|slide|typewriter|bounce|scale",
    "direction": "up|down|left|right|none",
    "duration": 0.5,
    "delay": 0
  },
  "safeZones": [
    { "x": 0, "y": 0, "width": 100, "height": 100, "reason": "string" }
  ]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          { parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: frame.replace(/^data:image\/\w+;base64,/, '') } }] }
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return { success: true, data: JSON.parse(jsonMatch[0]) };
      }
      return { success: false, error: 'Failed to parse response' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async generateLowerThird(
    name: string,
    title: string,
    style?: string
  ): Promise<AgentResponse> {
    const styles = {
      modern: { font: 'Inter', animation: 'slide', accent: '#d4af37' },
      minimal: { font: 'Helvetica', animation: 'fade', accent: '#ffffff' },
      bold: { font: 'Oswald', animation: 'bounce', accent: '#ff3366' },
      elegant: { font: 'Playfair Display', animation: 'fade', accent: '#c9a961' },
      tech: { font: 'Space Grotesk', animation: 'slide', accent: '#00ffcc' },
    };

    const selectedStyle = styles[style as keyof typeof styles] || styles.modern;

    return {
      success: true,
      data: {
        name,
        title,
        style: selectedStyle,
        position: { x: 5, y: 75 },
        duration: 4,
        animation: {
          in: selectedStyle.animation,
          out: 'fade',
          duration: 0.5
        }
      }
    };
  }

  getTextAnimations() {
    return [
      { id: 'fade', name: 'Fade In', preview: 'Smooth opacity transition' },
      { id: 'slideUp', name: 'Slide Up', preview: 'Slides in from bottom' },
      { id: 'slideDown', name: 'Slide Down', preview: 'Slides in from top' },
      { id: 'slideLeft', name: 'Slide Left', preview: 'Slides in from right' },
      { id: 'slideRight', name: 'Slide Right', preview: 'Slides in from left' },
      { id: 'typewriter', name: 'Typewriter', preview: 'Character by character' },
      { id: 'bounce', name: 'Bounce', preview: 'Bouncy entrance' },
      { id: 'scale', name: 'Scale', preview: 'Grows from center' },
      { id: 'blur', name: 'Blur Reveal', preview: 'Unblurs into focus' },
      { id: 'glitch', name: 'Glitch', preview: 'Digital glitch effect' },
    ];
  }

  getFontPresets() {
    return [
      { id: 'inter', name: 'Inter', category: 'sans-serif', style: 'modern' },
      { id: 'roboto', name: 'Roboto', category: 'sans-serif', style: 'clean' },
      { id: 'oswald', name: 'Oswald', category: 'sans-serif', style: 'bold' },
      { id: 'playfair', name: 'Playfair Display', category: 'serif', style: 'elegant' },
      { id: 'montserrat', name: 'Montserrat', category: 'sans-serif', style: 'geometric' },
      { id: 'space', name: 'Space Grotesk', category: 'sans-serif', style: 'tech' },
      { id: 'bebas', name: 'Bebas Neue', category: 'sans-serif', style: 'impact' },
    ];
  }
}

// Agent 5: Export Agent - Rendering and delivery optimization
export class ExportAgent {
  private ai: GoogleGenAI | null;
  private model = 'gemini-2.0-flash';

  constructor() {
    const apiKey = getGoogleAIKey();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async recommendExportSettings(
    videoContext: VideoContext,
    platform?: string,
    purpose?: string
  ): Promise<AgentResponse> {
    const platformPresets: Record<string, any> = {
      youtube: { format: 'mp4', codec: 'h264', resolution: '1080p', fps: 30, bitrate: '12M' },
      instagram: { format: 'mp4', codec: 'h264', resolution: '1080p', fps: 30, bitrate: '8M', aspectRatio: '1:1' },
      tiktok: { format: 'mp4', codec: 'h264', resolution: '1080p', fps: 30, bitrate: '8M', aspectRatio: '9:16' },
      twitter: { format: 'mp4', codec: 'h264', resolution: '720p', fps: 30, bitrate: '5M' },
      linkedin: { format: 'mp4', codec: 'h264', resolution: '1080p', fps: 30, bitrate: '8M' },
      web: { format: 'webm', codec: 'vp9', resolution: '1080p', fps: 30, bitrate: '6M' },
      archive: { format: 'mov', codec: 'prores', resolution: '4K', fps: 30, bitrate: '50M' },
    };

    const preset = platformPresets[platform || 'youtube'] || platformPresets.youtube;

    return {
      success: true,
      data: {
        recommended: preset,
        alternatives: [
          { ...preset, resolution: '720p', bitrate: '5M', label: 'Smaller file' },
          { ...preset, resolution: '4K', bitrate: '25M', label: 'Higher quality' },
        ],
        estimatedSize: this.estimateFileSize(videoContext.duration, preset.bitrate),
        renderTime: this.estimateRenderTime(videoContext.duration, preset.resolution),
        warnings: this.getWarnings(videoContext, preset),
      }
    };
  }

  private estimateFileSize(duration: number, bitrate: string): string {
    const bitrateNum = parseInt(bitrate) * 1000000; // Convert M to bits
    const sizeBytes = (bitrateNum * duration) / 8;
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB > 1000 ? `${(sizeMB / 1024).toFixed(1)} GB` : `${sizeMB.toFixed(0)} MB`;
  }

  private estimateRenderTime(duration: number, resolution: string): string {
    const multiplier = resolution === '4K' ? 4 : resolution === '1080p' ? 2 : 1;
    const seconds = duration * multiplier;
    return seconds > 60 ? `${Math.ceil(seconds / 60)} min` : `${seconds} sec`;
  }

  private getWarnings(context: VideoContext, preset: any): string[] {
    const warnings: string[] = [];
    if (context.aspectRatio !== preset.aspectRatio && preset.aspectRatio) {
      warnings.push(`Video aspect ratio (${context.aspectRatio}) differs from platform optimal (${preset.aspectRatio})`);
    }
    if (!context.hasAudio) {
      warnings.push('Video has no audio track');
    }
    return warnings;
  }

  getExportPresets() {
    return [
      { id: 'youtube_hd', name: 'YouTube HD', format: 'mp4', resolution: '1080p', quality: 'high' },
      { id: 'youtube_4k', name: 'YouTube 4K', format: 'mp4', resolution: '2160p', quality: 'ultra' },
      { id: 'instagram_feed', name: 'Instagram Feed', format: 'mp4', resolution: '1080p', aspectRatio: '1:1' },
      { id: 'instagram_reels', name: 'Instagram Reels', format: 'mp4', resolution: '1080p', aspectRatio: '9:16' },
      { id: 'tiktok', name: 'TikTok', format: 'mp4', resolution: '1080p', aspectRatio: '9:16' },
      { id: 'twitter', name: 'Twitter/X', format: 'mp4', resolution: '720p', quality: 'medium' },
      { id: 'linkedin', name: 'LinkedIn', format: 'mp4', resolution: '1080p', quality: 'high' },
      { id: 'web_optimized', name: 'Web Optimized', format: 'webm', resolution: '1080p', quality: 'medium' },
      { id: 'archive', name: 'Archive Master', format: 'mov', resolution: '4K', quality: 'lossless' },
      { id: 'gif', name: 'Animated GIF', format: 'gif', resolution: '480p', quality: 'medium' },
    ];
  }

  async exportVideo(
    videoUrl: string,
    settings: {
      format: string;
      quality: string;
      resolution: string;
      filename: string;
    }
  ): Promise<AgentResponse> {
    try {
      // Fetch the video
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error('Failed to fetch video');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = `${settings.filename}_${settings.resolution}.${settings.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return {
        success: true,
        data: {
          filename: a.download,
          size: blob.size,
          format: settings.format,
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Agent Manager - Coordinates all agents
export class VideoProductionAgentManager {
  public director: DirectorAgent;
  public colorist: ColoristAgent;
  public soundDesigner: SoundDesignerAgent;
  public motionGraphics: MotionGraphicsAgent;
  public export: ExportAgent;

  constructor() {
    this.director = new DirectorAgent();
    this.colorist = new ColoristAgent();
    this.soundDesigner = new SoundDesignerAgent();
    this.motionGraphics = new MotionGraphicsAgent();
    this.export = new ExportAgent();
  }

  async runFullAnalysis(
    frames: string[],
    description: string,
    options?: {
      targetAudience?: string;
      style?: string;
      duration?: number;
    }
  ): Promise<{
    director: AgentResponse;
    colorist: AgentResponse;
    soundDesigner: AgentResponse;
    motionGraphics: AgentResponse;
    export: AgentResponse;
  }> {
    const [directorResult, coloristResult, soundResult] = await Promise.all([
      this.director.analyzeProject(description, options?.targetAudience, options?.style),
      frames[0] ? this.colorist.analyzeColorProfile(frames[0]) : { success: false, error: 'No frames' },
      this.soundDesigner.suggestMusic(frames, undefined, options?.duration),
    ]);

    const motionResult = frames[0]
      ? await this.motionGraphics.suggestTextOverlay(frames[0], description.slice(0, 50), options?.style)
      : { success: false, error: 'No frames' };

    const exportResult = await this.export.recommendExportSettings(
      {
        duration: options?.duration || 10,
        aspectRatio: '16:9',
        resolution: '1080p',
        hasAudio: true,
      },
      'youtube'
    );

    return {
      director: directorResult,
      colorist: coloristResult,
      soundDesigner: soundResult,
      motionGraphics: motionResult,
      export: exportResult,
    };
  }

  getAgentList() {
    return [
      {
        id: 'director',
        name: 'Director Agent',
        description: 'Creative direction, pacing, and storytelling',
        icon: 'Film',
        color: '#d4af37',
      },
      {
        id: 'colorist',
        name: 'Colorist Agent',
        description: 'Color grading and visual correction',
        icon: 'Palette',
        color: '#ff6b6b',
      },
      {
        id: 'sound',
        name: 'Sound Designer Agent',
        description: 'Music selection and audio enhancement',
        icon: 'Music',
        color: '#4ecdc4',
      },
      {
        id: 'motion',
        name: 'Motion Graphics Agent',
        description: 'Text overlays and animations',
        icon: 'Type',
        color: '#a855f7',
      },
      {
        id: 'export',
        name: 'Export Agent',
        description: 'Rendering and delivery optimization',
        icon: 'Download',
        color: '#22c55e',
      },
    ];
  }
}

// Export singleton instance
export const videoAgents = new VideoProductionAgentManager();
