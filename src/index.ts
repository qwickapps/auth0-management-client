/**
 * @qwickapps/auth0-management-client
 *
 * Auth0 Management API client for QwickApps.
 * Shared between Anvil CLI and server-side applications.
 *
 * Features:
 * - M2M token acquisition with automatic caching and refresh
 * - Full Auth0 Management API coverage:
 *   - Applications (Clients)
 *   - Connections
 *   - Actions & Triggers
 *   - Resource Servers (APIs)
 *   - Roles & Permissions
 * - Rate limiting awareness with retry logic
 * - No server/framework dependencies
 *
 * @example
 * ```typescript
 * import { Auth0ManagementClient } from '@qwickapps/auth0-management-client';
 *
 * const client = new Auth0ManagementClient({
 *   domain: 'tenant.auth0.com',
 *   clientId: 'xxx',
 *   clientSecret: 'xxx',
 * });
 *
 * // Test connection
 * const result = await client.testConnection();
 *
 * // List applications
 * const apps = await client.listApplications();
 *
 * // Create a SPA application
 * const app = await client.createApplication({
 *   name: 'My SPA',
 *   app_type: 'spa',
 *   callbacks: ['http://localhost:3000/callback'],
 * });
 * ```
 */

// Export main client
export { Auth0ManagementClient } from './client.js';

// Export all types
export type {
  // Configuration
  Auth0ManagementConfig,
  TokenResponse,

  // Applications
  AppType,
  Auth0Application,
  CreateApplicationRequest,
  UpdateApplicationRequest,

  // Connections
  ConnectionStrategy,
  Auth0Connection,
  CreateConnectionRequest,
  UpdateConnectionRequest,

  // Actions
  ActionTrigger,
  ActionStatus,
  Auth0Action,
  CreateActionRequest,
  UpdateActionRequest,
  TriggerBinding,
  TriggerBindingUpdate,
  ActionDeployment,

  // Resource Servers
  Auth0ResourceServer,
  CreateResourceServerRequest,
  UpdateResourceServerRequest,

  // Roles
  Auth0Role,
  CreateRoleRequest,
  UpdateRoleRequest,
  Auth0Permission,

  // API Response
  PaginatedResponse,
  ApiError,
} from './types.js';
