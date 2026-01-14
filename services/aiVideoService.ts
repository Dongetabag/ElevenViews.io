// AI Video Service - AI-powered video editing features using Google Gemini
// Handles scene detection, smart cuts, captions, and color grading suggestions

import { GoogleGenAI } from '@google/genai';
import {
  AISceneDetection,
  DetectedScene,
  SmartCutSuggestion,
} from '../types';

// Initialize Google AI
const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY || '';

// Scene types for analysis
const SCENE_TYPES = ['action', 'dialogue', 'transition', 'static'] as const;

// Color grading presets
export const COLOR_PRESETS = [
  { name: 'Cinematic', params: { contrast: 10, saturation: -5, temperature: -500, shadows: -10, highlights: -5 } },
  { name: 'Vibrant', params: { contrast: 5, saturation: 20, temperature: 200, shadows: 0, highlights: 0 } },
  { name: 'Vintage', params: { contrast: -5, saturation: -15, temperature: 500, shadows: 10, highlights: -10 } },
  { name: 'Cool Tone', params: { contrast: 5, saturation: 0, temperature: -800, shadows: 0, highlights: 5 } },
  { name: 'Warm Tone', params: { contrast: 5, saturation: 5, temperature: 800, shadows: 5, highlights: 0 } },
  { name: 'High Contrast', params: { contrast: 25, saturation: 10, temperature: 0, shadows: -15, highlights: 10 } },
  { name: 'Soft', params: { contrast: -10, saturation: -5, temperature: 200, shadows: 10, highlights: -15 } },
  { name: 'Dramatic', params: { contrast: 20, saturation: -10, temperature: -300, shadows: -20, highlights: 15 } },
];

class AIVideoService {
  private ai: GoogleGenAI | null;
  private model: string = 'gemini-2.0-flash';

  constructor() {
    this.ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;
  }

  // ============================================
  // Scene Detection
  // ============================================

  async detectScenes(
    videoFrames: string[], // Base64 encoded frames
    options?: {
      sensitivity?: 'low' | 'medium' | 'high';
      minSceneDuration?: number;
    }
  ): Promise<AISceneDetection> {
    if (!this.ai || videoFrames.length === 0) {
      return { scenes: [], confidence: 0, processingTime: 0 };
    }

    const startTime = Date.now();

    try {
      // Analyze frames using Gemini vision
      const prompt = `Analyze these video frames and detect scene changes.
For each distinct scene, provide:
1. The frame indices where the scene starts and ends
2. The type of scene (action, dialogue, transition, static)
3. A brief description of what's happening
4. Confidence level (0-1)

Sensitivity: ${options?.sensitivity || 'medium'}
Minimum scene duration: ${options?.minSceneDuration || 2} seconds

Return JSON format:
{
  "scenes": [
    {
      "startFrame": 0,
      "endFrame": 30,
      "type": "dialogue",
      "description": "Two people talking in an office",
      "confidence": 0.95
    }
  ],
  "overallConfidence": 0.9
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              ...videoFrames.slice(0, 20).map((frame) => ({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: frame.replace(/^data:image\/\w+;base64,/, ''),
                },
              })),
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const frameRate = 30; // Assume 30fps

        const scenes: DetectedScene[] = (data.scenes || []).map((s: any) => ({
          startTime: s.startFrame / frameRate,
          endTime: s.endFrame / frameRate,
          type: SCENE_TYPES.includes(s.type) ? s.type : 'static',
          confidence: s.confidence || 0.8,
          suggestedCuts: [],
          description: s.description,
        }));

        return {
          scenes,
          confidence: data.overallConfidence || 0.85,
          processingTime: Date.now() - startTime,
        };
      }

      return { scenes: [], confidence: 0, processingTime: Date.now() - startTime };
    } catch (error) {
      console.error('Scene detection error:', error);
      return { scenes: [], confidence: 0, processingTime: Date.now() - startTime };
    }
  }

  // ============================================
  // Smart Cut Suggestions
  // ============================================

  async suggestCuts(
    videoFrames: string[],
    options?: {
      targetDuration?: number;
      keepHighlights?: boolean;
      removeSilence?: boolean;
      style?: 'fast' | 'cinematic' | 'documentary';
    }
  ): Promise<{
    suggestions: SmartCutSuggestion[];
    confidence: number;
  }> {
    if (!this.ai || videoFrames.length === 0) {
      return { suggestions: [], confidence: 0 };
    }

    try {
      const prompt = `Analyze these video frames and suggest optimal cuts for editing.

Target duration: ${options?.targetDuration || 'no limit'} seconds
Style: ${options?.style || 'cinematic'}
Keep highlights: ${options?.keepHighlights !== false}
Remove silence/boring parts: ${options?.removeSilence !== false}

For each segment, determine if it should be KEPT or REMOVED and explain why.

Return JSON format:
{
  "cuts": [
    {
      "startFrame": 0,
      "endFrame": 60,
      "action": "keep",
      "reason": "Important dialogue moment",
      "confidence": 0.9
    },
    {
      "startFrame": 60,
      "endFrame": 90,
      "action": "remove",
      "reason": "Dead air with no action",
      "confidence": 0.85
    }
  ],
  "overallConfidence": 0.88
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              ...videoFrames.slice(0, 15).map((frame) => ({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: frame.replace(/^data:image\/\w+;base64,/, ''),
                },
              })),
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        const frameRate = 30;

        const suggestions: SmartCutSuggestion[] = (data.cuts || []).map((c: any) => ({
          startTime: c.startFrame / frameRate,
          endTime: c.endFrame / frameRate,
          reason: c.reason,
          confidence: c.confidence || 0.8,
          action: c.action === 'keep' ? 'keep' : 'remove',
        }));

        return {
          suggestions,
          confidence: data.overallConfidence || 0.85,
        };
      }

      return { suggestions: [], confidence: 0 };
    } catch (error) {
      console.error('Smart cut suggestion error:', error);
      return { suggestions: [], confidence: 0 };
    }
  }

  // ============================================
  // Caption Generation
  // ============================================

  async generateCaptions(
    audioTranscript: string,
    options?: {
      maxCharsPerLine?: number;
      style?: 'subtitle' | 'caption' | 'karaoke';
    }
  ): Promise<{
    captions: { start: number; end: number; text: string }[];
    language: string;
  }> {
    if (!this.ai || !audioTranscript) {
      return { captions: [], language: 'en' };
    }

    try {
      const maxChars = options?.maxCharsPerLine || 42;
      const style = options?.style || 'subtitle';

      const prompt = `Convert this transcript into ${style} format.

Transcript:
${audioTranscript}

Requirements:
- Maximum ${maxChars} characters per line
- Split at natural speech breaks
- Include timing estimates based on speaking pace
- Detect the language

Return JSON format:
{
  "captions": [
    { "start": 0.0, "end": 2.5, "text": "Hello everyone" },
    { "start": 2.5, "end": 5.0, "text": "Welcome to our video" }
  ],
  "language": "en"
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          captions: data.captions || [],
          language: data.language || 'en',
        };
      }

      return { captions: [], language: 'en' };
    } catch (error) {
      console.error('Caption generation error:', error);
      return { captions: [], language: 'en' };
    }
  }

  // ============================================
  // Color Grading Suggestions
  // ============================================

  async suggestColorGrade(
    videoFrame: string // Single frame for analysis
  ): Promise<{
    presets: { name: string; params: Record<string, number>; match: number }[];
    recommendation: string;
    currentMood: string;
  }> {
    if (!this.ai || !videoFrame) {
      return {
        presets: COLOR_PRESETS.map((p) => ({ ...p, match: 0.5 })),
        recommendation: COLOR_PRESETS[0].name,
        currentMood: 'neutral',
      };
    }

    try {
      const prompt = `Analyze this video frame and suggest color grading.

Consider:
1. Current color temperature and tone
2. Lighting conditions
3. Subject matter and mood
4. Professional video standards

Suggest which of these presets would work best:
${COLOR_PRESETS.map((p) => p.name).join(', ')}

Return JSON format:
{
  "currentMood": "warm",
  "recommendation": "Cinematic",
  "presetScores": {
    "Cinematic": 0.95,
    "Vibrant": 0.7,
    "Vintage": 0.6
  },
  "customSuggestion": {
    "contrast": 10,
    "saturation": -5,
    "temperature": -200
  }
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: videoFrame.replace(/^data:image\/\w+;base64,/, ''),
                },
              },
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);

        const presets = COLOR_PRESETS.map((preset) => ({
          ...preset,
          match: data.presetScores?.[preset.name] || 0.5,
        })).sort((a, b) => b.match - a.match);

        return {
          presets,
          recommendation: data.recommendation || presets[0].name,
          currentMood: data.currentMood || 'neutral',
        };
      }

      return {
        presets: COLOR_PRESETS.map((p) => ({ ...p, match: 0.5 })),
        recommendation: COLOR_PRESETS[0].name,
        currentMood: 'neutral',
      };
    } catch (error) {
      console.error('Color grading suggestion error:', error);
      return {
        presets: COLOR_PRESETS.map((p) => ({ ...p, match: 0.5 })),
        recommendation: COLOR_PRESETS[0].name,
        currentMood: 'neutral',
      };
    }
  }

  // ============================================
  // Music Suggestion
  // ============================================

  async suggestMusic(
    videoFrames: string[],
    options?: {
      duration?: number;
      genre?: string;
    }
  ): Promise<{
    mood: string;
    tempo: 'slow' | 'medium' | 'fast';
    genres: string[];
    keywords: string[];
  }> {
    if (!this.ai || videoFrames.length === 0) {
      return {
        mood: 'neutral',
        tempo: 'medium',
        genres: ['ambient'],
        keywords: [],
      };
    }

    try {
      const prompt = `Analyze these video frames and suggest appropriate background music.

Consider:
1. Visual mood and atmosphere
2. Pacing and energy level
3. Subject matter
4. Professional standards

Return JSON format:
{
  "mood": "inspiring",
  "tempo": "medium",
  "genres": ["corporate", "uplifting", "ambient"],
  "keywords": ["motivational", "modern", "positive"],
  "reasoning": "The video shows professional settings with positive interactions"
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              ...videoFrames.slice(0, 10).map((frame) => ({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: frame.replace(/^data:image\/\w+;base64,/, ''),
                },
              })),
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          mood: data.mood || 'neutral',
          tempo: ['slow', 'medium', 'fast'].includes(data.tempo) ? data.tempo : 'medium',
          genres: data.genres || ['ambient'],
          keywords: data.keywords || [],
        };
      }

      return {
        mood: 'neutral',
        tempo: 'medium',
        genres: ['ambient'],
        keywords: [],
      };
    } catch (error) {
      console.error('Music suggestion error:', error);
      return {
        mood: 'neutral',
        tempo: 'medium',
        genres: ['ambient'],
        keywords: [],
      };
    }
  }

  // ============================================
  // Thumbnail Generation Suggestions
  // ============================================

  async suggestThumbnailFrames(
    videoFrames: string[]
  ): Promise<{
    suggestions: { frameIndex: number; score: number; reason: string }[];
  }> {
    if (!this.ai || videoFrames.length === 0) {
      return { suggestions: [] };
    }

    try {
      const prompt = `Analyze these video frames and identify the best candidates for a thumbnail.

Consider:
1. Visual appeal and composition
2. Clarity and sharpness
3. Subject visibility
4. Emotional impact
5. Click-worthiness for social media

Return JSON format:
{
  "suggestions": [
    { "frameIndex": 5, "score": 0.95, "reason": "Clear face with engaging expression" },
    { "frameIndex": 12, "score": 0.85, "reason": "Good product visibility" }
  ]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              ...videoFrames.slice(0, 20).map((frame, index) => ({
                text: `Frame ${index}:`,
              })),
              ...videoFrames.slice(0, 20).map((frame) => ({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: frame.replace(/^data:image\/\w+;base64,/, ''),
                },
              })),
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          suggestions: (data.suggestions || [])
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5),
        };
      }

      return { suggestions: [] };
    } catch (error) {
      console.error('Thumbnail suggestion error:', error);
      return { suggestions: [] };
    }
  }

  // ============================================
  // Script to Storyboard
  // ============================================

  async scriptToStoryboard(
    script: string
  ): Promise<{
    scenes: { description: string; duration: number; visuals: string; notes: string }[];
  }> {
    if (!this.ai || !script) {
      return { scenes: [] };
    }

    try {
      const prompt = `Convert this script into a video storyboard.

Script:
${script}

For each scene, provide:
1. Brief description
2. Estimated duration in seconds
3. Visual suggestions (camera angle, lighting, etc.)
4. Production notes

Return JSON format:
{
  "scenes": [
    {
      "description": "Opening shot of the city skyline",
      "duration": 5,
      "visuals": "Wide aerial shot, golden hour lighting, slow pan right",
      "notes": "Use drone footage or stock"
    }
  ]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return { scenes: data.scenes || [] };
      }

      return { scenes: [] };
    } catch (error) {
      console.error('Storyboard generation error:', error);
      return { scenes: [] };
    }
  }

  // ============================================
  // Content Analysis
  // ============================================

  async analyzeContent(
    videoFrames: string[]
  ): Promise<{
    objects: { name: string; confidence: number; frequency: number }[];
    people: { count: number; emotions: string[] }[];
    text: { content: string; confidence: number }[];
    overallTheme: string;
    suggestedTags: string[];
  }> {
    if (!this.ai || videoFrames.length === 0) {
      return {
        objects: [],
        people: [],
        text: [],
        overallTheme: 'unknown',
        suggestedTags: [],
      };
    }

    try {
      const prompt = `Analyze these video frames comprehensively.

Identify:
1. Objects and their frequency of appearance
2. People and their emotions
3. Any visible text
4. Overall theme/subject
5. Suggested tags for categorization

Return JSON format:
{
  "objects": [{ "name": "laptop", "confidence": 0.95, "frequency": 8 }],
  "people": [{ "count": 2, "emotions": ["happy", "engaged"] }],
  "text": [{ "content": "Company Logo", "confidence": 0.9 }],
  "overallTheme": "corporate presentation",
  "suggestedTags": ["business", "technology", "meeting"]
}`;

      const response = await this.ai.models.generateContent({
        model: this.model,
        contents: [
          {
            parts: [
              { text: prompt },
              ...videoFrames.slice(0, 15).map((frame) => ({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: frame.replace(/^data:image\/\w+;base64,/, ''),
                },
              })),
            ],
          },
        ],
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      return {
        objects: [],
        people: [],
        text: [],
        overallTheme: 'unknown',
        suggestedTags: [],
      };
    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        objects: [],
        people: [],
        text: [],
        overallTheme: 'unknown',
        suggestedTags: [],
      };
    }
  }
}

// Export singleton instance
export const aiVideoService = new AIVideoService();
