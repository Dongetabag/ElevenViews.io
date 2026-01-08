// Recipe Labs Agent API Service
// Integrates with the operational Recipe Labs Agent at http://72.61.72.94:5000

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://72.61.72.94:5000';

export interface AgentContext {
  currentPage?: string;
  activeTool?: string;
  selectedData?: any;
  userProfile?: {
    name: string;
    role: string;
    department: string;
    specialization: string;
  };
  workflowStatus?: any[];
  baserowData?: any[];
}

export interface AgentResponse {
  response: string;
  timestamp: string;
  originalMessage: string;
  source: 'n8n' | 'claude-cli' | 'google-ai' | 'error';
  responseTime: number;
}

export interface AgentService {
  chat(message: string, context: AgentContext): Promise<AgentResponse>;
  getHealth(): Promise<{ status: string; services: any }>;
  streamChat?(message: string, context: AgentContext): AsyncGenerator<AgentResponse>;
}

class RecipeLabsAgentService implements AgentService {
  private baseUrl: string;

  constructor(baseUrl: string = AGENT_API_URL) {
    this.baseUrl = baseUrl;
  }

  async getHealth(): Promise<{ status: string; services: any }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Agent health check failed:', error);
      throw error;
    }
  }

  async chat(message: string, context: AgentContext = {}): Promise<AgentResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent API error: ${response.statusText}`);
      }

      const data: AgentResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Agent chat failed:', error);
      throw error;
    }
  }

  async *streamChat(
    message: string,
    context: AgentContext = {}
  ): AsyncGenerator<AgentResponse> {
    // For now, return single response
    // Future: Implement streaming if backend supports it
    const response = await this.chat(message, context);
    yield response;
  }
}

export const agentService = new RecipeLabsAgentService();

