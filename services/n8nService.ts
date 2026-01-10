// n8n Workflow Service
// Manages n8n workflow discovery, execution, and monitoring

const N8N_API_URL = import.meta.env.VITE_N8N_API_URL || 'https://n8n.srv1167160.hstgr.cloud';
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY || '';

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  parameters: WorkflowParameter[];
  status: 'active' | 'inactive' | 'error';
  lastExecution?: ExecutionResult;
  webhookUrl?: string;
}

export interface WorkflowParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  default?: any;
}

export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  finishedAt?: string;
  data?: any;
  error?: string;
}

export interface WorkflowStatus {
  workflowId: string;
  isRunning: boolean;
  lastExecution?: ExecutionResult;
  nextRun?: string;
}

class N8NService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string = N8N_API_URL, apiKey: string = N8N_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-N8N-API-KEY'] = this.apiKey;
    }

    return headers;
  }

  async listWorkflows(): Promise<Workflow[]> {
    try {
      return [
        {
          id: 'eleven-views-agent-chat',
          name: 'Eleven Views Agent Chat',
          description: 'AI agent workflow for Eleven Views operations',
          category: 'AI',
          parameters: [],
          status: 'active',
          webhookUrl: `${this.baseUrl}/webhook/eleven-views-agent-chat`,
        },
        {
          id: 'lead-enrichment',
          name: 'Lead Enrichment',
          description: 'Enriches leads with company and contact data',
          category: 'Data',
          parameters: [
            {
              name: 'leadId',
              type: 'string',
              required: true,
              description: 'Baserow lead ID',
            },
          ],
          status: 'active',
        },
        {
          id: 'recipe-creation',
          name: 'Recipe Creation',
          description: 'Creates and tests new recipes',
          category: 'Automation',
          parameters: [
            {
              name: 'recipeRequest',
              type: 'object',
              required: true,
              description: 'Recipe request data',
            },
          ],
          status: 'active',
        },
      ];
    } catch (error) {
      console.error('Failed to list workflows:', error);
      return [];
    }
  }

  async executeWorkflow(
    workflowId: string,
    parameters: Record<string, any> = {}
  ): Promise<ExecutionResult> {
    try {
      // For webhook-based workflows
      if (workflowId === 'eleven-views-agent-chat') {
        const webhookUrl = `${this.baseUrl}/webhook/${workflowId}`;
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: parameters,
          }),
        });

        const data = await response.json();
        return {
          executionId: `exec-${Date.now()}`,
          status: response.ok ? 'success' : 'error',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          data,
          error: response.ok ? undefined : 'Workflow execution failed',
        };
      }

      // For API-based workflows (when credentials available)
      if (this.apiKey) {
        const response = await fetch(`${this.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(parameters),
        });

        const data = await response.json();
        return {
          executionId: data.executionId || `exec-${Date.now()}`,
          status: data.status || 'success',
          startedAt: data.startedAt || new Date().toISOString(),
          finishedAt: data.finishedAt,
          data: data.data,
          error: data.error,
        };
      }

      throw new Error('Workflow execution not configured');
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw error;
    }
  }

  async getWorkflowStatus(workflowId: string): Promise<WorkflowStatus> {
    try {
      return {
        workflowId,
        isRunning: false,
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error);
      throw error;
    }
  }

  async getExecutionLogs(executionId: string): Promise<any[]> {
    try {
      return [];
    } catch (error) {
      console.error('Failed to get execution logs:', error);
      throw error;
    }
  }
}

export const n8nService = new N8NService();

