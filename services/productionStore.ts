// Production Store - Zustand-like state management for video editing
// Uses localStorage for persistence with production-specific state

import {
  VideoProject,
  Timeline,
  Track,
  Clip,
  ProjectAsset,
  ProjectSettings,
  ProjectStatus,
  TransitionType,
  TrackType,
} from '../types';

const STORAGE_KEYS = {
  PROJECTS: 'eleven-views-projects',
  CURRENT_PROJECT: 'eleven-views-current-project',
  EDITOR_PREFERENCES: 'eleven-views-editor-prefs',
};

// Editor preferences
export interface EditorPreferences {
  zoom: number;
  snapEnabled: boolean;
  showGrid: boolean;
  previewQuality: 'low' | 'medium' | 'high';
  autoSaveInterval: number;
  defaultTrackHeight: number;
}

// Production state
export interface ProductionStoreState {
  // Project state
  currentProject: VideoProject | null;
  projects: VideoProject[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;

  // Timeline state
  playheadPosition: number;
  isPlaying: boolean;
  zoom: number;
  scrollPosition: number;

  // Selection state
  selectedClipIds: string[];
  selectedTrackId: string | null;
  editingClipId: string | null;
  copiedClips: Clip[];

  // UI state
  activePanel: 'timeline' | 'assets' | 'effects' | 'text' | 'audio' | 'ai';
  preferences: EditorPreferences;

  // History for undo/redo
  undoStack: Timeline[];
  redoStack: Timeline[];
}

// Helper functions
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const now = () => new Date().toISOString();

// Storage helpers
const getStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const setStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Storage error:', error);
  }
};

// Default settings
const defaultSettings: ProjectSettings = {
  resolution: { width: 1920, height: 1080, label: '1080p' },
  frameRate: 30,
  aspectRatio: '16:9',
  backgroundColor: '#0f1410',
  defaultTransition: 'fade',
};

const defaultPreferences: EditorPreferences = {
  zoom: 100,
  snapEnabled: true,
  showGrid: true,
  previewQuality: 'medium',
  autoSaveInterval: 30000,
  defaultTrackHeight: 60,
};

// Create empty timeline
const createEmptyTimeline = (): Timeline => ({
  id: generateId(),
  duration: 0,
  tracks: [
    { id: generateId(), type: 'video', name: 'Video 1', clips: [], muted: false, locked: false, visible: true },
    { id: generateId(), type: 'audio', name: 'Audio 1', clips: [], muted: false, locked: false, visible: true, volume: 1 },
    { id: generateId(), type: 'text', name: 'Text', clips: [], muted: false, locked: false, visible: true },
  ],
  markers: [],
  playheadPosition: 0,
});

// Production Store Class
class ProductionStore {
  private state: ProductionStoreState;
  private listeners: Set<() => void> = new Set();
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = {
      currentProject: getStorage(STORAGE_KEYS.CURRENT_PROJECT, null),
      projects: getStorage(STORAGE_KEYS.PROJECTS, []),
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      playheadPosition: 0,
      isPlaying: false,
      zoom: 100,
      scrollPosition: 0,
      selectedClipIds: [],
      selectedTrackId: null,
      editingClipId: null,
      copiedClips: [],
      activePanel: 'timeline',
      preferences: getStorage(STORAGE_KEYS.EDITOR_PREFERENCES, defaultPreferences),
      undoStack: [],
      redoStack: [],
    };

    this.startAutoSave();
  }

  // Subscribe to state changes
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify listeners
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  // Get current state
  getState(): ProductionStoreState {
    return this.state;
  }

  // Update state
  private setState(partial: Partial<ProductionStoreState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  // ============================================
  // Project Management
  // ============================================

  createProject(name: string, description?: string): VideoProject {
    const project: VideoProject = {
      id: generateId(),
      name,
      description,
      createdAt: now(),
      updatedAt: now(),
      status: 'draft',
      timeline: createEmptyTimeline(),
      assets: [],
      settings: { ...defaultSettings },
      metadata: {},
      version: 1,
    };

    const projects = [...this.state.projects, project];
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    this.setState({ projects, currentProject: project });
    setStorage(STORAGE_KEYS.CURRENT_PROJECT, project);

    return project;
  }

  loadProject(projectId: string): VideoProject | null {
    const project = this.state.projects.find((p) => p.id === projectId);
    if (project) {
      this.setState({
        currentProject: project,
        playheadPosition: 0,
        selectedClipIds: [],
        selectedTrackId: null,
        undoStack: [],
        redoStack: [],
        hasUnsavedChanges: false,
      });
      setStorage(STORAGE_KEYS.CURRENT_PROJECT, project);
    }
    return project || null;
  }

  updateProject(updates: Partial<VideoProject>): void {
    if (!this.state.currentProject) return;

    const updatedProject: VideoProject = {
      ...this.state.currentProject,
      ...updates,
      updatedAt: now(),
      version: this.state.currentProject.version + 1,
    };

    const projects = this.state.projects.map((p) =>
      p.id === updatedProject.id ? updatedProject : p
    );

    setStorage(STORAGE_KEYS.PROJECTS, projects);
    this.setState({
      projects,
      currentProject: updatedProject,
      hasUnsavedChanges: true,
    });
  }

  updateProjectStatus(status: ProjectStatus): void {
    this.updateProject({ status });
  }

  deleteProject(projectId: string): void {
    const projects = this.state.projects.filter((p) => p.id !== projectId);
    setStorage(STORAGE_KEYS.PROJECTS, projects);

    const currentProject =
      this.state.currentProject?.id === projectId ? null : this.state.currentProject;

    this.setState({ projects, currentProject });

    if (!currentProject) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_PROJECT);
    }
  }

  duplicateProject(projectId: string, newName?: string): VideoProject | null {
    const original = this.state.projects.find((p) => p.id === projectId);
    if (!original) return null;

    const duplicate: VideoProject = {
      ...JSON.parse(JSON.stringify(original)),
      id: generateId(),
      name: newName || `${original.name} (Copy)`,
      createdAt: now(),
      updatedAt: now(),
      status: 'draft',
      version: 1,
    };

    const projects = [...this.state.projects, duplicate];
    setStorage(STORAGE_KEYS.PROJECTS, projects);
    this.setState({ projects });

    return duplicate;
  }

  // ============================================
  // Timeline Operations
  // ============================================

  updateTimeline(timeline: Timeline): void {
    if (!this.state.currentProject) return;

    // Push current timeline to undo stack
    this.pushToHistory();

    const duration = this.calculateTimelineDuration(timeline);
    this.updateProject({ timeline: { ...timeline, duration } });
  }

  setPlayheadPosition(position: number): void {
    this.setState({ playheadPosition: Math.max(0, position) });
    if (this.state.currentProject) {
      this.state.currentProject.timeline.playheadPosition = position;
    }
  }

  setPlaying(playing: boolean): void {
    this.setState({ isPlaying: playing });
  }

  setZoom(zoom: number): void {
    this.setState({ zoom: Math.max(10, Math.min(500, zoom)) });
  }

  setScrollPosition(position: number): void {
    this.setState({ scrollPosition: Math.max(0, position) });
  }

  // ============================================
  // Track Operations
  // ============================================

  addTrack(type: TrackType, name?: string): Track | null {
    if (!this.state.currentProject) return null;

    const trackCount = this.state.currentProject.timeline.tracks.filter(
      (t) => t.type === type
    ).length;

    const track: Track = {
      id: generateId(),
      type,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${trackCount + 1}`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: type === 'audio' ? 1 : undefined,
    };

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: [...this.state.currentProject.timeline.tracks, track],
    };

    this.updateTimeline(timeline);
    return track;
  }

  removeTrack(trackId: string): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.filter((t) => t.id !== trackId),
    };

    this.updateTimeline(timeline);
  }

  toggleTrackMute(trackId: string): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, muted: !t.muted } : t
      ),
    };

    this.updateTimeline(timeline);
  }

  toggleTrackLock(trackId: string): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, locked: !t.locked } : t
      ),
    };

    this.updateTimeline(timeline);
  }

  toggleTrackVisibility(trackId: string): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, visible: !t.visible } : t
      ),
    };

    this.updateTimeline(timeline);
  }

  setTrackVolume(trackId: string, volume: number): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, volume: Math.max(0, Math.min(1, volume)) } : t
      ),
    };

    this.updateTimeline(timeline);
  }

  // ============================================
  // Clip Operations
  // ============================================

  addClip(trackId: string, clip: Partial<Clip>): Clip | null {
    if (!this.state.currentProject) return null;

    const track = this.state.currentProject.timeline.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return null;

    const newClip: Clip = {
      id: generateId(),
      trackId,
      type: clip.type || 'video',
      startTime: clip.startTime || 0,
      duration: clip.duration || 5,
      trimStart: clip.trimStart || 0,
      trimEnd: clip.trimEnd || 0,
      sourceUrl: clip.sourceUrl,
      assetId: clip.assetId,
      content: clip.content,
      transitions: clip.transitions || {},
      effects: clip.effects || [],
      keyframes: clip.keyframes,
      volume: clip.volume ?? 1,
      opacity: clip.opacity ?? 1,
    };

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, clips: [...t.clips, newClip] } : t
      ),
    };

    this.updateTimeline(timeline);
    return newClip;
  }

  updateClip(clipId: string, updates: Partial<Clip>): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      })),
    };

    this.updateTimeline(timeline);
  }

  removeClip(clipId: string): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
    };

    this.updateTimeline(timeline);
    this.setState({
      selectedClipIds: this.state.selectedClipIds.filter((id) => id !== clipId),
    });
  }

  moveClip(clipId: string, newTrackId: string, newStartTime: number): void {
    if (!this.state.currentProject) return;

    let clipToMove: Clip | null = null;

    // Find and remove clip from current track
    const tracksWithoutClip = this.state.currentProject.timeline.tracks.map((t) => {
      const clip = t.clips.find((c) => c.id === clipId);
      if (clip) {
        clipToMove = { ...clip, trackId: newTrackId, startTime: Math.max(0, newStartTime) };
      }
      return {
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      };
    });

    if (!clipToMove) return;

    // Add clip to new track
    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: tracksWithoutClip.map((t) =>
        t.id === newTrackId ? { ...t, clips: [...t.clips, clipToMove!] } : t
      ),
    };

    this.updateTimeline(timeline);
  }

  splitClip(clipId: string, splitTime: number): void {
    if (!this.state.currentProject) return;

    let newClips: Clip[] = [];

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) => {
        const clip = t.clips.find((c) => c.id === clipId);
        if (!clip) return t;

        const relativeTime = splitTime - clip.startTime;
        if (relativeTime <= 0 || relativeTime >= clip.duration) return t;

        // First half
        const firstClip: Clip = {
          ...clip,
          duration: relativeTime,
          trimEnd: clip.trimEnd + (clip.duration - relativeTime),
        };

        // Second half
        const secondClip: Clip = {
          ...clip,
          id: generateId(),
          startTime: splitTime,
          duration: clip.duration - relativeTime,
          trimStart: clip.trimStart + relativeTime,
        };

        newClips = [firstClip, secondClip];

        return {
          ...t,
          clips: t.clips.map((c) => (c.id === clipId ? firstClip : c)).concat([secondClip]),
        };
      }),
    };

    this.updateTimeline(timeline);
  }

  // ============================================
  // Selection Operations
  // ============================================

  selectClip(clipId: string, addToSelection = false): void {
    if (addToSelection) {
      const ids = this.state.selectedClipIds.includes(clipId)
        ? this.state.selectedClipIds.filter((id) => id !== clipId)
        : [...this.state.selectedClipIds, clipId];
      this.setState({ selectedClipIds: ids });
    } else {
      this.setState({ selectedClipIds: [clipId] });
    }
  }

  selectTrack(trackId: string | null): void {
    this.setState({ selectedTrackId: trackId });
  }

  deselectAll(): void {
    this.setState({ selectedClipIds: [], selectedTrackId: null, editingClipId: null });
  }

  setEditingClip(clipId: string | null): void {
    this.setState({ editingClipId: clipId });
  }

  // ============================================
  // Copy/Paste Operations
  // ============================================

  copySelectedClips(): void {
    if (!this.state.currentProject || this.state.selectedClipIds.length === 0) return;

    const clips: Clip[] = [];
    this.state.currentProject.timeline.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (this.state.selectedClipIds.includes(c.id)) {
          clips.push({ ...c });
        }
      });
    });

    this.setState({ copiedClips: clips });
  }

  pasteClips(targetTrackId?: string): void {
    if (!this.state.currentProject || this.state.copiedClips.length === 0) return;

    const trackId = targetTrackId || this.state.selectedTrackId;
    if (!trackId) return;

    const minStartTime = Math.min(...this.state.copiedClips.map((c) => c.startTime));
    const offset = this.state.playheadPosition - minStartTime;

    this.state.copiedClips.forEach((clip) => {
      this.addClip(trackId, {
        ...clip,
        id: undefined,
        trackId,
        startTime: clip.startTime + offset,
      });
    });
  }

  deleteSelectedClips(): void {
    if (!this.state.currentProject) return;

    const timeline = {
      ...this.state.currentProject.timeline,
      tracks: this.state.currentProject.timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => !this.state.selectedClipIds.includes(c.id)),
      })),
    };

    this.updateTimeline(timeline);
    this.setState({ selectedClipIds: [] });
  }

  // ============================================
  // Asset Operations
  // ============================================

  addAsset(asset: ProjectAsset): void {
    if (!this.state.currentProject) return;
    this.updateProject({
      assets: [...this.state.currentProject.assets, asset],
    });
  }

  removeAsset(assetId: string): void {
    if (!this.state.currentProject) return;
    this.updateProject({
      assets: this.state.currentProject.assets.filter((a) => a.id !== assetId),
    });
  }

  // ============================================
  // History (Undo/Redo)
  // ============================================

  private pushToHistory(): void {
    if (!this.state.currentProject) return;

    const undoStack = [
      ...this.state.undoStack,
      JSON.parse(JSON.stringify(this.state.currentProject.timeline)),
    ].slice(-50); // Keep last 50 states

    this.setState({ undoStack, redoStack: [] });
  }

  undo(): void {
    if (this.state.undoStack.length === 0 || !this.state.currentProject) return;

    const undoStack = [...this.state.undoStack];
    const previousTimeline = undoStack.pop()!;

    const redoStack = [
      ...this.state.redoStack,
      JSON.parse(JSON.stringify(this.state.currentProject.timeline)),
    ];

    this.setState({ undoStack, redoStack });
    this.updateProject({ timeline: previousTimeline });
  }

  redo(): void {
    if (this.state.redoStack.length === 0 || !this.state.currentProject) return;

    const redoStack = [...this.state.redoStack];
    const nextTimeline = redoStack.pop()!;

    const undoStack = [
      ...this.state.undoStack,
      JSON.parse(JSON.stringify(this.state.currentProject.timeline)),
    ];

    this.setState({ undoStack, redoStack });
    this.updateProject({ timeline: nextTimeline });
  }

  canUndo(): boolean {
    return this.state.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.state.redoStack.length > 0;
  }

  // ============================================
  // UI State
  // ============================================

  setActivePanel(panel: ProductionStoreState['activePanel']): void {
    this.setState({ activePanel: panel });
  }

  updatePreferences(prefs: Partial<EditorPreferences>): void {
    const preferences = { ...this.state.preferences, ...prefs };
    setStorage(STORAGE_KEYS.EDITOR_PREFERENCES, preferences);
    this.setState({ preferences });
  }

  // ============================================
  // Auto-save
  // ============================================

  private startAutoSave(): void {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);

    this.autoSaveTimer = setInterval(() => {
      if (this.state.hasUnsavedChanges && this.state.currentProject) {
        this.save();
      }
    }, this.state.preferences.autoSaveInterval);
  }

  save(): void {
    if (!this.state.currentProject) return;

    this.setState({ isSaving: true });

    setStorage(STORAGE_KEYS.CURRENT_PROJECT, this.state.currentProject);
    setStorage(STORAGE_KEYS.PROJECTS, this.state.projects);

    this.setState({ isSaving: false, hasUnsavedChanges: false });
  }

  // ============================================
  // Utility Functions
  // ============================================

  calculateTimelineDuration(timeline: Timeline): number {
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      });
    });
    return maxEnd;
  }

  getClipAtTime(trackId: string, time: number): Clip | null {
    if (!this.state.currentProject) return null;

    const track = this.state.currentProject.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return null;

    return (
      track.clips.find(
        (c) => time >= c.startTime && time < c.startTime + c.duration
      ) || null
    );
  }

  findSnapPoints(excludeClipId?: string): number[] {
    if (!this.state.currentProject) return [];

    const points: Set<number> = new Set([0]);

    this.state.currentProject.timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.id !== excludeClipId) {
          points.add(clip.startTime);
          points.add(clip.startTime + clip.duration);
        }
      });
    });

    // Add markers
    this.state.currentProject.timeline.markers.forEach((m) => points.add(m.time));

    return Array.from(points).sort((a, b) => a - b);
  }

  snapToNearestPoint(time: number, threshold = 0.1): number {
    if (!this.state.preferences.snapEnabled) return time;

    const snapPoints = this.findSnapPoints();
    let closest = time;
    let minDiff = threshold;

    snapPoints.forEach((point) => {
      const diff = Math.abs(time - point);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
      }
    });

    return closest;
  }
}

// Export singleton instance
export const productionStore = new ProductionStore();

// React hook for using the store
export function useProductionStore() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    return productionStore.subscribe(() => forceUpdate({}));
  }, []);

  return productionStore;
}

// Need to import these for the hook
import { useState, useEffect } from 'react';
