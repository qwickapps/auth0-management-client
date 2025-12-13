/**
 * Auth0 Management API Client
 *
 * Handles M2M authentication and base API calls to Auth0 Management API.
 * Extracted from @qwickapps/server-auth0-management and extended.
 */

import type {
  Auth0ManagementConfig,
  TokenResponse,
  Auth0Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,
  Auth0Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,
  Auth0Action,
  CreateActionRequest,
  UpdateActionRequest,
  TriggerBinding,
  TriggerBindingUpdate,
  ActionDeployment,
  Auth0ResourceServer,
  CreateResourceServerRequest,
  UpdateResourceServerRequest,
  Auth0Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  Auth0Permission,
} from './types.js';

const DEFAULT_RETRY_DELAY = 1000;
const MAX_RETRIES = 3;
const DEFAULT_RATE_LIMIT = 8; // Stay under Auth0's 10 req/sec free tier limit

/**
 * Auth0 Management API Client
 *
 * Provides methods for interacting with all Auth0 Management API endpoints.
 * Handles token caching, rate limiting, and retries.
 */
export class Auth0ManagementClient {
  private domain: string;
  private clientId: string;
  private clientSecret: string;
  private audience: string;

  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Rate limiting
  private rateLimitPerSecond: number;
  private requestTimestamps: number[] = [];

  constructor(config: Auth0ManagementConfig) {
    this.domain = config.domain;
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.audience = config.audience || `https://${config.domain}/api/v2/`;
    this.rateLimitPerSecond = config.rateLimitPerSecond ?? DEFAULT_RATE_LIMIT;
  }

  // ==================== Token Management ====================

  /**
   * Get access token (cached with auto-refresh)
   */
  async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    // Request new token
    const response = await fetch(`https://${this.domain}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        audience: this.audience,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${response.status} ${error}`);
    }

    const data = (await response.json()) as TokenResponse;
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + data.expires_in * 1000;

    return this.accessToken;
  }

  /**
   * Test the connection to Auth0
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getAccessToken();
      // Try to list clients to verify permissions
      await this.listApplications();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get the current domain
   */
  getDomain(): string {
    return this.domain;
  }

  // ==================== Base Request Methods ====================

  /**
   * Make an authenticated API request with retry logic
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retries = MAX_RETRIES
  ): Promise<T> {
    // Wait for rate limit before making request
    await this.waitForRateLimit();

    const token = await this.getAccessToken();
    const url = `https://${this.domain}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle rate limiting
    if (response.status === 429 && retries > 0) {
      const retryAfter = parseInt(response.headers.get('retry-after') || '1', 10);
      await this.sleep(retryAfter * 1000 || DEFAULT_RETRY_DELAY);
      return this.request<T>(method, path, body, retries - 1);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Auth0 API error: ${response.status} ${error}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait if necessary to respect rate limit
   */
  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - 1000; // 1 second window

    // Remove timestamps older than 1 second
    this.requestTimestamps = this.requestTimestamps.filter(t => t > windowStart);

    // If we've hit the limit, wait until the oldest request falls out of the window
    if (this.requestTimestamps.length >= this.rateLimitPerSecond) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = oldestTimestamp - windowStart + 10; // +10ms buffer
      if (waitTime > 0) {
        await this.sleep(waitTime);
      }
      // Clean up again after waiting
      this.requestTimestamps = this.requestTimestamps.filter(t => t > Date.now() - 1000);
    }

    // Record this request
    this.requestTimestamps.push(Date.now());
  }

  // ==================== Applications API ====================

  /**
   * List all applications (clients)
   */
  async listApplications(options?: { page?: number; per_page?: number }): Promise<Auth0Application[]> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.per_page !== undefined) params.set('per_page', String(options.per_page));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Auth0Application[]>('GET', `/api/v2/clients${query}`);
  }

  /**
   * Get an application by client ID
   */
  async getApplication(clientId: string): Promise<Auth0Application> {
    return this.request<Auth0Application>('GET', `/api/v2/clients/${clientId}`);
  }

  /**
   * Create a new application
   */
  async createApplication(app: CreateApplicationRequest): Promise<Auth0Application> {
    return this.request<Auth0Application>('POST', '/api/v2/clients', app);
  }

  /**
   * Update an application
   */
  async updateApplication(clientId: string, update: UpdateApplicationRequest): Promise<Auth0Application> {
    return this.request<Auth0Application>('PATCH', `/api/v2/clients/${clientId}`, update);
  }

  /**
   * Delete an application
   */
  async deleteApplication(clientId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/clients/${clientId}`);
  }

  /**
   * Find application by name
   */
  async findApplicationByName(name: string): Promise<Auth0Application | undefined> {
    const apps = await this.listApplications();
    return apps.find(app => app.name === name);
  }

  // ==================== Connections API ====================

  /**
   * List all connections
   */
  async listConnections(options?: { strategy?: string; page?: number; per_page?: number }): Promise<Auth0Connection[]> {
    const params = new URLSearchParams();
    if (options?.strategy) params.set('strategy', options.strategy);
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.per_page !== undefined) params.set('per_page', String(options.per_page));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Auth0Connection[]>('GET', `/api/v2/connections${query}`);
  }

  /**
   * Get a connection by ID
   */
  async getConnection(connectionId: string): Promise<Auth0Connection> {
    return this.request<Auth0Connection>('GET', `/api/v2/connections/${connectionId}`);
  }

  /**
   * Create a new connection
   */
  async createConnection(conn: CreateConnectionRequest): Promise<Auth0Connection> {
    return this.request<Auth0Connection>('POST', '/api/v2/connections', conn);
  }

  /**
   * Update a connection
   */
  async updateConnection(connectionId: string, update: UpdateConnectionRequest): Promise<Auth0Connection> {
    return this.request<Auth0Connection>('PATCH', `/api/v2/connections/${connectionId}`, update);
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/connections/${connectionId}`);
  }

  /**
   * Find connection by name
   */
  async findConnectionByName(name: string): Promise<Auth0Connection | undefined> {
    const connections = await this.listConnections();
    return connections.find(conn => conn.name === name);
  }

  // ==================== Actions API ====================

  /**
   * List all actions
   */
  async listActions(options?: { triggerId?: string; deployed?: boolean }): Promise<Auth0Action[]> {
    const params = new URLSearchParams();
    if (options?.triggerId) params.set('triggerId', options.triggerId);
    if (options?.deployed !== undefined) params.set('deployed', String(options.deployed));

    const query = params.toString() ? `?${params.toString()}` : '';
    const result = await this.request<{ actions: Auth0Action[] }>('GET', `/api/v2/actions/actions${query}`);
    return result.actions;
  }

  /**
   * Get an action by ID
   */
  async getAction(actionId: string): Promise<Auth0Action> {
    return this.request<Auth0Action>('GET', `/api/v2/actions/actions/${actionId}`);
  }

  /**
   * Create a new action
   */
  async createAction(action: CreateActionRequest): Promise<Auth0Action> {
    return this.request<Auth0Action>('POST', '/api/v2/actions/actions', action);
  }

  /**
   * Update an existing action
   */
  async updateAction(actionId: string, update: UpdateActionRequest): Promise<Auth0Action> {
    return this.request<Auth0Action>('PATCH', `/api/v2/actions/actions/${actionId}`, update);
  }

  /**
   * Delete an action
   */
  async deleteAction(actionId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/actions/actions/${actionId}`);
  }

  /**
   * Deploy an action
   */
  async deployAction(actionId: string): Promise<ActionDeployment> {
    return this.request<ActionDeployment>('POST', `/api/v2/actions/actions/${actionId}/deploy`);
  }

  /**
   * Find action by name
   */
  async findActionByName(name: string): Promise<Auth0Action | undefined> {
    const actions = await this.listActions();
    return actions.find(action => action.name === name);
  }

  // ==================== Triggers API ====================

  /**
   * Get trigger bindings
   */
  async getTriggerBindings(triggerId: string): Promise<TriggerBinding[]> {
    const result = await this.request<{ bindings: TriggerBinding[] }>(
      'GET',
      `/api/v2/actions/triggers/${triggerId}/bindings`
    );
    return result.bindings;
  }

  /**
   * Update trigger bindings
   */
  async updateTriggerBindings(triggerId: string, bindings: TriggerBindingUpdate[]): Promise<TriggerBinding[]> {
    const result = await this.request<{ bindings: TriggerBinding[] }>(
      'PATCH',
      `/api/v2/actions/triggers/${triggerId}/bindings`,
      { bindings }
    );
    return result.bindings;
  }

  // ==================== Resource Servers (APIs) ====================

  /**
   * List all resource servers
   */
  async listResourceServers(options?: { page?: number; per_page?: number }): Promise<Auth0ResourceServer[]> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.per_page !== undefined) params.set('per_page', String(options.per_page));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Auth0ResourceServer[]>('GET', `/api/v2/resource-servers${query}`);
  }

  /**
   * Get a resource server by ID
   */
  async getResourceServer(resourceServerId: string): Promise<Auth0ResourceServer> {
    return this.request<Auth0ResourceServer>('GET', `/api/v2/resource-servers/${resourceServerId}`);
  }

  /**
   * Create a new resource server
   */
  async createResourceServer(api: CreateResourceServerRequest): Promise<Auth0ResourceServer> {
    return this.request<Auth0ResourceServer>('POST', '/api/v2/resource-servers', api);
  }

  /**
   * Update a resource server
   */
  async updateResourceServer(resourceServerId: string, update: UpdateResourceServerRequest): Promise<Auth0ResourceServer> {
    return this.request<Auth0ResourceServer>('PATCH', `/api/v2/resource-servers/${resourceServerId}`, update);
  }

  /**
   * Delete a resource server
   */
  async deleteResourceServer(resourceServerId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/resource-servers/${resourceServerId}`);
  }

  /**
   * Find resource server by identifier
   */
  async findResourceServerByIdentifier(identifier: string): Promise<Auth0ResourceServer | undefined> {
    const servers = await this.listResourceServers();
    return servers.find(server => server.identifier === identifier);
  }

  // ==================== Roles API ====================

  /**
   * List all roles
   */
  async listRoles(options?: { page?: number; per_page?: number }): Promise<Auth0Role[]> {
    const params = new URLSearchParams();
    if (options?.page !== undefined) params.set('page', String(options.page));
    if (options?.per_page !== undefined) params.set('per_page', String(options.per_page));

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Auth0Role[]>('GET', `/api/v2/roles${query}`);
  }

  /**
   * Get a role by ID
   */
  async getRole(roleId: string): Promise<Auth0Role> {
    return this.request<Auth0Role>('GET', `/api/v2/roles/${roleId}`);
  }

  /**
   * Create a new role
   */
  async createRole(role: CreateRoleRequest): Promise<Auth0Role> {
    return this.request<Auth0Role>('POST', '/api/v2/roles', role);
  }

  /**
   * Update a role
   */
  async updateRole(roleId: string, update: UpdateRoleRequest): Promise<Auth0Role> {
    return this.request<Auth0Role>('PATCH', `/api/v2/roles/${roleId}`, update);
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/roles/${roleId}`);
  }

  /**
   * Find role by name
   */
  async findRoleByName(name: string): Promise<Auth0Role | undefined> {
    const roles = await this.listRoles();
    return roles.find(role => role.name === name);
  }

  /**
   * Get permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Auth0Permission[]> {
    return this.request<Auth0Permission[]>('GET', `/api/v2/roles/${roleId}/permissions`);
  }

  /**
   * Add permissions to a role
   */
  async addRolePermissions(roleId: string, permissions: Array<{ resource_server_identifier: string; permission_name: string }>): Promise<void> {
    await this.request<void>('POST', `/api/v2/roles/${roleId}/permissions`, { permissions });
  }

  /**
   * Remove permissions from a role
   */
  async removeRolePermissions(roleId: string, permissions: Array<{ resource_server_identifier: string; permission_name: string }>): Promise<void> {
    await this.request<void>('DELETE', `/api/v2/roles/${roleId}/permissions`, { permissions });
  }
}
