# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-12-12

### Added

- Initial release of @qwickapps/auth0-management-client
- Auth0 Management API client with M2M token caching
- Full CRUD operations for:
  - Applications (Clients)
  - Connections
  - Actions & Triggers
  - Resource Servers (APIs)
  - Roles & Permissions
- Rate limit handling with automatic retry
- TypeScript types for all Auth0 resources
- Utility methods: `findByName`, `findByIdentifier`, etc.

### Features

- `Auth0ManagementClient` class with all Management API methods
- Token caching with automatic refresh (5-minute buffer)
- Rate limit awareness (429 status) with exponential backoff
- `testConnection()` method for connection verification
