import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Auth0ManagementClient } from '../src/client.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Auth0ManagementClient', () => {
  const config = {
    domain: 'test.auth0.com',
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
  };

  let client: Auth0ManagementClient;

  beforeEach(() => {
    client = new Auth0ManagementClient(config);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==================== Token Management ====================

  describe('getAccessToken', () => {
    it('should fetch and return access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      const token = await client.getAccessToken();

      expect(token).toBe('test-token');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.auth0.com/oauth/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'client_credentials',
            client_id: 'test-client-id',
            client_secret: 'test-client-secret',
            audience: 'https://test.auth0.com/api/v2/',
          }),
        })
      );
    });

    it('should cache token and reuse on subsequent calls', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      await client.getAccessToken();
      await client.getAccessToken();
      await client.getAccessToken();

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on failed authentication', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(client.getAccessToken()).rejects.toThrow(
        'Failed to get access token: 401 Unauthorized'
      );
    });
  });

  describe('testConnection', () => {
    it('should return success when connection works', async () => {
      // Token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });

      // List applications request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await client.testConnection();

      expect(result).toEqual({ success: true });
    });

    it('should return error when connection fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid credentials',
      });

      const result = await client.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid credentials');
    });
  });

  // ==================== Applications API ====================

  describe('Applications', () => {
    beforeEach(() => {
      // Mock token request
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should list applications', async () => {
      const mockApps = [
        { client_id: 'app1', name: 'App 1', app_type: 'spa' },
        { client_id: 'app2', name: 'App 2', app_type: 'non_interactive' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApps,
      });

      const apps = await client.listApplications();

      expect(apps).toEqual(mockApps);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://test.auth0.com/api/v2/clients',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );
    });

    it('should create application', async () => {
      const newApp = {
        name: 'Test SPA',
        app_type: 'spa' as const,
        callbacks: ['http://localhost:3000/callback'],
      };

      const createdApp = { client_id: 'new-client-id', ...newApp };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdApp,
      });

      const result = await client.createApplication(newApp);

      expect(result).toEqual(createdApp);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://test.auth0.com/api/v2/clients',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(newApp),
        })
      );
    });

    it('should update application', async () => {
      const update = { name: 'Updated Name' };
      const updatedApp = { client_id: 'app1', name: 'Updated Name', app_type: 'spa' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedApp,
      });

      const result = await client.updateApplication('app1', update);

      expect(result).toEqual(updatedApp);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://test.auth0.com/api/v2/clients/app1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(update),
        })
      );
    });

    it('should delete application', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => undefined,
      });

      await expect(client.deleteApplication('app1')).resolves.toBeUndefined();
    });

    it('should find application by name', async () => {
      const mockApps = [
        { client_id: 'app1', name: 'App 1', app_type: 'spa' },
        { client_id: 'app2', name: 'Target App', app_type: 'spa' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApps,
      });

      const app = await client.findApplicationByName('Target App');

      expect(app?.client_id).toBe('app2');
    });
  });

  // ==================== Connections API ====================

  describe('Connections', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should list connections', async () => {
      const mockConns = [
        { id: 'con1', name: 'google-oauth2', strategy: 'google-oauth2' },
        { id: 'con2', name: 'Username-Password', strategy: 'auth0' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockConns,
      });

      const conns = await client.listConnections();

      expect(conns).toEqual(mockConns);
    });

    it('should create connection', async () => {
      const newConn = {
        name: 'github',
        strategy: 'github' as const,
        enabled_clients: ['app1'],
      };

      const createdConn = { id: 'con-new', ...newConn };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdConn,
      });

      const result = await client.createConnection(newConn);

      expect(result).toEqual(createdConn);
    });

    it('should update connection', async () => {
      const update = { enabled_clients: ['app1', 'app2'] };
      const updatedConn = { id: 'con1', name: 'google-oauth2', strategy: 'google-oauth2', ...update };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => updatedConn,
      });

      const result = await client.updateConnection('con1', update);

      expect(result).toEqual(updatedConn);
    });
  });

  // ==================== Actions API ====================

  describe('Actions', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should list actions', async () => {
      const mockActions = [
        { id: 'act1', name: 'Action 1', supported_triggers: [{ id: 'post-login', version: 'v3' }], code: '', runtime: 'node18' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ actions: mockActions }),
      });

      const actions = await client.listActions();

      expect(actions).toEqual(mockActions);
    });

    it('should create action', async () => {
      const newAction = {
        name: 'Test Action',
        supported_triggers: [{ id: 'post-login' as const, version: 'v3' }],
        code: 'exports.onExecutePostLogin = async (event, api) => {};',
        runtime: 'node18',
      };

      const createdAction = { id: 'act-new', ...newAction };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdAction,
      });

      const result = await client.createAction(newAction);

      expect(result).toEqual(createdAction);
    });

    it('should deploy action', async () => {
      const deployment = {
        id: 'dep1',
        action_id: 'act1',
        code: '',
        deployed: true,
        number: 1,
        built_at: '2025-01-01T00:00:00Z',
        status: 'built',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => deployment,
      });

      const result = await client.deployAction('act1');

      expect(result).toEqual(deployment);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://test.auth0.com/api/v2/actions/actions/act1/deploy',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should get trigger bindings', async () => {
      const mockBindings = [
        { id: 'bind1', trigger_id: 'post-login', action: { id: 'act1', name: 'Action 1' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bindings: mockBindings }),
      });

      const bindings = await client.getTriggerBindings('post-login');

      expect(bindings).toEqual(mockBindings);
    });

    it('should update trigger bindings', async () => {
      const newBindings = [
        { ref: { type: 'action_id' as const, value: 'act1' }, display_name: 'Action 1' },
      ];

      const updatedBindings = [
        { id: 'bind1', trigger_id: 'post-login', action: { id: 'act1', name: 'Action 1' } },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bindings: updatedBindings }),
      });

      const result = await client.updateTriggerBindings('post-login', newBindings);

      expect(result).toEqual(updatedBindings);
    });
  });

  // ==================== Resource Servers API ====================

  describe('Resource Servers', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should list resource servers', async () => {
      const mockServers = [
        { id: 'rs1', name: 'My API', identifier: 'https://api.example.com' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockServers,
      });

      const servers = await client.listResourceServers();

      expect(servers).toEqual(mockServers);
    });

    it('should create resource server', async () => {
      const newServer = {
        name: 'New API',
        identifier: 'https://newapi.example.com',
        scopes: [{ value: 'read:data', description: 'Read data' }],
      };

      const createdServer = { id: 'rs-new', ...newServer };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdServer,
      });

      const result = await client.createResourceServer(newServer);

      expect(result).toEqual(createdServer);
    });

    it('should find resource server by identifier', async () => {
      const mockServers = [
        { id: 'rs1', name: 'API 1', identifier: 'https://api1.example.com' },
        { id: 'rs2', name: 'Target API', identifier: 'https://target.example.com' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockServers,
      });

      const server = await client.findResourceServerByIdentifier('https://target.example.com');

      expect(server?.id).toBe('rs2');
    });
  });

  // ==================== Roles API ====================

  describe('Roles', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should list roles', async () => {
      const mockRoles = [
        { id: 'role1', name: 'admin', description: 'Administrator' },
        { id: 'role2', name: 'user', description: 'Regular user' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockRoles,
      });

      const roles = await client.listRoles();

      expect(roles).toEqual(mockRoles);
    });

    it('should create role', async () => {
      const newRole = { name: 'editor', description: 'Content editor' };
      const createdRole = { id: 'role-new', ...newRole };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdRole,
      });

      const result = await client.createRole(newRole);

      expect(result).toEqual(createdRole);
    });

    it('should add permissions to role', async () => {
      const permissions = [
        { resource_server_identifier: 'https://api.example.com', permission_name: 'read:data' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => undefined,
      });

      await expect(client.addRolePermissions('role1', permissions)).resolves.toBeUndefined();
    });
  });

  // ==================== Rate Limiting ====================

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 86400,
        }),
      });
    });

    it('should retry on 429 rate limit', async () => {
      // First call returns 429
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Map([['retry-after', '1']]),
      });

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const apps = await client.listApplications();

      expect(apps).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(3); // token + 429 + retry
    }, 10000);
  });
});
