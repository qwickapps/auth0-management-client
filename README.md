# @qwickapps/auth0-management-client

Auth0 Management API client for QwickApps. A pure TypeScript client with no server dependencies, suitable for use in both CLI tools and server-side applications.

## Features

- M2M token acquisition with automatic caching and refresh
- Full Auth0 Management API coverage:
  - Applications (Clients)
  - Connections
  - Actions & Triggers
  - Resource Servers (APIs)
  - Roles & Permissions
- **Built-in rate limiting** - Automatically throttles requests to stay under Auth0's limits (default: 8 req/sec)
- Rate limit retry logic - Automatically retries on 429 responses
- TypeScript types for all Auth0 resources

## Installation

```bash
pnpm add @qwickapps/auth0-management-client
```

## Usage

### Basic Setup

```typescript
import { Auth0ManagementClient } from '@qwickapps/auth0-management-client';

const client = new Auth0ManagementClient({
  domain: 'your-tenant.auth0.com',
  clientId: 'your-m2m-client-id',
  clientSecret: 'your-m2m-client-secret',
  rateLimitPerSecond: 8, // Optional: defaults to 8 (under Auth0's 10 req/sec free tier limit)
});
```

### Test Connection

```typescript
const result = await client.testConnection();
if (result.success) {
  console.log('Connected to Auth0');
} else {
  console.error('Connection failed:', result.error);
}
```

### Applications

```typescript
// List all applications
const apps = await client.listApplications();

// Find by name
const app = await client.findApplicationByName('My App');

// Create a SPA application
const newApp = await client.createApplication({
  name: 'My SPA',
  app_type: 'spa',
  callbacks: ['http://localhost:3000/callback'],
  allowed_logout_urls: ['http://localhost:3000'],
  web_origins: ['http://localhost:3000'],
});

// Update application
await client.updateApplication(app.client_id, {
  callbacks: ['http://localhost:3000/callback', 'https://app.example.com/callback'],
});

// Delete application
await client.deleteApplication(app.client_id);
```

### Connections

```typescript
// List connections
const connections = await client.listConnections();

// Create social connection
const conn = await client.createConnection({
  name: 'google-oauth2',
  strategy: 'google-oauth2',
  enabled_clients: [app.client_id],
});

// Update connection
await client.updateConnection(conn.id, {
  enabled_clients: [app.client_id, anotherApp.client_id],
});
```

### Actions

```typescript
// List actions
const actions = await client.listActions();

// Create action
const action = await client.createAction({
  name: 'Post-Login Handler',
  supported_triggers: [{ id: 'post-login', version: 'v3' }],
  code: `exports.onExecutePostLogin = async (event, api) => {
    // Your action code
  };`,
  runtime: 'node18',
  secrets: [
    { name: 'API_KEY', value: 'secret-value' },
  ],
});

// Deploy action
await client.deployAction(action.id);

// Get trigger bindings
const bindings = await client.getTriggerBindings('post-login');

// Bind action to trigger
await client.updateTriggerBindings('post-login', [
  { ref: { type: 'action_id', value: action.id }, display_name: 'My Action' },
]);
```

> **Note on TypeScript Actions**: When using Anvil CLI to deploy TypeScript actions (`anvil auth0 action deploy`), the code is compiled and **fully bundled** using esbuild. All dependencies are inlined into a single file. This means you can import any npm package in your action code, but be aware that the entire dependency tree is bundled. Auth0's built-in modules (`auth0`, `axios`, etc.) are also bundled rather than using Auth0's provided versions.

### Resource Servers (APIs)

```typescript
// List APIs
const apis = await client.listResourceServers();

// Create API
const api = await client.createResourceServer({
  name: 'My API',
  identifier: 'https://api.example.com',
  scopes: [
    { value: 'read:users', description: 'Read user data' },
    { value: 'write:users', description: 'Modify user data' },
  ],
});
```

### Roles

```typescript
// List roles
const roles = await client.listRoles();

// Create role
const role = await client.createRole({
  name: 'admin',
  description: 'Administrator role',
});

// Add permissions to role
await client.addRolePermissions(role.id, [
  { resource_server_identifier: 'https://api.example.com', permission_name: 'read:users' },
]);
```

## Required M2M Scopes

Your M2M application needs the following scopes:

- `read:clients`, `create:clients`, `update:clients`, `delete:clients`
- `read:connections`, `create:connections`, `update:connections`, `delete:connections`
- `read:actions`, `create:actions`, `update:actions`, `delete:actions`
- `read:resource_servers`, `create:resource_servers`, `update:resource_servers`, `delete:resource_servers`
- `read:roles`, `create:roles`, `update:roles`, `delete:roles`

## API Reference

### Auth0ManagementClient

#### Constructor

```typescript
new Auth0ManagementClient(config: Auth0ManagementConfig)
```

#### Methods

| Method | Description |
|--------|-------------|
| `getAccessToken()` | Get cached access token |
| `testConnection()` | Test connection to Auth0 |
| `listApplications()` | List all applications |
| `createApplication()` | Create new application |
| `updateApplication()` | Update application |
| `deleteApplication()` | Delete application |
| `findApplicationByName()` | Find app by name |
| `listConnections()` | List all connections |
| `createConnection()` | Create new connection |
| `updateConnection()` | Update connection |
| `deleteConnection()` | Delete connection |
| `findConnectionByName()` | Find connection by name |
| `listActions()` | List all actions |
| `createAction()` | Create new action |
| `updateAction()` | Update action |
| `deleteAction()` | Delete action |
| `deployAction()` | Deploy action |
| `findActionByName()` | Find action by name |
| `getTriggerBindings()` | Get trigger bindings |
| `updateTriggerBindings()` | Update trigger bindings |
| `listResourceServers()` | List all APIs |
| `createResourceServer()` | Create new API |
| `updateResourceServer()` | Update API |
| `deleteResourceServer()` | Delete API |
| `findResourceServerByIdentifier()` | Find API by identifier |
| `listRoles()` | List all roles |
| `createRole()` | Create new role |
| `updateRole()` | Update role |
| `deleteRole()` | Delete role |
| `findRoleByName()` | Find role by name |
| `getRolePermissions()` | Get role permissions |
| `addRolePermissions()` | Add permissions to role |
| `removeRolePermissions()` | Remove permissions from role |

## License

This package is licensed under the [PolyForm Shield License 1.0.0](https://polyformproject.org/licenses/shield/1.0.0/).

- Free to use for non-competitive purposes
- Cannot be used to compete with QwickApps

See [LICENSE](./LICENSE) for full terms.

Copyright (c) 2025 QwickApps. All rights reserved.
