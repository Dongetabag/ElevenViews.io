// Centralized AI Model Configuration
// Keep all AI models in sync across the platform

export const AI_MODELS = {
  // Text generation models (Gemini)
  text: {
    default: 'gemini-2.0-flash',           // Fast, good for most tasks
    advanced: 'gemini-2.5-flash-preview',   // Latest preview with better reasoning
    experimental: 'gemini-2.0-flash-exp',   // Experimental features
  },

  // Image generation models (Imagen 3)
  image: {
    default: 'imagen-3.0-generate-002',     // Latest Imagen 3 for image generation
    fast: 'imagen-3.0-fast-generate-001',   // Faster but lower quality
  },

  // Multimodal models (vision + text)
  multimodal: {
    default: 'gemini-2.0-flash',            // Good for image analysis
    advanced: 'gemini-2.5-flash-preview',   // Better understanding
  },

  // Code generation
  code: {
    default: 'gemini-2.0-flash',
    advanced: 'gemini-2.5-flash-preview',
  }
} as const;

// API endpoints for different model types
export const AI_ENDPOINTS = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  imagen: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;

// Default generation configs
export const GENERATION_CONFIG = {
  text: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  creative: {
    temperature: 0.9,
    topK: 50,
    topP: 0.98,
    maxOutputTokens: 4096,
  },
  precise: {
    temperature: 0.3,
    topK: 20,
    topP: 0.8,
    maxOutputTokens: 2048,
  },
  image: {
    numberOfImages: 1,
    aspectRatio: '1:1',
    safetyFilterLevel: 'block_medium_and_above',
  }
} as const;

// Helper to get the API key
export const getGoogleAIKey = (): string => {
  return (window as any).__ENV__?.VITE_GOOGLE_AI_API_KEY ||
         import.meta.env?.VITE_GOOGLE_AI_API_KEY || '';
};

// Generate content URL for a specific model
export const getGenerateContentUrl = (model: string): string => {
  const apiKey = getGoogleAIKey();
  return `${AI_ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;
};

// Generate image URL for Imagen models
export const getGenerateImageUrl = (model: string = AI_MODELS.image.default): string => {
  const apiKey = getGoogleAIKey();
  return `${AI_ENDPOINTS.imagen}/${model}:predict?key=${apiKey}`;
};

// Unified text generation request
export async function generateText(
  prompt: string,
  options: {
    model?: string;
    config?: typeof GENERATION_CONFIG.text;
    systemInstruction?: string;
  } = {}
): Promise<string> {
  const model = options.model || AI_MODELS.text.default;
  const config = options.config || GENERATION_CONFIG.text;
  const apiKey = getGoogleAIKey();

  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const url = `${AI_ENDPOINTS.gemini}/${model}:generateContent?key=${apiKey}`;

  const body: any = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: config,
  };

  if (options.systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`AI request failed: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
}

// Unified image generation request (Imagen 3)
export async function generateImage(
  prompt: string,
  options: {
    model?: string;
    numberOfImages?: number;
    aspectRatio?: string;
    negativePrompt?: string;
  } = {}
): Promise<string[]> {
  const model = options.model || AI_MODELS.image.default;
  const apiKey = getGoogleAIKey();

  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  const url = `${AI_ENDPOINTS.imagen}/${model}:predict?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{
        prompt: prompt,
      }],
      parameters: {
        sampleCount: options.numberOfImages || 1,
        aspectRatio: options.aspectRatio || '1:1',
        negativePrompt: options.negativePrompt || '',
        safetyFilterLevel: 'block_medium_and_above',
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Image generation failed: ${response.status} - ${error}`);
  }

  const data = await response.json();

  // Extract base64 images from response
  const images: string[] = [];
  if (data.predictions) {
    for (const prediction of data.predictions) {
      if (prediction.bytesBase64Encoded) {
        images.push(`data:image/png;base64,${prediction.bytesBase64Encoded}`);
      }
    }
  }

  return images;
}

// Image editing/inpainting with Imagen
export async function editImage(
  imageBase64: string,
  prompt: string,
  maskBase64?: string
): Promise<string[]> {
  const apiKey = getGoogleAIKey();

  if (!apiKey) {
    throw new Error('Google AI API key not configured');
  }

  // Use Imagen edit model
  const url = `${AI_ENDPOINTS.imagen}/imagen-3.0-capability-001:predict?key=${apiKey}`;

  const instance: any = {
    prompt: prompt,
    image: { bytesBase64Encoded: imageBase64.replace(/^data:image\/\w+;base64,/, '') }
  };

  if (maskBase64) {
    instance.mask = { bytesBase64Encoded: maskBase64.replace(/^data:image\/\w+;base64,/, '') };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [instance],
      parameters: {
        sampleCount: 1,
        safetyFilterLevel: 'block_medium_and_above',
      }
    })
  });

  if (!response.ok) {
    // Fallback to text description if image editing not available
    const textResponse = await generateText(
      `Describe how you would edit this image based on: "${prompt}"`,
      { model: AI_MODELS.text.default }
    );
    return [textResponse];
  }

  const data = await response.json();
  const images: string[] = [];

  if (data.predictions) {
    for (const prediction of data.predictions) {
      if (prediction.bytesBase64Encoded) {
        images.push(`data:image/png;base64,${prediction.bytesBase64Encoded}`);
      }
    }
  }

  return images;
}

export default {
  AI_MODELS,
  AI_ENDPOINTS,
  GENERATION_CONFIG,
  getGoogleAIKey,
  getGenerateContentUrl,
  getGenerateImageUrl,
  generateText,
  generateImage,
  editImage,
};
