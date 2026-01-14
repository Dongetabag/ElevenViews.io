// Vortex Media Service - AI Content Creation API Integration
// Handles video generation, enhancement, voiceover, and scene analysis

import {
  VortexMediaRequest,
  VortexMediaResponse,
  VortexVideoGenerationOptions,
  VortexEnhanceOptions,
  VortexVoiceOverOptions,
  AISceneDetection,
  DetectedScene,
} from '../types';

// API Configuration
const VORTEX_API_KEY = import.meta.env.VITE_VORTEX_API_KEY || 'AQ.Ab8RN6LyBlNS4iOEexGHeVgHtkHEQUDv2HTEUaKChmEvbqup7g';
const VORTEX_API_URL = import.meta.env.VITE_VORTEX_API_URL || 'https://api.vortexmedia.ai/v1';
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.srv1167160.hstgr.cloud/webhook';

// Voice options available
export const VOICE_OPTIONS = [
  { id: 'narrator-male', name: 'Professional Narrator', language: 'en-US', gender: 'male' as const, style: 'narrator' as const },
  { id: 'narrator-female', name: 'Professional Narrator', language: 'en-US', gender: 'female' as const, style: 'narrator' as const },
  { id: 'casual-male', name: 'Casual Voice', language: 'en-US', gender: 'male' as const, style: 'casual' as const },
  { id: 'casual-female', name: 'Casual Voice', language: 'en-US', gender: 'female' as const, style: 'casual' as const },
  { id: 'professional-male', name: 'Business Professional', language: 'en-US', gender: 'male' as const, style: 'professional' as const },
  { id: 'professional-female', name: 'Business Professional', language: 'en-US', gender: 'female' as const, style: 'professional' as const },
];

// Style presets for video generation
export const VIDEO_STYLE_PRESETS = [
  { id: 'cinematic', name: 'Cinematic', description: 'Film-quality visuals with dramatic lighting' },
  { id: 'documentary', name: 'Documentary', description: 'Natural, authentic footage style' },
  { id: 'commercial', name: 'Commercial', description: 'Polished, professional advertising look' },
  { id: 'social', name: 'Social Media', description: 'Engaging, fast-paced content' },
];

// Music mood options
export const MUSIC_MOODS = [
  'upbeat', 'dramatic', 'calm', 'inspiring', 'mysterious',
  'corporate', 'emotional', 'energetic', 'romantic', 'epic'
];

class VortexMediaService {
  private apiKey: string;
  private baseUrl: string;
  private n8nUrl: string;

  constructor() {
    this.apiKey = VORTEX_API_KEY;
    this.baseUrl = VORTEX_API_URL;
    this.n8nUrl = N8N_WEBHOOK_URL;
  }

  // ============================================
  // API Request Helper
  // ============================================

  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.message || error.error || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Trigger n8n workflow for async processing
  private async triggerN8nWorkflow(
    workflow: string,
    payload: Record<string, unknown>
  ): Promise<VortexMediaResponse> {
    try {
      const response = await fetch(`${this.n8nUrl}/${workflow}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          apiKey: this.apiKey,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Workflow error: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('n8n workflow error:', error);
      throw error;
    }
  }

  // Poll for job completion
  private async pollForCompletion(
    jobId: string,
    maxWait = 120000,
    pollInterval = 2000
  ): Promise<VortexMediaResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      try {
        const result = await this.request<VortexMediaResponse>(`/jobs/${jobId}`, 'GET');

        if (result.status === 'completed') {
          return result;
        }

        if (result.status === 'failed') {
          throw new Error(result.error || 'Job failed');
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        throw error;
      }
    }

    throw new Error('Job timed out');
  }

  // ============================================
  // Video Generation
  // ============================================

  async generateVideo(options: VortexVideoGenerationOptions): Promise<{
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
  }> {
    try {
      // First, trigger the generation via n8n workflow
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'generate_video',
        prompt: options.prompt,
        duration: options.duration || 10,
        style: options.style || 'cinematic',
        aspectRatio: options.aspectRatio || '16:9',
        quality: options.quality || 'standard',
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start video generation');
      }

      // Poll for completion
      const result = await this.pollForCompletion(response.jobId);

      return {
        videoUrl: (result.data as any).videoUrl,
        thumbnailUrl: (result.data as any).thumbnailUrl,
        duration: (result.data as any).duration || options.duration || 10,
      };
    } catch (error) {
      console.error('Video generation error:', error);
      throw error;
    }
  }

  // ============================================
  // Video Enhancement
  // ============================================

  async enhanceVideo(
    videoUrl: string,
    options: VortexEnhanceOptions
  ): Promise<{ enhancedUrl: string }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'enhance_video',
        videoUrl,
        ...options,
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start video enhancement');
      }

      const result = await this.pollForCompletion(response.jobId, 300000); // 5 min timeout

      return {
        enhancedUrl: (result.data as any).enhancedUrl,
      };
    } catch (error) {
      console.error('Video enhancement error:', error);
      throw error;
    }
  }

  // ============================================
  // Voice-over Generation
  // ============================================

  async generateVoiceOver(options: VortexVoiceOverOptions): Promise<{
    audioUrl: string;
    duration: number;
  }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'generate_voiceover',
        text: options.text,
        voice: options.voice,
        speed: options.speed || 1.0,
        pitch: options.pitch || 1.0,
        language: options.language || 'en-US',
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start voiceover generation');
      }

      const result = await this.pollForCompletion(response.jobId);

      return {
        audioUrl: (result.data as any).audioUrl,
        duration: (result.data as any).duration,
      };
    } catch (error) {
      console.error('Voiceover generation error:', error);
      throw error;
    }
  }

  // ============================================
  // Background Music Generation
  // ============================================

  async generateBackgroundMusic(options: {
    mood: string;
    duration: number;
    genre?: string;
    tempo?: 'slow' | 'medium' | 'fast';
  }): Promise<{ musicUrl: string; duration: number }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'generate_music',
        mood: options.mood,
        duration: options.duration,
        genre: options.genre || 'ambient',
        tempo: options.tempo || 'medium',
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start music generation');
      }

      const result = await this.pollForCompletion(response.jobId);

      return {
        musicUrl: (result.data as any).musicUrl,
        duration: (result.data as any).duration || options.duration,
      };
    } catch (error) {
      console.error('Music generation error:', error);
      throw error;
    }
  }

  // ============================================
  // Audio Transcription
  // ============================================

  async transcribeAudio(audioUrl: string): Promise<{
    text: string;
    segments: { start: number; end: number; text: string }[];
    language: string;
  }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'transcribe',
        audioUrl,
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start transcription');
      }

      const result = await this.pollForCompletion(response.jobId);

      return {
        text: (result.data as any).text,
        segments: (result.data as any).segments || [],
        language: (result.data as any).language || 'en',
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw error;
    }
  }

  // ============================================
  // Video Analysis / Scene Detection
  // ============================================

  async analyzeVideo(videoUrl: string): Promise<AISceneDetection> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'analyze_scene',
        videoUrl,
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start video analysis');
      }

      const result = await this.pollForCompletion(response.jobId);
      const data = result.data as any;

      return {
        scenes: data.scenes.map((scene: any) => ({
          startTime: scene.start,
          endTime: scene.end,
          type: scene.type || 'static',
          confidence: scene.confidence || 0.8,
          suggestedCuts: scene.suggestedCuts || [],
          description: scene.description,
        })),
        confidence: data.overallConfidence || 0.85,
        processingTime: data.processingTime || 0,
      };
    } catch (error) {
      console.error('Video analysis error:', error);
      throw error;
    }
  }

  // ============================================
  // Auto-Edit
  // ============================================

  async generateAutoEdit(
    videoUrls: string[],
    options: {
      style: 'fast' | 'cinematic' | 'documentary';
      targetDuration?: number;
      musicMood?: string;
      includeMusic?: boolean;
    }
  ): Promise<{
    editedVideoUrl: string;
    timeline: any;
    musicUrl?: string;
  }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'auto_edit',
        videoUrls,
        style: options.style,
        targetDuration: options.targetDuration,
        musicMood: options.musicMood,
        includeMusic: options.includeMusic ?? true,
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to start auto-edit');
      }

      const result = await this.pollForCompletion(response.jobId, 600000); // 10 min timeout

      return {
        editedVideoUrl: (result.data as any).editedVideoUrl,
        timeline: (result.data as any).timeline,
        musicUrl: (result.data as any).musicUrl,
      };
    } catch (error) {
      console.error('Auto-edit error:', error);
      throw error;
    }
  }

  // ============================================
  // Smart Cut Suggestions
  // ============================================

  async suggestCuts(
    videoUrl: string,
    options?: {
      targetDuration?: number;
      keepHighlights?: boolean;
      removeSilence?: boolean;
    }
  ): Promise<{
    suggestedCuts: { start: number; end: number; reason: string; action: 'keep' | 'remove' }[];
    confidence: number;
  }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'suggest_cuts',
        videoUrl,
        targetDuration: options?.targetDuration,
        keepHighlights: options?.keepHighlights ?? true,
        removeSilence: options?.removeSilence ?? true,
      });

      if (!response.success || !response.jobId) {
        throw new Error(response.error || 'Failed to analyze for cuts');
      }

      const result = await this.pollForCompletion(response.jobId);

      return {
        suggestedCuts: (result.data as any).cuts || [],
        confidence: (result.data as any).confidence || 0.8,
      };
    } catch (error) {
      console.error('Cut suggestion error:', error);
      throw error;
    }
  }

  // ============================================
  // Thumbnail Generation
  // ============================================

  async generateThumbnail(
    videoUrl: string,
    options?: {
      style?: 'cinematic' | 'minimal' | 'bold';
      includeText?: boolean;
      textOverlay?: string;
    }
  ): Promise<{ thumbnailUrl: string }> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: 'generate_thumbnail',
        videoUrl,
        style: options?.style || 'cinematic',
        includeText: options?.includeText ?? false,
        textOverlay: options?.textOverlay,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to generate thumbnail');
      }

      // Thumbnail generation is usually fast, might not need polling
      if (response.jobId) {
        const result = await this.pollForCompletion(response.jobId);
        return { thumbnailUrl: (result.data as any).thumbnailUrl };
      }

      return { thumbnailUrl: (response.data as any).thumbnailUrl };
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw error;
    }
  }

  // ============================================
  // Usage & Credits
  // ============================================

  async getUsage(): Promise<{
    creditsUsed: number;
    creditsRemaining: number;
    plan: string;
    resetDate: string;
  }> {
    try {
      const result = await this.request<any>('/usage', 'GET');
      return {
        creditsUsed: result.creditsUsed || 0,
        creditsRemaining: result.creditsRemaining || 0,
        plan: result.plan || 'free',
        resetDate: result.resetDate || '',
      };
    } catch (error) {
      console.error('Usage fetch error:', error);
      return {
        creditsUsed: 0,
        creditsRemaining: 1000,
        plan: 'unknown',
        resetDate: '',
      };
    }
  }

  // ============================================
  // Direct API Call (for custom requests)
  // ============================================

  async customRequest(request: VortexMediaRequest): Promise<VortexMediaResponse> {
    try {
      const response = await this.triggerN8nWorkflow('vortex-ai', {
        task: request.type,
        content: request.content,
        ...request.options,
      });

      if (response.jobId) {
        return this.pollForCompletion(response.jobId);
      }

      return response;
    } catch (error) {
      console.error('Custom request error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const vortexMediaService = new VortexMediaService();
