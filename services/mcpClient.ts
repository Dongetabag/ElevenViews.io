// MCP Client Service for Eleven Views
// Connects to both Eleven Views MCP and AISIM MCP servers

const ELEVEN_VIEWS_MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.elevenviews.io';
const AISIM_MCP_URL = import.meta.env.VITE_AISIM_MCP_URL || 'https://aisim.elevenviews.io';

export interface MCPTool {
  name: string;
  description: string;
  server: 'eleven-views' | 'aisim';
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  toolName: string;
  server: string;
  timestamp: string;
}

export interface MCPServerStatus {
  name: string;
  url: string;
  connected: boolean;
  tools: MCPTool[];
  lastChecked: string;
}

export interface SlackMessage {
  channel?: string;
  message: string;
  username?: string;
}

export interface LeadData {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  category?: string;
  city?: string;
  status?: string;
  score?: number;
}

export interface PipelineStats {
  totalLeads: number;
  qualified: number;
  newLeads: number;
  pipelineValue: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
}

class MCPClient {
  private elevenViewsUrl: string;
  private aisimUrl: string;
  private tools: MCPTool[] = [];
  private servers: MCPServerStatus[] = [];

  constructor() {
    this.elevenViewsUrl = ELEVEN_VIEWS_MCP_URL;
    this.aisimUrl = AISIM_MCP_URL;
  }

  // Initialize connection to both MCP servers
  async connect(): Promise<{ success: boolean; tools: MCPTool[]; servers: MCPServerStatus[] }> {
    const results = await Promise.allSettled([
      this.connectToServer('eleven-views', this.elevenViewsUrl),
      this.connectToServer('aisim', this.aisimUrl)
    ]);

    this.servers = [];
    this.tools = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.servers.push(result.value);
        this.tools.push(...result.value.tools);
      }
    });

    const anyConnected = this.servers.some(s => s.connected);
    console.log(`[MCP] Connected to ${this.servers.filter(s => s.connected).length}/${this.servers.length} servers with ${this.tools.length} total tools`);

    return {
      success: anyConnected,
      tools: this.tools,
      servers: this.servers
    };
  }

  // Connect to individual MCP server
  private async connectToServer(name: 'eleven-views' | 'aisim', url: string): Promise<MCPServerStatus> {
    const status: MCPServerStatus = {
      name,
      url,
      connected: false,
      tools: [],
      lastChecked: new Date().toISOString()
    };

    try {
      // Try health check
      const healthResponse = await fetch(`${url}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (healthResponse.ok) {
        status.connected = true;

        // Try to get tools list from server
        try {
          const toolsResponse = await fetch(`${url}/mcp/tools`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
          });

          if (toolsResponse.ok) {
            const toolsData = await toolsResponse.json();
            if (toolsData.tools && Array.isArray(toolsData.tools)) {
              status.tools = toolsData.tools.map((t: any) => ({
                name: t.name,
                description: t.description,
                server: name,
                inputSchema: t.inputSchema || { type: 'object', properties: {}, required: [] }
              }));
            }
          }
        } catch (e) {
          console.warn(`[MCP] Could not fetch tools from ${name}, using defaults`);
          status.tools = this.getDefaultToolsForServer(name);
        }

        // If no tools from server, use defaults
        if (status.tools.length === 0) {
          status.tools = this.getDefaultToolsForServer(name);
        }
      }
    } catch (error) {
      console.warn(`[MCP] Failed to connect to ${name}:`, error);
      // Still add default tools so they can be tried
      status.tools = this.getDefaultToolsForServer(name);
    }

    return status;
  }

  // Get default tool definitions for each server
  private getDefaultToolsForServer(server: 'eleven-views' | 'aisim'): MCPTool[] {
    if (server === 'eleven-views') {
      return [
        {
          name: 'list_files',
          description: 'List files in storage',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { prefix: { type: 'string' }, maxFiles: { type: 'number' } }, required: [] }
        },
        {
          name: 'get_file_info',
          description: 'Get file details',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] }
        },
        {
          name: 'search_files',
          description: 'Search for files',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { query: { type: 'string' }, type: { type: 'string' } }, required: ['query'] }
        },
        {
          name: 'get_storage_stats',
          description: 'Get storage statistics',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: {}, required: [] }
        },
        {
          name: 'write_file',
          description: 'Write/upload a file',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { key: { type: 'string' }, content: { type: 'string' }, contentType: { type: 'string' } }, required: ['key', 'content'] }
        },
        {
          name: 'delete_file',
          description: 'Delete a file',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { key: { type: 'string' } }, required: ['key'] }
        },
        {
          name: 'create_folder',
          description: 'Create a folder',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] }
        },
        {
          name: 'organize_file',
          description: 'Smart organize a file by category/project/client',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { key: { type: 'string' }, project: { type: 'string' }, client: { type: 'string' } }, required: ['key'] }
        },
        {
          name: 'generate_share_url',
          description: 'Get shareable URL for a file',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { key: { type: 'string' }, expiresIn: { type: 'number' } }, required: ['key'] }
        },
        {
          name: 'create_project',
          description: 'Create project folder structure',
          server: 'eleven-views',
          inputSchema: { type: 'object', properties: { name: { type: 'string' }, type: { type: 'string' }, client: { type: 'string' } }, required: ['name'] }
        }
      ];
    } else {
      // AISIM MCP tools
      return [
        {
          name: 'revenue-automation-orchestrator',
          description: 'Orchestrate revenue automation workflows',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { workflow: { type: 'string' } }, required: [] }
        },
        {
          name: 'content-empire-builder',
          description: 'Build content strategy',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { industry: { type: 'string' }, goals: { type: 'array' } }, required: ['industry'] }
        },
        {
          name: 'business-genesis-engine',
          description: 'Generate business plans and strategies',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { concept: { type: 'string' }, market: { type: 'string' } }, required: ['concept'] }
        },
        {
          name: 'client-intelligence-synthesizer',
          description: 'Analyze client data and insights',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { clientData: { type: 'object' } }, required: [] }
        },
        {
          name: 'conversion-optimizer',
          description: 'Optimize conversion funnels',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { funnel: { type: 'object' }, goals: { type: 'array' } }, required: [] }
        },
        {
          name: 'visual-audit-engine',
          description: 'Audit visual assets and designs',
          server: 'aisim',
          inputSchema: { type: 'object', properties: { url: { type: 'string' }, imageUrl: { type: 'string' } }, required: [] }
        }
      ];
    }
  }

  // Execute a tool on the appropriate server
  async executeTool(toolName: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    // Find which server this tool belongs to
    const tool = this.tools.find(t => t.name === toolName);
    const serverName = tool?.server || 'eleven-views';
    const baseUrl = serverName === 'aisim' ? this.aisimUrl : this.elevenViewsUrl;

    try {
      // Use the correct endpoint format: POST /mcp/tools/{toolName}
      const response = await fetch(`${baseUrl}/mcp/tools/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args)
      });

      const data = await response.json();

      return {
        success: response.ok && !data.error,
        data: data.result || data.content || data,
        error: data.error,
        toolName,
        server: serverName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName,
        server: serverName,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Eleven Views specific methods - using correct tool names
  async checkHealth(): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.elevenViewsUrl}/health`);
      const data = await response.json();
      return {
        success: response.ok,
        data,
        toolName: 'health',
        server: 'eleven-views',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName: 'health',
        server: 'eleven-views',
        timestamp: new Date().toISOString()
      };
    }
  }

  async listFiles(prefix?: string, limit?: number): Promise<MCPToolResult> {
    return this.executeTool('list_files', { prefix, maxFiles: limit });
  }

  async getStorageStats(): Promise<MCPToolResult> {
    return this.executeTool('get_storage_stats', {});
  }

  async searchFiles(query: string, type?: string): Promise<MCPToolResult> {
    return this.executeTool('search_files', { query, type });
  }

  async writeFile(key: string, content: string, contentType?: string): Promise<MCPToolResult> {
    return this.executeTool('write_file', { key, content, contentType });
  }

  async deleteFile(key: string): Promise<MCPToolResult> {
    return this.executeTool('delete_file', { key });
  }

  async createFolder(path: string): Promise<MCPToolResult> {
    return this.executeTool('create_folder', { path });
  }

  async generateShareUrl(key: string, expiresIn?: number): Promise<MCPToolResult> {
    return this.executeTool('generate_share_url', { key, expiresIn });
  }

  async createProject(name: string, type?: string, client?: string): Promise<MCPToolResult> {
    return this.executeTool('create_project', { name, type, client });
  }

  // Backward compatibility aliases
  async getPipelineStats(): Promise<MCPToolResult> {
    return this.getStorageStats();
  }

  async getLeads(filters: { category?: string; city?: string; status?: string; limit?: number } = {}): Promise<MCPToolResult> {
    // Route to local database via /stats or return empty
    try {
      const response = await fetch(`${this.elevenViewsUrl}/stats`);
      const data = await response.json();
      return {
        success: true,
        data: data.leads || [],
        toolName: 'get_leads',
        server: 'eleven-views',
        timestamp: new Date().toISOString()
      };
    } catch {
      return { success: false, error: 'Leads API not available', toolName: 'get_leads', server: 'eleven-views', timestamp: new Date().toISOString() };
    }
  }

  // AISIM specific methods
  async runAisimTool(skillName: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    return this.executeTool(skillName, args);
  }

  // Get connection status
  getStatus(): { connected: boolean; tools: MCPTool[]; servers: MCPServerStatus[] } {
    return {
      connected: this.servers.some(s => s.connected),
      tools: this.tools,
      servers: this.servers
    };
  }

  // Get tools filtered by server
  getToolsByServer(server: 'eleven-views' | 'aisim'): MCPTool[] {
    return this.tools.filter(t => t.server === server);
  }

  // Get all tools
  getTools(): MCPTool[] {
    return this.tools;
  }

  // Get servers
  getServers(): MCPServerStatus[] {
    return this.servers;
  }
}

// Singleton instance
export const mcpClient = new MCPClient();

// Auto-connect on import
mcpClient.connect().then(result => {
  if (result.success) {
    console.log('[MCP] Connected to servers:', result.servers.filter(s => s.connected).map(s => s.name).join(', '));
    console.log('[MCP] Total tools available:', result.tools.length);
  } else {
    console.warn('[MCP] Failed to connect to MCP servers');
  }
});

export default mcpClient;
