// MCP Client Service for Recipe Labs
// Connects to the unified MCP server and exposes tools to the AI agent

const MCP_BASE_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.srv1167160.hstgr.cloud';
const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://72.61.72.94:5000';

export interface MCPTool {
  name: string;
  description: string;
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
  timestamp: string;
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
  private baseUrl: string;
  private agentUrl: string;
  private tools: MCPTool[] = [];
  private isConnected: boolean = false;

  constructor() {
    this.baseUrl = MCP_BASE_URL;
    this.agentUrl = AGENT_API_URL;
  }

  // Initialize connection and fetch available tools
  async connect(): Promise<{ success: boolean; tools: MCPTool[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) throw new Error('MCP server not responding');

      const health = await response.json();
      this.isConnected = health.status === 'healthy';

      // Fetch tool definitions
      this.tools = await this.getToolDefinitions();

      return { success: true, tools: this.tools };
    } catch (error) {
      console.error('MCP connection failed:', error);
      this.isConnected = false;
      return { success: false, tools: [] };
    }
  }

  // Get available tool definitions
  private async getToolDefinitions(): Promise<MCPTool[]> {
    return [
      {
        name: 'recipe_labs_health',
        description: 'Check the health status of Recipe Labs API and all connected services',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'recipe_labs_get_leads',
        description: 'Get leads from the database with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by business category' },
            city: { type: 'string', description: 'Filter by city' },
            status: { type: 'string', description: 'Filter by status (new, contacted, qualified)' },
            limit: { type: 'number', description: 'Max leads to return' }
          },
          required: []
        }
      },
      {
        name: 'recipe_labs_pipeline_stats',
        description: 'Get pipeline analytics and statistics',
        inputSchema: { type: 'object', properties: {}, required: [] }
      },
      {
        name: 'recipe_labs_send_slack',
        description: 'Send a message to the Recipe Labs Slack channel',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Message to send to Slack' }
          },
          required: ['message']
        }
      },
      {
        name: 'recipe_labs_create_lead',
        description: 'Create a new lead in the database',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Business or contact name' },
            company: { type: 'string', description: 'Company name' },
            email: { type: 'string', description: 'Email address' },
            phone: { type: 'string', description: 'Phone number' },
            category: { type: 'string', description: 'Business category' },
            city: { type: 'string', description: 'City location' }
          },
          required: ['name']
        }
      },
      {
        name: 'recipe_labs_chat',
        description: 'Chat with the AI agent for insights about leads and business data',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Question or query' }
          },
          required: ['message']
        }
      }
    ];
  }

  // Execute an MCP tool
  async executeTool(toolName: string, args: Record<string, any> = {}): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: args })
      });

      const data = await response.json();

      return {
        success: response.ok && !data.error,
        data: data.result || data.content || data,
        error: data.error,
        toolName,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send message to Slack
  async sendSlackMessage(message: string): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_send_slack', { message });
  }

  // Get leads from database
  async getLeads(filters: { category?: string; city?: string; status?: string; limit?: number } = {}): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_get_leads', filters);
  }

  // Get pipeline statistics
  async getPipelineStats(): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_pipeline_stats', {});
  }

  // Create a new lead
  async createLead(lead: LeadData): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_create_lead', lead);
  }

  // Chat with AI agent
  async chat(message: string): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_chat', { message });
  }

  // Check health
  async checkHealth(): Promise<MCPToolResult> {
    return this.executeTool('recipe_labs_health', {});
  }

  // Get connection status
  getStatus(): { connected: boolean; tools: MCPTool[]; baseUrl: string } {
    return {
      connected: this.isConnected,
      tools: this.tools,
      baseUrl: this.baseUrl
    };
  }

  // Get available tools
  getTools(): MCPTool[] {
    return this.tools;
  }
}

// Singleton instance
export const mcpClient = new MCPClient();

// Auto-connect on import
mcpClient.connect().then(result => {
  if (result.success) {
    console.log('[MCP] Connected to server with', result.tools.length, 'tools available');
  } else {
    console.warn('[MCP] Failed to connect to server');
  }
});

export default mcpClient;
