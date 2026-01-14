// Advanced Editor Service - Timeline manipulation and editing operations
// Provides immutable operations for video editing

import {
  Timeline,
  Track,
  Clip,
  Transition,
  TransitionType,
  ClipEffect,
  EffectType,
  TrackType,
  TextContent,
  Keyframe,
} from '../types';

// Helper to generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Deep clone helper
const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

class AdvancedEditorService {
  // ============================================
  // Timeline Operations
  // ============================================

  createEmptyTimeline(): Timeline {
    return {
      id: generateId(),
      duration: 0,
      tracks: [],
      markers: [],
      playheadPosition: 0,
    };
  }

  calculateDuration(timeline: Timeline): number {
    let maxEnd = 0;
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;
      });
    });
    return maxEnd;
  }

  // ============================================
  // Track Operations
  // ============================================

  addTrack(timeline: Timeline, type: TrackType, name?: string): Timeline {
    const trackCount = timeline.tracks.filter((t) => t.type === type).length;
    const newTrack: Track = {
      id: generateId(),
      type,
      name: name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${trackCount + 1}`,
      clips: [],
      muted: false,
      locked: false,
      visible: true,
      volume: type === 'audio' ? 1 : undefined,
      height: 60,
    };

    return {
      ...timeline,
      tracks: [...timeline.tracks, newTrack],
    };
  }

  removeTrack(timeline: Timeline, trackId: string): Timeline {
    return {
      ...timeline,
      tracks: timeline.tracks.filter((t) => t.id !== trackId),
    };
  }

  reorderTracks(timeline: Timeline, fromIndex: number, toIndex: number): Timeline {
    const tracks = [...timeline.tracks];
    const [removed] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, removed);
    return { ...timeline, tracks };
  }

  updateTrack(timeline: Timeline, trackId: string, updates: Partial<Track>): Timeline {
    return {
      ...timeline,
      tracks: timeline.tracks.map((t) =>
        t.id === trackId ? { ...t, ...updates } : t
      ),
    };
  }

  // ============================================
  // Clip Operations
  // ============================================

  addClip(timeline: Timeline, trackId: string, clip: Partial<Clip>): Timeline {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return timeline;

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

    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) =>
        t.id === trackId
          ? { ...t, clips: [...t.clips, newClip].sort((a, b) => a.startTime - b.startTime) }
          : t
      ),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  removeClip(timeline: Timeline, clipId: string): Timeline {
    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      })),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  updateClip(timeline: Timeline, clipId: string, updates: Partial<Clip>): Timeline {
    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...updates } : c)),
      })),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  moveClip(
    timeline: Timeline,
    clipId: string,
    newTrackId: string,
    newStartTime: number
  ): Timeline {
    let clipToMove: Clip | null = null;

    // Find and extract the clip
    const tracksWithoutClip = timeline.tracks.map((t) => {
      const clip = t.clips.find((c) => c.id === clipId);
      if (clip) {
        clipToMove = {
          ...deepClone(clip),
          trackId: newTrackId,
          startTime: Math.max(0, newStartTime),
        };
      }
      return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
    });

    if (!clipToMove) return timeline;

    // Check if target track is locked
    const targetTrack = tracksWithoutClip.find((t) => t.id === newTrackId);
    if (targetTrack?.locked) return timeline;

    // Add clip to new position
    const newTimeline = {
      ...timeline,
      tracks: tracksWithoutClip.map((t) =>
        t.id === newTrackId
          ? { ...t, clips: [...t.clips, clipToMove!].sort((a, b) => a.startTime - b.startTime) }
          : t
      ),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  // ============================================
  // Trim Operations
  // ============================================

  trimClipStart(timeline: Timeline, clipId: string, newTrimStart: number): Timeline {
    return this.updateClip(timeline, clipId, { trimStart: Math.max(0, newTrimStart) });
  }

  trimClipEnd(timeline: Timeline, clipId: string, newTrimEnd: number): Timeline {
    return this.updateClip(timeline, clipId, { trimEnd: Math.max(0, newTrimEnd) });
  }

  resizeClip(
    timeline: Timeline,
    clipId: string,
    newStartTime: number,
    newDuration: number
  ): Timeline {
    return this.updateClip(timeline, clipId, {
      startTime: Math.max(0, newStartTime),
      duration: Math.max(0.1, newDuration),
    });
  }

  // ============================================
  // Split & Merge Operations
  // ============================================

  splitClip(timeline: Timeline, clipId: string, splitTime: number): Timeline {
    let firstClip: Clip | null = null;
    let secondClip: Clip | null = null;
    let targetTrackId: string | null = null;

    // Find the clip and calculate split
    timeline.tracks.forEach((t) => {
      const clip = t.clips.find((c) => c.id === clipId);
      if (clip) {
        const relativeTime = splitTime - clip.startTime;

        if (relativeTime <= 0 || relativeTime >= clip.duration) {
          return; // Invalid split point
        }

        targetTrackId = t.id;

        // First half (keeps original ID)
        firstClip = {
          ...deepClone(clip),
          duration: relativeTime,
          trimEnd: clip.trimEnd + (clip.duration - relativeTime),
          transitions: { ...clip.transitions, out: undefined },
        };

        // Second half (new ID)
        secondClip = {
          ...deepClone(clip),
          id: generateId(),
          startTime: splitTime,
          duration: clip.duration - relativeTime,
          trimStart: clip.trimStart + relativeTime,
          transitions: { ...clip.transitions, in: undefined },
        };
      }
    });

    if (!firstClip || !secondClip || !targetTrackId) return timeline;

    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => {
        if (t.id !== targetTrackId) return t;
        return {
          ...t,
          clips: t.clips
            .map((c) => (c.id === clipId ? firstClip! : c))
            .concat([secondClip!])
            .sort((a, b) => a.startTime - b.startTime),
        };
      }),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  mergeClips(timeline: Timeline, clipIds: string[]): Timeline {
    if (clipIds.length < 2) return timeline;

    // Find all clips and verify they're on the same track
    let trackId: string | null = null;
    const clipsToMerge: Clip[] = [];

    timeline.tracks.forEach((t) => {
      const matchingClips = t.clips.filter((c) => clipIds.includes(c.id));
      if (matchingClips.length > 0) {
        if (trackId && trackId !== t.id) {
          return; // Clips on different tracks can't be merged
        }
        trackId = t.id;
        clipsToMerge.push(...matchingClips);
      }
    });

    if (clipsToMerge.length < 2 || !trackId) return timeline;

    // Sort by start time
    clipsToMerge.sort((a, b) => a.startTime - b.startTime);

    // Create merged clip
    const firstClip = clipsToMerge[0];
    const lastClip = clipsToMerge[clipsToMerge.length - 1];

    const mergedClip: Clip = {
      ...deepClone(firstClip),
      duration: lastClip.startTime + lastClip.duration - firstClip.startTime,
      transitions: {
        in: firstClip.transitions.in,
        out: lastClip.transitions.out,
      },
    };

    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips
            .filter((c) => !clipIds.includes(c.id) || c.id === firstClip.id)
            .map((c) => (c.id === firstClip.id ? mergedClip : c)),
        };
      }),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  // ============================================
  // Transition Operations
  // ============================================

  addTransition(
    timeline: Timeline,
    clipId: string,
    position: 'in' | 'out',
    transition: Transition
  ): Timeline {
    return this.updateClip(timeline, clipId, {
      transitions: {
        ...timeline.tracks
          .flatMap((t) => t.clips)
          .find((c) => c.id === clipId)?.transitions,
        [position]: transition,
      },
    });
  }

  removeTransition(timeline: Timeline, clipId: string, position: 'in' | 'out'): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return timeline;

    return this.updateClip(timeline, clipId, {
      transitions: {
        ...clip.transitions,
        [position]: undefined,
      },
    });
  }

  updateTransition(
    timeline: Timeline,
    clipId: string,
    position: 'in' | 'out',
    updates: Partial<Transition>
  ): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip || !clip.transitions[position]) return timeline;

    return this.updateClip(timeline, clipId, {
      transitions: {
        ...clip.transitions,
        [position]: { ...clip.transitions[position]!, ...updates },
      },
    });
  }

  // ============================================
  // Effect Operations
  // ============================================

  addEffect(timeline: Timeline, clipId: string, effect: Omit<ClipEffect, 'id'>): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return timeline;

    const newEffect: ClipEffect = {
      ...effect,
      id: generateId(),
    };

    return this.updateClip(timeline, clipId, {
      effects: [...clip.effects, newEffect],
    });
  }

  removeEffect(timeline: Timeline, clipId: string, effectId: string): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return timeline;

    return this.updateClip(timeline, clipId, {
      effects: clip.effects.filter((e) => e.id !== effectId),
    });
  }

  updateEffect(
    timeline: Timeline,
    clipId: string,
    effectId: string,
    updates: Partial<ClipEffect>
  ): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return timeline;

    return this.updateClip(timeline, clipId, {
      effects: clip.effects.map((e) => (e.id === effectId ? { ...e, ...updates } : e)),
    });
  }

  toggleEffect(timeline: Timeline, clipId: string, effectId: string): Timeline {
    const clip = timeline.tracks.flatMap((t) => t.clips).find((c) => c.id === clipId);
    if (!clip) return timeline;

    return this.updateClip(timeline, clipId, {
      effects: clip.effects.map((e) =>
        e.id === effectId ? { ...e, enabled: !e.enabled } : e
      ),
    });
  }

  // ============================================
  // Ripple Edit Operations
  // ============================================

  rippleDelete(timeline: Timeline, clipId: string): Timeline {
    let deletedClip: Clip | null = null;
    let trackId: string | null = null;

    // Find the clip to delete
    timeline.tracks.forEach((t) => {
      const clip = t.clips.find((c) => c.id === clipId);
      if (clip) {
        deletedClip = clip;
        trackId = t.id;
      }
    });

    if (!deletedClip || !trackId) return timeline;

    const gap = deletedClip.duration;

    // Remove clip and shift all subsequent clips
    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: t.clips
            .filter((c) => c.id !== clipId)
            .map((c) => {
              if (c.startTime > deletedClip!.startTime) {
                return { ...c, startTime: c.startTime - gap };
              }
              return c;
            }),
        };
      }),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  rippleInsert(timeline: Timeline, trackId: string, clip: Clip, insertTime: number): Timeline {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return timeline;

    // Shift all clips at or after insertTime
    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: [
            ...t.clips.map((c) => {
              if (c.startTime >= insertTime) {
                return { ...c, startTime: c.startTime + clip.duration };
              }
              return c;
            }),
            { ...clip, startTime: insertTime, trackId },
          ].sort((a, b) => a.startTime - b.startTime),
        };
      }),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  // ============================================
  // Copy/Paste Operations
  // ============================================

  copyClips(timeline: Timeline, clipIds: string[]): Clip[] {
    const clips: Clip[] = [];
    timeline.tracks.forEach((t) => {
      t.clips.forEach((c) => {
        if (clipIds.includes(c.id)) {
          clips.push(deepClone(c));
        }
      });
    });
    return clips;
  }

  pasteClips(
    timeline: Timeline,
    clips: Clip[],
    trackId: string,
    startTime: number
  ): Timeline {
    if (clips.length === 0) return timeline;

    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track || track.locked) return timeline;

    // Calculate offset from original positions
    const minStartTime = Math.min(...clips.map((c) => c.startTime));
    const offset = startTime - minStartTime;

    // Create new clips with new IDs and adjusted positions
    const newClips = clips.map((c) => ({
      ...deepClone(c),
      id: generateId(),
      trackId,
      startTime: c.startTime + offset,
    }));

    const newTimeline = {
      ...timeline,
      tracks: timeline.tracks.map((t) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          clips: [...t.clips, ...newClips].sort((a, b) => a.startTime - b.startTime),
        };
      }),
    };

    return { ...newTimeline, duration: this.calculateDuration(newTimeline) };
  }

  // ============================================
  // Snapping
  // ============================================

  findSnapPoints(timeline: Timeline, excludeClipId?: string): number[] {
    const points: Set<number> = new Set([0]);

    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.id !== excludeClipId) {
          points.add(clip.startTime);
          points.add(clip.startTime + clip.duration);
        }
      });
    });

    // Add markers
    timeline.markers.forEach((m) => points.add(m.time));

    // Add timeline duration
    points.add(timeline.duration);

    return Array.from(points).sort((a, b) => a - b);
  }

  snapToNearestPoint(
    time: number,
    snapPoints: number[],
    threshold = 0.1
  ): { snapped: boolean; time: number } {
    let closest = time;
    let minDiff = threshold;
    let snapped = false;

    snapPoints.forEach((point) => {
      const diff = Math.abs(time - point);
      if (diff < minDiff) {
        minDiff = diff;
        closest = point;
        snapped = true;
      }
    });

    return { snapped, time: closest };
  }

  // ============================================
  // Marker Operations
  // ============================================

  addMarker(timeline: Timeline, time: number, label: string, color = '#d4af37'): Timeline {
    return {
      ...timeline,
      markers: [
        ...timeline.markers,
        { id: generateId(), time, label, color },
      ].sort((a, b) => a.time - b.time),
    };
  }

  removeMarker(timeline: Timeline, markerId: string): Timeline {
    return {
      ...timeline,
      markers: timeline.markers.filter((m) => m.id !== markerId),
    };
  }

  updateMarker(
    timeline: Timeline,
    markerId: string,
    updates: Partial<{ time: number; label: string; color: string }>
  ): Timeline {
    return {
      ...timeline,
      markers: timeline.markers
        .map((m) => (m.id === markerId ? { ...m, ...updates } : m))
        .sort((a, b) => a.time - b.time),
    };
  }

  // ============================================
  // Query Operations
  // ============================================

  getClipAtTime(timeline: Timeline, trackId: string, time: number): Clip | null {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track) return null;

    return (
      track.clips.find((c) => time >= c.startTime && time < c.startTime + c.duration) ||
      null
    );
  }

  getClipsInRange(
    timeline: Timeline,
    startTime: number,
    endTime: number,
    trackId?: string
  ): Clip[] {
    const clips: Clip[] = [];

    timeline.tracks.forEach((t) => {
      if (trackId && t.id !== trackId) return;

      t.clips.forEach((c) => {
        const clipEnd = c.startTime + c.duration;
        if (c.startTime < endTime && clipEnd > startTime) {
          clips.push(c);
        }
      });
    });

    return clips;
  }

  getTrackByClipId(timeline: Timeline, clipId: string): Track | null {
    return timeline.tracks.find((t) => t.clips.some((c) => c.id === clipId)) || null;
  }

  // ============================================
  // Validation
  // ============================================

  hasOverlap(timeline: Timeline, trackId: string, excludeClipId?: string): boolean {
    const track = timeline.tracks.find((t) => t.id === trackId);
    if (!track) return false;

    const clips = track.clips.filter((c) => c.id !== excludeClipId);

    for (let i = 0; i < clips.length; i++) {
      for (let j = i + 1; j < clips.length; j++) {
        const a = clips[i];
        const b = clips[j];
        const aEnd = a.startTime + a.duration;
        const bEnd = b.startTime + b.duration;

        if (a.startTime < bEnd && aEnd > b.startTime) {
          return true;
        }
      }
    }

    return false;
  }

  validateTimeline(timeline: Timeline): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for overlapping clips
    timeline.tracks.forEach((track) => {
      if (this.hasOverlap(timeline, track.id)) {
        errors.push(`Track "${track.name}" has overlapping clips`);
      }
    });

    // Check for negative values
    timeline.tracks.forEach((track) => {
      track.clips.forEach((clip) => {
        if (clip.startTime < 0) {
          errors.push(`Clip has negative start time`);
        }
        if (clip.duration <= 0) {
          errors.push(`Clip has zero or negative duration`);
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const advancedEditorService = new AdvancedEditorService();

// Export effect presets
export const EFFECT_PRESETS: Record<EffectType, { label: string; defaultParams: Record<string, number> }> = {
  brightness: { label: 'Brightness', defaultParams: { value: 0 } },
  contrast: { label: 'Contrast', defaultParams: { value: 0 } },
  saturation: { label: 'Saturation', defaultParams: { value: 0 } },
  blur: { label: 'Blur', defaultParams: { radius: 0 } },
  sharpen: { label: 'Sharpen', defaultParams: { amount: 0 } },
  grayscale: { label: 'Grayscale', defaultParams: { amount: 100 } },
  sepia: { label: 'Sepia', defaultParams: { amount: 100 } },
  vignette: { label: 'Vignette', defaultParams: { intensity: 50, radius: 50 } },
  chromaKey: { label: 'Chroma Key', defaultParams: { hue: 120, tolerance: 30 } },
  colorCorrection: { label: 'Color Correction', defaultParams: { temperature: 0, tint: 0 } },
  speed: { label: 'Speed', defaultParams: { rate: 1 } },
  reverse: { label: 'Reverse', defaultParams: {} },
  mirror: { label: 'Mirror', defaultParams: { horizontal: 1 } },
};

// Export transition presets
export const TRANSITION_PRESETS: Record<TransitionType, { label: string; defaultDuration: number }> = {
  fade: { label: 'Fade', defaultDuration: 0.5 },
  crossDissolve: { label: 'Cross Dissolve', defaultDuration: 0.5 },
  slideLeft: { label: 'Slide Left', defaultDuration: 0.3 },
  slideRight: { label: 'Slide Right', defaultDuration: 0.3 },
  slideUp: { label: 'Slide Up', defaultDuration: 0.3 },
  slideDown: { label: 'Slide Down', defaultDuration: 0.3 },
  zoom: { label: 'Zoom', defaultDuration: 0.4 },
  wipe: { label: 'Wipe', defaultDuration: 0.5 },
  iris: { label: 'Iris', defaultDuration: 0.5 },
  none: { label: 'None', defaultDuration: 0 },
};
