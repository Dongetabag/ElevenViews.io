// Baserow Data Service
// Manages Baserow database integration and data sync

const BASEROW_API_URL = import.meta.env.VITE_BASEROW_API_URL || 'https://api.baserow.io/api';
const BASEROW_API_KEY = import.meta.env.VITE_BASEROW_API_KEY || '';
const BASEROW_TABLE_ID = import.meta.env.VITE_BASEROW_TABLE_ID || '789729';

export interface BaserowRecord {
  id: number;
  [key: string]: any;
}

export interface BaserowTable {
  id: string;
  name: string;
  description?: string;
  fields: BaserowField[];
}

export interface BaserowField {
  id: string;
  name: string;
  type: string;
  required?: boolean;
}

export interface Filter {
  field: string;
  operator: 'equal' | 'not_equal' | 'contains' | 'not_contains' | 'greater_than' | 'less_than';
  value: any;
}

class BaserowService {
  private baseUrl: string;
  private apiKey: string;
  private cache: Map<string, { data: BaserowRecord[]; timestamp: number }> = new Map();
  private cacheTTL = 30000; // 30 seconds

  constructor(baseUrl: string = BASEROW_API_URL, apiKey: string = BASEROW_API_KEY) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.apiKey}`,
    };
  }

  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    return Date.now() - cached.timestamp < this.cacheTTL;
  }

  async syncTable(tableId: string): Promise<BaserowRecord[]> {
    const cacheKey = `table-${tableId}`;
    
    // Return cached data if valid
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      if (!this.baseUrl || !this.apiKey) {
        // Return mock data for development
        return this.getMockData(tableId);
      }

      const response = await fetch(`${this.baseUrl}/database/rows/table/${tableId}/`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Baserow API error: ${response.statusText}`);
      }

      const data = await response.json();
      const records = data.results || [];

      // Update cache
      this.cache.set(cacheKey, {
        data: records,
        timestamp: Date.now(),
      });

      return records;
    } catch (error) {
      console.error('Failed to sync table:', error);
      // Return mock data on error
      return this.getMockData(tableId);
    }
  }

  private getMockData(tableId: string): BaserowRecord[] {
    const mockData: Record<string, BaserowRecord[]> = {
      'leads': [
        { id: 1, name: 'Acme Corp', email: 'contact@acme.com', status: 'new', created: '2026-01-01' },
        { id: 2, name: 'TechStart Inc', email: 'hello@techstart.com', status: 'qualified', created: '2026-01-02' },
      ],
      'recipes': [
        { id: 1, name: 'Lead Enrichment Workflow', status: 'active', success_rate: 95 },
        { id: 2, name: 'Email Automation', status: 'active', success_rate: 98 },
      ],
    };

    return mockData[tableId] || [];
  }

  async createRecord(tableId: string, data: any): Promise<BaserowRecord> {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return { id: Date.now(), ...data };
      }

      const response = await fetch(`${this.baseUrl}/database/rows/table/${tableId}/`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to create record: ${response.statusText}`);
      }

      const record = await response.json();
      
      // Invalidate cache
      this.cache.delete(`table-${tableId}`);

      return record;
    } catch (error) {
      console.error('Failed to create record:', error);
      throw error;
    }
  }

  async updateRecord(tableId: string, recordId: number, data: any): Promise<BaserowRecord> {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return { id: recordId, ...data };
      }

      const response = await fetch(`${this.baseUrl}/database/rows/table/${tableId}/${recordId}/`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to update record: ${response.statusText}`);
      }

      const record = await response.json();
      
      // Invalidate cache
      this.cache.delete(`table-${tableId}`);

      return record;
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  }

  async deleteRecord(tableId: string, recordId: number): Promise<void> {
    try {
      if (!this.baseUrl || !this.apiKey) {
        return;
      }

      const response = await fetch(`${this.baseUrl}/database/rows/table/${tableId}/${recordId}/`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete record: ${response.statusText}`);
      }

      // Invalidate cache
      this.cache.delete(`table-${tableId}`);
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  }

  async queryRecords(tableId: string, filters: Filter[] = []): Promise<BaserowRecord[]> {
    try {
      const records = await this.syncTable(tableId);
      
      // Apply filters
      if (filters.length === 0) {
        return records;
      }

      return records.filter(record => {
        return filters.every(filter => {
          const value = record[filter.field];
          switch (filter.operator) {
            case 'equal':
              return value === filter.value;
            case 'not_equal':
              return value !== filter.value;
            case 'contains':
              return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'not_contains':
              return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
            case 'greater_than':
              return Number(value) > Number(filter.value);
            case 'less_than':
              return Number(value) < Number(filter.value);
            default:
              return true;
          }
        });
      });
    } catch (error) {
      console.error('Failed to query records:', error);
      return [];
    }
  }

  clearCache(tableId?: string): void {
    if (tableId) {
      this.cache.delete(`table-${tableId}`);
    } else {
      this.cache.clear();
    }
  }
}

export const baserowService = new BaserowService();

