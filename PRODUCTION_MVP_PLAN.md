# Production Studio MVP - Mobile-First Video Library

## Overview
Rebuild the Production Studio as a mobile-first video library with AI video generation using Google Veo 3.1.

## Core Features

### 1. Video Library (Home View)
- Grid layout of video assets (thumbnails)
- Organized by: Recent, Projects, AI Generated, Favorites
- Quick filters: All, Videos, Images, Audio
- Search functionality
- Tap to preview, long-press for options

### 2. AI Video Generation (Veo 3.1)
- **Text-to-Video**: Prompt → 8s video clips
- **Image-to-Video**: Upload image → animate
- **Video Extension**: Extend existing clips by 7s
- Support for 720p/1080p, 16:9 and 9:16 aspect ratios

### 3. AI Editing Features
- Auto-enhance (color correction, stabilization)
- AI captions/subtitles
- Smart trim (detect best moments)
- Background music generation

### 4. Figma-like Editor UI
- Clean, minimal interface
- Bottom toolbar with essential tools
- Gesture-based controls (pinch zoom, swipe)
- Layer panel (optional expand)

## Tech Stack
- React + TypeScript (existing)
- Google Vertex AI / Gemini API for Veo 3.1
- Supabase for storage/metadata
- Zustand for state management

## API Integration - Veo 3.1

### Text-to-Video
```typescript
// Using Gemini API
const response = await client.models.generateVideos({
  model: "veo-3.1-generate-001",
  prompt: "A golden retriever running on a beach at sunset",
  config: {
    aspectRatio: "16:9",
    durationSeconds: 8,
    numberOfVideos: 1
  }
});
```

### Image-to-Video
```typescript
const response = await client.models.generateVideos({
  model: "veo-3.1-generate-001",
  image: base64Image,
  prompt: "Animate this image with gentle movement",
  config: {
    aspectRatio: "16:9",
    durationSeconds: 8
  }
});
```

## UI Components Structure

```
ProductionStudio/
├── VideoLibrary.tsx        # Main grid view of assets
├── AssetCard.tsx           # Thumbnail card component
├── VideoPreview.tsx        # Full-screen preview modal
├── GeneratePanel.tsx       # AI generation bottom sheet
├── EditorCanvas.tsx        # Figma-like editor view
├── TimelineBar.tsx         # Simple timeline scrubber
├── ToolBar.tsx             # Bottom action toolbar
└── ExportModal.tsx         # Export options
```

## User Flow

1. **Library View** (Default)
   - See all video assets in grid
   - FAB button for "Create New"

2. **Create New** (Bottom Sheet)
   - Text to Video
   - Image to Video
   - Upload Video

3. **Generation View**
   - Enter prompt
   - Select style/duration
   - Generate → Preview → Save to library

4. **Editor View** (tap asset)
   - Preview player
   - AI tools panel
   - Export button

## Mobile-First Considerations
- Touch-optimized tap targets (44px min)
- Swipe gestures for navigation
- Bottom sheet modals (not center popups)
- Thumb-zone friendly controls
- Responsive grid (2 cols mobile, 3-4 cols tablet)

## Veo 3.1 Pricing
- $0.15/second (Fast mode)
- $0.40/second (Standard mode)
- 8s clips = $1.20-$3.20 per generation
