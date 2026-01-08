// Eleven Views Leads API Service
// Connects to the live database via the Eleven Views Agent API

const AGENT_API_URL = import.meta.env.VITE_AGENT_API_URL || 'http://72.61.72.94:5000';
const MCP_URL = import.meta.env.VITE_MCP_URL || 'https://mcp.srv1167160.hstgr.cloud';

export interface LeadFromAPI {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  city?: string;
  category?: string;
  status: 'new' | 'contacted' | 'qualified' | 'won' | 'lost';
  score: number;
  value?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineStats {
  total_leads: number;
  by_status: {
    new: number;
    contacted: number;
    qualified: number;
    won?: number;
    lost?: number;
  };
  by_category: Record<string, number>;
  by_city: Record<string, number>;
  score_distribution: {
    hot_8_plus: number;
    warm_5_to_7: number;
    cold_below_5: number;
  };
}

export interface HealthStatus {
  status: string;
  services: {
    claude: string;
    n8n: string;
    googleAI: string;
    baserow: string;
    supabase: string;
    hubspot: string;
  };
  database: {
    leadgen: {
      totalLeads: number;
      byStatus: Record<string, number>;
    };
  };
}

class LeadsApiService {
  private agentUrl: string;
  private mcpUrl: string;

  constructor() {
    this.agentUrl = AGENT_API_URL;
    this.mcpUrl = MCP_URL;
  }

  // Get health status from the API
  async getHealth(): Promise<HealthStatus> {
    try {
      const response = await fetch(`${this.agentUrl}/health`);
      if (!response.ok) throw new Error('Health check failed');
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  // Get leads from the live database via MCP
  async getLeads(filters?: {
    category?: string;
    city?: string;
    status?: string;
    score_min?: number;
    limit?: number;
  }): Promise<LeadFromAPI[]> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_get_leads',
          arguments: filters || { limit: 50 }
        })
      });

      if (!response.ok) throw new Error('Failed to fetch leads');

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (content) {
        const parsed = JSON.parse(content);
        return parsed.leads || [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch leads:', error);
      return [];
    }
  }

  // Get pipeline statistics
  async getPipelineStats(): Promise<PipelineStats | null> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_pipeline_stats',
          arguments: {}
        })
      });

      if (!response.ok) throw new Error('Failed to fetch stats');

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (content) {
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch pipeline stats:', error);
      return null;
    }
  }

  // Create a new lead
  async createLead(lead: Partial<LeadFromAPI>): Promise<LeadFromAPI | null> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_create_lead',
          arguments: {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            category: lead.category,
            city: lead.city
          }
        })
      });

      if (!response.ok) throw new Error('Failed to create lead');

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (content) {
        return JSON.parse(content);
      }
      return null;
    } catch (error) {
      console.error('Failed to create lead:', error);
      return null;
    }
  }

  // Update an existing lead
  async updateLead(id: string, updates: Partial<LeadFromAPI>): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_update_lead',
          arguments: { id, ...updates }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to update lead:', error);
      return false;
    }
  }

  // Delete a lead
  async deleteLead(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_delete_lead',
          arguments: { id }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to delete lead:', error);
      return false;
    }
  }

  // Chat with the AI agent
  async chat(message: string, context?: any): Promise<string> {
    try {
      const response = await fetch(`${this.agentUrl}/api/v1/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context })
      });

      if (!response.ok) throw new Error('Chat failed');

      const data = await response.json();
      return data.response || 'No response';
    } catch (error) {
      console.error('Chat failed:', error);
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  // Send a Slack notification
  async sendSlackNotification(message: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mcpUrl}/mcp/tools/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'recipe_labs_send_slack',
          arguments: { message }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }
}

export const leadsApiService = new LeadsApiService();
