/**
 * VIEWS Debug Agent
 * Comprehensive diagnostic tool for the Eleven Views platform
 * Monitors performance, API health, cache status, and error tracking
 */

import { queryCache } from './queryCache';
import { getGoogleAIKey, AI_MODELS } from './aiConfig';

interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  category: string;
  message: string;
  data?: any;
  stack?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  threshold?: number;
  status: 'good' | 'warning' | 'critical';
}

interface HealthCheck {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  lastCheck: Date;
  error?: string;
}

interface DiagnosticReport {
  timestamp: Date;
  environment: {
    userAgent: string;
    platform: string;
    language: string;
    online: boolean;
    memory?: { used: number; total: number };
  };
  performance: PerformanceMetric[];
  health: HealthCheck[];
  cache: {
    entries: number;
    size: number;
    hitRate: number;
  };
  errors: DebugLog[];
  warnings: DebugLog[];
}

class DebugAgent {
  private logs: DebugLog[] = [];
  private metrics: PerformanceMetric[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  private errorCount = 0;
  private warningCount = 0;
  private startTime = Date.now();
  private cacheHits = 0;
  private cacheMisses = 0;

  private maxLogs = 500;
  private maxMetrics = 100;

  constructor() {
    this.initializeErrorCapture();
    this.initializePerformanceMonitoring();
    this.log('info', 'system', 'Debug Agent initialized');
  }

  /**
   * Initialize global error capture
   */
  private initializeErrorCapture() {
    if (typeof window !== 'undefined') {
      // Capture unhandled errors
      window.addEventListener('error', (event) => {
        this.log('error', 'runtime', event.message, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }, event.error?.stack);
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.log('error', 'promise', 'Unhandled Promise Rejection', {
          reason: event.reason?.message || event.reason
        }, event.reason?.stack);
      });

      // Capture console errors
      const originalError = console.error;
      console.error = (...args) => {
        this.log('error', 'console', args.map(a =>
          typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' '));
        originalError.apply(console, args);
      };

      // Capture console warnings
      const originalWarn = console.warn;
      console.warn = (...args) => {
        this.log('warn', 'console', args.map(a =>
          typeof a === 'object' ? JSON.stringify(a) : String(a)
        ).join(' '));
        originalWarn.apply(console, args);
      };
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      // Monitor long tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.recordMetric('long-task', entry.duration, 'ms', 50);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long task observer not supported
      }

      // Monitor resource loading
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const resource = entry as PerformanceResourceTiming;
            if (resource.duration > 1000) {
              this.log('warn', 'performance', `Slow resource: ${resource.name}`, {
                duration: resource.duration,
                size: resource.transferSize
              });
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        // Resource observer not supported
      }
    }
  }

  /**
   * Log a debug message
   */
  log(
    level: DebugLog['level'],
    category: string,
    message: string,
    data?: any,
    stack?: string
  ) {
    const log: DebugLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      category,
      message,
      data,
      stack
    };

    this.logs.push(log);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (level === 'error') this.errorCount++;
    if (level === 'warn') this.warningCount++;

    // Store in sessionStorage for persistence
    if (typeof sessionStorage !== 'undefined') {
      try {
        const recentLogs = this.logs.slice(-50);
        sessionStorage.setItem('debug_logs', JSON.stringify(recentLogs));
      } catch (e) {
        // Storage full or unavailable
      }
    }
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, unit: string, threshold?: number) {
    const status: PerformanceMetric['status'] =
      threshold ? (value > threshold * 2 ? 'critical' : value > threshold ? 'warning' : 'good') : 'good';

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      threshold,
      status
    };

    this.metrics.push(metric);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }
  }

  /**
   * Record cache hit/miss for analytics
   */
  recordCacheAccess(hit: boolean) {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  /**
   * Check service health
   */
  async checkHealth(service: string, checkFn: () => Promise<boolean>): Promise<HealthCheck> {
    const startTime = performance.now();
    let status: HealthCheck['status'] = 'healthy';
    let error: string | undefined;

    try {
      const result = await Promise.race([
        checkFn(),
        new Promise<boolean>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ]);

      if (!result) {
        status = 'degraded';
      }
    } catch (e: any) {
      status = 'down';
      error = e.message;
    }

    const latency = performance.now() - startTime;
    const healthCheck: HealthCheck = {
      service,
      status,
      latency,
      lastCheck: new Date(),
      error
    };

    this.healthChecks.set(service, healthCheck);
    return healthCheck;
  }

  /**
   * Run all health checks
   */
  async runHealthChecks(): Promise<HealthCheck[]> {
    const checks: Promise<HealthCheck>[] = [];

    // Check Google AI API
    checks.push(this.checkHealth('google-ai', async () => {
      const apiKey = getGoogleAIKey();
      return !!apiKey && apiKey.length > 10;
    }));

    // Check localStorage availability
    checks.push(this.checkHealth('localStorage', async () => {
      try {
        localStorage.setItem('_health_check', '1');
        localStorage.removeItem('_health_check');
        return true;
      } catch {
        return false;
      }
    }));

    // Check network connectivity
    checks.push(this.checkHealth('network', async () => {
      return navigator.onLine;
    }));

    // Check Supabase (if configured)
    checks.push(this.checkHealth('supabase', async () => {
      const url = import.meta.env.VITE_SUPABASE_URL;
      if (!url) return false;
      try {
        const response = await fetch(`${url}/rest/v1/`, {
          method: 'HEAD',
          headers: { 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '' }
        });
        return response.ok || response.status === 401; // 401 is expected without proper auth
      } catch {
        return false;
      }
    }));

    // Check MCP Service
    checks.push(this.checkHealth('mcp-service', async () => {
      const url = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
      try {
        const response = await fetch(`${url}/health`, { method: 'GET' });
        return response.ok;
      } catch {
        return false;
      }
    }));

    return Promise.all(checks);
  }

  /**
   * Generate a full diagnostic report
   */
  async generateReport(): Promise<DiagnosticReport> {
    await this.runHealthChecks();

    const cacheStats = queryCache.getStats();
    const totalCacheAccess = this.cacheHits + this.cacheMisses;

    const report: DiagnosticReport = {
      timestamp: new Date(),
      environment: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        memory: typeof performance !== 'undefined' && (performance as any).memory ? {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize
        } : undefined
      },
      performance: this.metrics.slice(-20),
      health: Array.from(this.healthChecks.values()),
      cache: {
        entries: cacheStats.totalEntries,
        size: cacheStats.totalSize,
        hitRate: totalCacheAccess > 0 ? this.cacheHits / totalCacheAccess : 0
      },
      errors: this.logs.filter(l => l.level === 'error').slice(-20),
      warnings: this.logs.filter(l => l.level === 'warn').slice(-20)
    };

    return report;
  }

  /**
   * Get summary stats
   */
  getStats() {
    const uptime = Date.now() - this.startTime;
    const totalCacheAccess = this.cacheHits + this.cacheMisses;

    return {
      uptime,
      uptimeFormatted: this.formatDuration(uptime),
      errorCount: this.errorCount,
      warningCount: this.warningCount,
      logCount: this.logs.length,
      cacheHitRate: totalCacheAccess > 0
        ? Math.round((this.cacheHits / totalCacheAccess) * 100)
        : 0,
      healthStatus: this.getOverallHealth()
    };
  }

  /**
   * Get overall health status
   */
  private getOverallHealth(): 'healthy' | 'degraded' | 'critical' {
    const checks = Array.from(this.healthChecks.values());
    if (checks.some(c => c.status === 'down')) return 'critical';
    if (checks.some(c => c.status === 'degraded')) return 'degraded';
    return 'healthy';
  }

  /**
   * Format duration for display
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get recent logs
   */
  getLogs(options?: {
    level?: DebugLog['level'];
    category?: string;
    limit?: number;
  }): DebugLog[] {
    let filtered = this.logs;

    if (options?.level) {
      filtered = filtered.filter(l => l.level === options.level);
    }
    if (options?.category) {
      filtered = filtered.filter(l => l.category === options.category);
    }

    return filtered.slice(-(options?.limit || 50));
  }

  /**
   * Clear all logs and reset counters
   */
  clear() {
    this.logs = [];
    this.metrics = [];
    this.errorCount = 0;
    this.warningCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.log('info', 'system', 'Debug Agent cleared');
  }

  /**
   * Export logs for download
   */
  exportLogs(): string {
    const data = {
      exported: new Date().toISOString(),
      stats: this.getStats(),
      logs: this.logs,
      metrics: this.metrics,
      health: Array.from(this.healthChecks.values())
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Test AI connection
   */
  async testAI(): Promise<{ success: boolean; message: string; latency?: number }> {
    const startTime = performance.now();

    try {
      const apiKey = getGoogleAIKey();
      if (!apiKey) {
        return { success: false, message: 'API key not configured' };
      }

      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: AI_MODELS.text.flash,
        contents: 'Say "OK" if you can hear me.',
      });

      const latency = performance.now() - startTime;
      const text = response.text || '';

      if (text.toLowerCase().includes('ok')) {
        this.log('info', 'ai-test', `AI test passed in ${latency.toFixed(0)}ms`);
        return { success: true, message: 'AI connection successful', latency };
      } else {
        return { success: false, message: 'Unexpected AI response', latency };
      }
    } catch (error: any) {
      const latency = performance.now() - startTime;
      this.log('error', 'ai-test', `AI test failed: ${error.message}`);
      return { success: false, message: error.message, latency };
    }
  }

  /**
   * Measure component render time
   */
  measureRender(componentName: string, renderFn: () => void): number {
    const start = performance.now();
    renderFn();
    const duration = performance.now() - start;

    this.recordMetric(`render-${componentName}`, duration, 'ms', 16); // 16ms = 60fps
    return duration;
  }

  /**
   * Wrap an async function with timing
   */
  async timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(name, duration, 'ms');
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      this.recordMetric(`${name}-error`, duration, 'ms');
      throw error;
    }
  }
}

// Singleton instance
export const debugAgent = new DebugAgent();

// Expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugAgent = debugAgent;
  (window as any).viewsDebug = {
    stats: () => debugAgent.getStats(),
    logs: (level?: string) => debugAgent.getLogs({ level: level as any }),
    report: () => debugAgent.generateReport(),
    health: () => debugAgent.runHealthChecks(),
    testAI: () => debugAgent.testAI(),
    clear: () => debugAgent.clear(),
    export: () => {
      const data = debugAgent.exportLogs();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `views-debug-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  console.log('%c🔧 VIEWS Debug Agent Active', 'color: #F5C242; font-weight: bold; font-size: 14px');
  console.log('%cUse viewsDebug.stats() | viewsDebug.logs() | viewsDebug.testAI() | viewsDebug.health()', 'color: #888');
}
