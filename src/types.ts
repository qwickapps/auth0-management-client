/**
 * Type definitions for @qwickapps/auth0-management-client
 */

// ==================== Configuration ====================

/**
 * Client configuration
 */
export interface Auth0ManagementConfig {
  /** Auth0 tenant domain (e.g., 'tenant.auth0.com') */
  domain: string;
  /** M2M application client ID */
  clientId: string;
  /** M2M application client secret */
  clientSecret: string;
  /** Management API audience (defaults to https://{domain}/api/v2/) */
  audience?: string;
  /** Rate limit (requests per second). Defaults to 8 to stay under Auth0's 10 req/sec free tier limit */
  rateLimitPerSecond?: number;
}

/**
 * M2M token response
 */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// ==================== Applications ====================

export type AppType = 'spa' | 'native' | 'regular_web' | 'non_interactive';

/**
 * Auth0 Application (Client)
 */
export interface Auth0Application {
  client_id: string;
  name: string;
  app_type: AppType;
  description?: string;
  logo_uri?: string;
  callbacks?: string[];
  allowed_logout_urls?: string[];
  web_origins?: string[];
  allowed_origins?: string[];
  grant_types?: string[];
  client_secret?: string;
  jwt_configuration?: {
    alg?: string;
    lifetime_in_seconds?: number;
    secret_encoded?: boolean;
  };
  token_endpoint_auth_method?: string;
  is_first_party?: boolean;
  oidc_conformant?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create application request
 */
export interface CreateApplicationRequest {
  name: string;
  app_type: AppType;
  description?: string;
  logo_uri?: string;
  callbacks?: string[];
  allowed_logout_urls?: string[];
  web_origins?: string[];
  allowed_origins?: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: string;
  is_first_party?: boolean;
  oidc_conformant?: boolean;
}

/**
 * Update application request
 */
export interface UpdateApplicationRequest {
  name?: string;
  description?: string;
  logo_uri?: string;
  callbacks?: string[];
  allowed_logout_urls?: string[];
  web_origins?: string[];
  allowed_origins?: string[];
  grant_types?: string[];
  token_endpoint_auth_method?: string;
}

// ==================== Connections ====================

export type ConnectionStrategy =
  | 'auth0'
  | 'google-oauth2'
  | 'facebook'
  | 'twitter'
  | 'github'
  | 'linkedin'
  | 'apple'
  | 'microsoft'
  | 'samlp'
  | 'oidc'
  | 'waad'
  | 'ad'
  | 'email'
  | 'sms';

/**
 * Auth0 Connection
 */
export interface Auth0Connection {
  id: string;
  name: string;
  strategy: ConnectionStrategy | string;
  display_name?: string;
  enabled_clients?: string[];
  is_domain_connection?: boolean;
  realms?: string[];
  options?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create connection request
 */
export interface CreateConnectionRequest {
  name: string;
  strategy: ConnectionStrategy | string;
  display_name?: string;
  enabled_clients?: string[];
  is_domain_connection?: boolean;
  realms?: string[];
  options?: Record<string, unknown>;
}

/**
 * Update connection request
 */
export interface UpdateConnectionRequest {
  display_name?: string;
  enabled_clients?: string[];
  is_domain_connection?: boolean;
  realms?: string[];
  options?: Record<string, unknown>;
}

// ==================== Actions ====================

export type ActionTrigger =
  | 'post-login'
  | 'credentials-exchange'
  | 'pre-user-registration'
  | 'post-user-registration'
  | 'post-change-password'
  | 'send-phone-message';

export type ActionStatus = 'built' | 'building' | 'packaged' | 'pending' | 'failed';

/**
 * Auth0 Action
 */
export interface Auth0Action {
  id: string;
  name: string;
  supported_triggers: Array<{
    id: ActionTrigger | string;
    version: string;
  }>;
  code: string;
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  runtime: string;
  secrets?: Array<{
    name: string;
    value?: string;
    updated_at?: string;
  }>;
  deployed_version?: {
    id: string;
    deployed: boolean;
    number: number;
    built_at: string;
  };
  status?: ActionStatus;
  all_changes_deployed?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create action request
 */
export interface CreateActionRequest {
  name: string;
  supported_triggers: Array<{
    id: ActionTrigger | string;
    version: string;
  }>;
  code: string;
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  runtime?: string;
  secrets?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Update action request
 */
export interface UpdateActionRequest {
  name?: string;
  code?: string;
  dependencies?: Array<{
    name: string;
    version: string;
  }>;
  runtime?: string;
  secrets?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Trigger binding
 */
export interface TriggerBinding {
  id: string;
  trigger_id: string;
  action: {
    id: string;
    name: string;
  };
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Trigger binding update
 */
export interface TriggerBindingUpdate {
  ref: {
    type: 'action_id' | 'action_name' | 'binding_id';
    value: string;
  };
  display_name: string;
}

/**
 * Action deployment result
 */
export interface ActionDeployment {
  id: string;
  action_id: string;
  code: string;
  deployed: boolean;
  number: number;
  built_at: string;
  status: string;
}

// ==================== Resource Servers (APIs) ====================

/**
 * Auth0 Resource Server (API)
 */
export interface Auth0ResourceServer {
  id: string;
  name: string;
  identifier: string;
  is_system?: boolean;
  scopes?: Array<{
    value: string;
    description?: string;
  }>;
  signing_alg?: string;
  signing_secret?: string;
  allow_offline_access?: boolean;
  skip_consent_for_verifiable_first_party_clients?: boolean;
  token_lifetime?: number;
  token_lifetime_for_web?: number;
  enforce_policies?: boolean;
  token_dialect?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create resource server request
 */
export interface CreateResourceServerRequest {
  name: string;
  identifier: string;
  scopes?: Array<{
    value: string;
    description?: string;
  }>;
  signing_alg?: string;
  signing_secret?: string;
  allow_offline_access?: boolean;
  skip_consent_for_verifiable_first_party_clients?: boolean;
  token_lifetime?: number;
  token_lifetime_for_web?: number;
  enforce_policies?: boolean;
  token_dialect?: string;
}

/**
 * Update resource server request
 */
export interface UpdateResourceServerRequest {
  name?: string;
  scopes?: Array<{
    value: string;
    description?: string;
  }>;
  signing_alg?: string;
  signing_secret?: string;
  allow_offline_access?: boolean;
  skip_consent_for_verifiable_first_party_clients?: boolean;
  token_lifetime?: number;
  token_lifetime_for_web?: number;
  enforce_policies?: boolean;
  token_dialect?: string;
}

// ==================== Roles ====================

/**
 * Auth0 Role
 */
export interface Auth0Role {
  id: string;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Create role request
 */
export interface CreateRoleRequest {
  name: string;
  description?: string;
}

/**
 * Update role request
 */
export interface UpdateRoleRequest {
  name?: string;
  description?: string;
}

// ==================== Permissions ====================

/**
 * Permission definition
 */
export interface Auth0Permission {
  permission_name: string;
  description?: string;
  resource_server_identifier: string;
  resource_server_name?: string;
}

// ==================== API Response Wrappers ====================

export interface PaginatedResponse<T> {
  start: number;
  limit: number;
  total: number;
  items: T[];
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  errorCode?: string;
}
