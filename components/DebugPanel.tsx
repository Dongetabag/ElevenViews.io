/**
 * Debug Panel Component
 * Visual interface for the VIEWS Debug Agent
 * Access via keyboard shortcut: Ctrl+Shift+D
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, Bug, Activity, Zap, Database, Wifi, WifiOff,
  AlertTriangle, AlertCircle, CheckCircle, RefreshCw,
  Download, Trash2, ChevronDown, ChevronRight, Clock,
  Cpu, HardDrive, Bot
} from 'lucide-react';
import { debugAgent } from '../services/debugAgent';

interface DebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'health' | 'ai'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [health, setHealth] = useState<any[]>([]);
  const [aiTestResult, setAiTestResult] = useState<any>(null);
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    setStats(debugAgent.getStats());
    setLogs(debugAgent.getLogs({ limit: 100 }));
    const healthChecks = await debugAgent.runHealthChecks();
    setHealth(healthChecks);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      refresh();
      const interval = setInterval(() => {
        setStats(debugAgent.getStats());
        setLogs(debugAgent.getLogs({ limit: 100 }));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, refresh]);

  const handleTestAI = async () => {
    setIsTestingAI(true);
    const result = await debugAgent.testAI();
    setAiTestResult(result);
    setIsTestingAI(false);
  };

  const handleExport = () => {
    const data = debugAgent.exportLogs();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `views-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    debugAgent.clear();
    refresh();
  };

  const filteredLogs = logFilter === 'all'
    ? logs
    : logs.filter(l => l.level === logFilter);

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return 'text-green-400';
      case 'degraded':
      case 'warning':
        return 'text-yellow-400';
      case 'down':
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'good':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'down':
      case 'critical':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warn':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'info':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-brand-dark border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-brand-card/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-gold/20 rounded-lg">
              <Bug className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Debug Agent</h2>
              <p className="text-xs text-gray-500">Platform Diagnostics</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 py-2 border-b border-white/10 bg-brand-card/30">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'logs', label: 'Logs', icon: Database },
            { id: 'health', label: 'Health', icon: Zap },
            { id: 'ai', label: 'AI Test', icon: Bot }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-brand-gold text-black font-medium'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Status Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-brand-gold" />
                    <span className="text-xs text-gray-500">Uptime</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.uptimeFormatted}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-gray-500">Errors</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.errorCount}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs text-gray-500">Warnings</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.warningCount}</p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <HardDrive className="w-4 h-4 text-blue-400" />
                    <span className="text-xs text-gray-500">Cache Hit Rate</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.cacheHitRate}%</p>
                </div>
              </div>

              {/* Health Status */}
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">System Health</h3>
                <div className="flex items-center gap-3">
                  {getStatusIcon(stats.healthStatus)}
                  <span className={`text-sm font-medium capitalize ${getStatusColor(stats.healthStatus)}`}>
                    {stats.healthStatus}
                  </span>
                </div>
              </div>

              {/* Recent Errors */}
              {stats.errorCount > 0 && (
                <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
                  <h3 className="text-sm font-semibold text-red-400 mb-3">Recent Errors</h3>
                  <div className="space-y-2">
                    {logs.filter(l => l.level === 'error').slice(-3).map(log => (
                      <div key={log.id} className="text-xs text-red-300 font-mono truncate">
                        {log.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              {/* Filter */}
              <div className="flex gap-2">
                {['all', 'error', 'warn', 'info', 'debug'].map(level => (
                  <button
                    key={level}
                    onClick={() => setLogFilter(level)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      logFilter === level
                        ? 'bg-brand-gold text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>

              {/* Log List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredLogs.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No logs to display</p>
                ) : (
                  filteredLogs.slice().reverse().map(log => (
                    <div
                      key={log.id}
                      className="p-3 bg-white/5 rounded-lg border border-white/10 font-mono text-xs"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${getLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                        <span className="text-gray-500">{log.category}</span>
                        <span className="text-gray-600 ml-auto">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 p-2 bg-black/30 rounded text-gray-500 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-4">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-4 py-2 bg-brand-gold text-black font-medium rounded-lg"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Run Health Checks
              </button>

              <div className="space-y-3">
                {health.map(check => (
                  <div
                    key={check.service}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <p className="text-sm font-medium text-white">{check.service}</p>
                        {check.error && (
                          <p className="text-xs text-red-400 mt-0.5">{check.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-medium capitalize ${getStatusColor(check.status)}`}>
                        {check.status}
                      </span>
                      {check.latency && (
                        <p className="text-xs text-gray-500">{Math.round(check.latency)}ms</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Test Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div className="p-6 bg-white/5 rounded-xl border border-white/10 text-center">
                <Bot className="w-12 h-12 text-brand-gold mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">AI Connection Test</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Test the connection to Google AI (Gemini) API
                </p>

                <button
                  onClick={handleTestAI}
                  disabled={isTestingAI}
                  className="px-6 py-3 bg-brand-gold text-black font-bold rounded-xl disabled:opacity-50"
                >
                  {isTestingAI ? 'Testing...' : 'Run AI Test'}
                </button>

                {aiTestResult && (
                  <div className={`mt-6 p-4 rounded-xl ${
                    aiTestResult.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
                  }`}>
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {aiTestResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-medium ${aiTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {aiTestResult.success ? 'Success' : 'Failed'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{aiTestResult.message}</p>
                    {aiTestResult.latency && (
                      <p className="text-xs text-gray-500 mt-1">Latency: {Math.round(aiTestResult.latency)}ms</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-brand-card/30 text-xs text-gray-500 flex justify-between">
          <span>Press Ctrl+Shift+D to toggle</span>
          <span>Logs: {logs.length} | Last refresh: {stats ? new Date().toLocaleTimeString() : 'Never'}</span>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
