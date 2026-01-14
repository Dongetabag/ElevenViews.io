// Production Service - Project Management via Supabase
// Handles CRUD operations for video projects

import { supabase } from './supabaseService';
import {
  VideoProject,
  Timeline,
  ProjectSettings,
  ProjectStatus,
  ProjectAsset,
  ShareableLink,
  ExportJob,
  ExportSettings,
} from '../types';

// Constants
const TABLES = {
  PROJECTS: 'video_projects',
  ASSETS: 'project_assets',
  VERSIONS: 'project_versions',
  SHARES: 'shareable_links',
  EXPORTS: 'export_jobs',
};

// Default project settings
const DEFAULT_SETTINGS: ProjectSettings = {
  resolution: { width: 1920, height: 1080, label: '1080p' },
  frameRate: 30,
  aspectRatio: '16:9',
  backgroundColor: '#0f1410',
  defaultTransition: 'fade',
};

// Helper to generate IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const generateShareToken = () => Math.random().toString(36).substr(2, 16);
const now = () => new Date().toISOString();

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

class ProductionService {
  // ============================================
  // Project CRUD Operations
  // ============================================

  async createProject(
    name: string,
    userId: string,
    options?: {
      description?: string;
      settings?: Partial<ProjectSettings>;
      metadata?: Record<string, unknown>;
    }
  ): Promise<VideoProject> {
    const project: VideoProject = {
      id: generateId(),
      name,
      description: options?.description,
      createdAt: now(),
      updatedAt: now(),
      status: 'draft',
      timeline: createEmptyTimeline(),
      assets: [],
      settings: { ...DEFAULT_SETTINGS, ...options?.settings },
      metadata: options?.metadata || {},
      version: 1,
    };

    try {
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .insert({
          id: project.id,
          user_id: userId,
          name: project.name,
          description: project.description,
          status: project.status,
          timeline: project.timeline,
          settings: project.settings,
          metadata: project.metadata,
          version: project.version,
          created_at: project.createdAt,
          updated_at: project.updatedAt,
        })
        .select()
        .single();

      if (error) throw error;
      return project;
    } catch (error) {
      console.error('Failed to create project in Supabase:', error);
      // Return local project if Supabase fails
      return project;
    }
  }

  async getProject(projectId: string): Promise<VideoProject | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapDbToProject(data);
    } catch (error) {
      console.error('Failed to get project:', error);
      return null;
    }
  }

  async listProjects(
    userId: string,
    options?: {
      status?: ProjectStatus;
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'updated_at' | 'name';
      orderDir?: 'asc' | 'desc';
    }
  ): Promise<{ projects: VideoProject[]; total: number }> {
    try {
      let query = supabase
        .from(TABLES.PROJECTS)
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      query = query.order(options?.orderBy || 'updated_at', {
        ascending: options?.orderDir === 'asc',
      });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        projects: (data || []).map(this.mapDbToProject),
        total: count || 0,
      };
    } catch (error) {
      console.error('Failed to list projects:', error);
      return { projects: [], total: 0 };
    }
  }

  async updateProject(
    projectId: string,
    updates: Partial<VideoProject>
  ): Promise<VideoProject | null> {
    try {
      const updateData: Record<string, unknown> = {
        updated_at: now(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.timeline !== undefined) updateData.timeline = updates.timeline;
      if (updates.settings !== undefined) updateData.settings = updates.settings;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.thumbnailUrl !== undefined) updateData.thumbnail_url = updates.thumbnailUrl;

      // Increment version
      const { data: current } = await supabase
        .from(TABLES.PROJECTS)
        .select('version')
        .eq('id', projectId)
        .single();

      updateData.version = (current?.version || 0) + 1;

      const { data, error } = await supabase
        .from(TABLES.PROJECTS)
        .update(updateData)
        .eq('id', projectId)
        .select()
        .single();

      if (error) throw error;
      return this.mapDbToProject(data);
    } catch (error) {
      console.error('Failed to update project:', error);
      return null;
    }
  }

  async deleteProject(projectId: string): Promise<boolean> {
    try {
      // Delete associated assets
      await supabase.from(TABLES.ASSETS).delete().eq('project_id', projectId);

      // Delete shareable links
      await supabase.from(TABLES.SHARES).delete().eq('project_id', projectId);

      // Delete export jobs
      await supabase.from(TABLES.EXPORTS).delete().eq('project_id', projectId);

      // Delete project
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .delete()
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }

  async duplicateProject(
    projectId: string,
    userId: string,
    newName?: string
  ): Promise<VideoProject | null> {
    try {
      const original = await this.getProject(projectId);
      if (!original) return null;

      const duplicate = await this.createProject(
        newName || `${original.name} (Copy)`,
        userId,
        {
          description: original.description,
          settings: original.settings,
          metadata: original.metadata,
        }
      );

      // Copy timeline (with new IDs)
      duplicate.timeline = JSON.parse(JSON.stringify(original.timeline));
      duplicate.timeline.id = generateId();

      await this.updateProject(duplicate.id, { timeline: duplicate.timeline });

      return duplicate;
    } catch (error) {
      console.error('Failed to duplicate project:', error);
      return null;
    }
  }

  // ============================================
  // Status Management
  // ============================================

  async updateStatus(projectId: string, status: ProjectStatus): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .update({ status, updated_at: now() })
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update status:', error);
      return false;
    }
  }

  // ============================================
  // Timeline Auto-save
  // ============================================

  async autoSaveTimeline(projectId: string, timeline: Timeline): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.PROJECTS)
        .update({
          timeline,
          updated_at: now(),
        })
        .eq('id', projectId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to auto-save timeline:', error);
      return false;
    }
  }

  // ============================================
  // Version History
  // ============================================

  async saveVersion(
    projectId: string,
    timeline: Timeline,
    userId: string,
    changeDescription?: string
  ): Promise<boolean> {
    try {
      const { data: project } = await supabase
        .from(TABLES.PROJECTS)
        .select('version')
        .eq('id', projectId)
        .single();

      const { error } = await supabase.from(TABLES.VERSIONS).insert({
        id: generateId(),
        project_id: projectId,
        version: project?.version || 1,
        timeline,
        change_description: changeDescription,
        created_by: userId,
        created_at: now(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to save version:', error);
      return false;
    }
  }

  async getVersionHistory(
    projectId: string
  ): Promise<{ version: number; timestamp: string; description: string }[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.VERSIONS)
        .select('version, created_at, change_description')
        .eq('project_id', projectId)
        .order('version', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((v) => ({
        version: v.version,
        timestamp: v.created_at,
        description: v.change_description || '',
      }));
    } catch (error) {
      console.error('Failed to get version history:', error);
      return [];
    }
  }

  async restoreVersion(projectId: string, version: number): Promise<VideoProject | null> {
    try {
      const { data: versionData, error: versionError } = await supabase
        .from(TABLES.VERSIONS)
        .select('timeline')
        .eq('project_id', projectId)
        .eq('version', version)
        .single();

      if (versionError) throw versionError;
      if (!versionData) return null;

      return this.updateProject(projectId, {
        timeline: versionData.timeline,
      });
    } catch (error) {
      console.error('Failed to restore version:', error);
      return null;
    }
  }

  // ============================================
  // Shareable Links
  // ============================================

  async createShareableLink(
    projectId: string,
    options?: {
      expiresIn?: number; // hours
      password?: string;
      permissions?: 'view' | 'comment' | 'download';
    }
  ): Promise<ShareableLink | null> {
    try {
      const shareToken = generateShareToken();
      const baseUrl = import.meta.env.VITE_APP_URL || 'https://elevenviews.io';
      const url = `${baseUrl}/share/${shareToken}`;

      const expiresAt = options?.expiresIn
        ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
        : null;

      const link: ShareableLink = {
        id: generateId(),
        projectId,
        url,
        shareToken,
        expiresAt: expiresAt || undefined,
        password: options?.password,
        accessCount: 0,
        permissions: options?.permissions || 'view',
        createdAt: now(),
      };

      const { error } = await supabase.from(TABLES.SHARES).insert({
        id: link.id,
        project_id: projectId,
        share_token: shareToken,
        url,
        password_hash: options?.password, // In production, hash this
        permissions: link.permissions,
        expires_at: expiresAt,
        access_count: 0,
        created_at: link.createdAt,
      });

      if (error) throw error;
      return link;
    } catch (error) {
      console.error('Failed to create shareable link:', error);
      return null;
    }
  }

  async getShareableLinks(projectId: string): Promise<ShareableLink[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.SHARES)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((l) => ({
        id: l.id,
        projectId: l.project_id,
        url: l.url,
        shareToken: l.share_token,
        expiresAt: l.expires_at,
        password: l.password_hash ? '****' : undefined,
        accessCount: l.access_count,
        permissions: l.permissions,
        createdAt: l.created_at,
      }));
    } catch (error) {
      console.error('Failed to get shareable links:', error);
      return [];
    }
  }

  async deleteShareableLink(linkId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(TABLES.SHARES)
        .delete()
        .eq('id', linkId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete shareable link:', error);
      return false;
    }
  }

  async incrementShareAccess(shareToken: string): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('increment_share_access', {
        token: shareToken,
      });

      if (error) {
        // Fallback if RPC doesn't exist
        const { data } = await supabase
          .from(TABLES.SHARES)
          .select('access_count')
          .eq('share_token', shareToken)
          .single();

        if (data) {
          await supabase
            .from(TABLES.SHARES)
            .update({ access_count: data.access_count + 1 })
            .eq('share_token', shareToken);
        }
      }
      return true;
    } catch (error) {
      console.error('Failed to increment share access:', error);
      return false;
    }
  }

  // ============================================
  // Export Jobs
  // ============================================

  async createExportJob(
    projectId: string,
    userId: string,
    settings: ExportSettings
  ): Promise<ExportJob | null> {
    try {
      const job: ExportJob = {
        id: generateId(),
        projectId,
        status: 'pending',
        progress: 0,
        settings,
        createdAt: now(),
      };

      const { error } = await supabase.from(TABLES.EXPORTS).insert({
        id: job.id,
        project_id: projectId,
        user_id: userId,
        status: job.status,
        settings,
        progress: 0,
        created_at: job.createdAt,
      });

      if (error) throw error;
      return job;
    } catch (error) {
      console.error('Failed to create export job:', error);
      return null;
    }
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    try {
      const { data, error } = await supabase
        .from(TABLES.EXPORTS)
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        projectId: data.project_id,
        status: data.status,
        progress: data.progress,
        settings: data.settings,
        outputUrl: data.output_url,
        errorMessage: data.error_message,
        startedAt: data.started_at,
        completedAt: data.completed_at,
        createdAt: data.created_at,
      };
    } catch (error) {
      console.error('Failed to get export job:', error);
      return null;
    }
  }

  async updateExportJob(
    jobId: string,
    updates: Partial<ExportJob>
  ): Promise<boolean> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.outputUrl !== undefined) updateData.output_url = updates.outputUrl;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.startedAt !== undefined) updateData.started_at = updates.startedAt;
      if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt;

      const { error } = await supabase
        .from(TABLES.EXPORTS)
        .update(updateData)
        .eq('id', jobId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update export job:', error);
      return false;
    }
  }

  async listExportJobs(
    projectId: string
  ): Promise<ExportJob[]> {
    try {
      const { data, error } = await supabase
        .from(TABLES.EXPORTS)
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (data || []).map((j) => ({
        id: j.id,
        projectId: j.project_id,
        status: j.status,
        progress: j.progress,
        settings: j.settings,
        outputUrl: j.output_url,
        errorMessage: j.error_message,
        startedAt: j.started_at,
        completedAt: j.completed_at,
        createdAt: j.created_at,
      }));
    } catch (error) {
      console.error('Failed to list export jobs:', error);
      return [];
    }
  }

  // ============================================
  // Helper Methods
  // ============================================

  private mapDbToProject(data: Record<string, any>): VideoProject {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      status: data.status,
      timeline: data.timeline,
      assets: [],
      settings: data.settings,
      metadata: data.metadata || {},
      collaborators: data.collaborators,
      version: data.version,
      thumbnailUrl: data.thumbnail_url,
    };
  }
}

// Export singleton instance
export const productionService = new ProductionService();
