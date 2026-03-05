/**
 * @package @t8n/iauth
 * Intelligent authentication extension for the TitanPL framework.
 *
 * @description
 * `@t8n/iauth` provides a synchronous authentication system designed for the
 * TitanPL Gravity Runtime. It includes password hashing, JWT authentication,
 * OAuth login, and database-backed user management.
 *
 * Built for Titan’s synchronous execution model.
 */

export type OAuthProvider = "google" | "github" | "discord"

/**
 * OAuth provider configuration.
 */
export interface OAuthProviderConfig {

  /** OAuth client ID issued by the provider */
  clientId: string

  /** OAuth client secret issued by the provider */
  clientSecret: string

  /** OAuth redirect callback URL */
  redirect: string

  /**
   * Optional extra OAuth scopes.
   * These will be merged with provider defaults.
   */
  scope?: string
}

/**
 * Database configuration for authentication.
 */
export interface DatabaseConfig {

  /** Database connection instance */
  conn: any

  /** User table name */
  table: string

  /**
   * Column used for login identity.
   *
   * Default: `"email"`
   */
  identityField?: string

  /**
   * Password column name.
   *
   * Default: `"password"`
   */
  passwordField?: string

  /**
   * Fields returned to the client.
   *
   * Password is never included.
   */
  scope?: string[]
}

/**
 * Main authentication configuration.
 */
export interface AuthConfig {

  /** Secret used for signing JWT tokens */
  secret: string

  /**
   * JWT expiration time.
   *
   * Default: `"7d"`
   */
  exp?: string

  /** Database configuration */
  db?: DatabaseConfig

  /** OAuth providers configuration */
  oauth?: Partial<Record<OAuthProvider, OAuthProviderConfig>>

  /** Hook executed before login */
  beforeLogin?: (data: any) => void

  /** Hook executed after login */
  afterLogin?: (result: any) => void
}

/**
 * Titan request interface.
 */
export interface TitanRequest {

  headers?: Record<string, string>

  body?: any

  query?: Record<string, string>
}

/**
 * Successful authentication response.
 */
export interface AuthResult {

  user: any

  token: string
}

/**
 * Authentication error response.
 */
export interface AuthError {

  error: string
}

/**
 * OAuth login response containing redirect URL and state.
 */
export interface OAuthLoginResult {

  url: string

  state: string
}

/**
 * OAuth helper utilities.
 */
export interface OAuthHelper {

  /**
   * Generate OAuth login URL and CSRF state.
   */
  loginUrl(): OAuthLoginResult

  /**
   * Exchange OAuth authorization code for access token.
   *
   * @param code OAuth authorization code
   * @param state Returned state
   * @param expectedState Stored state for verification
   */
  exchange(code: string, state: string, expectedState: string): Promise<any>

  /**
   * Fetch OAuth user profile.
   *
   * @param token OAuth access token
   */
  profile(token: string): Promise<any>
}

/**
 * Main authentication class.
 */
declare class IAuth {

  constructor(config?: AuthConfig)

  /** Hash password using bcrypt */
  hashPassword(password: string): string

  /** Verify password against bcrypt hash */
  verifyPassword(password: string, hash: string): boolean

  /** Generate JWT token */
  signToken(payload: Record<string, any>): string

  /** Verify JWT token */
  verifyToken(token: string): Record<string, any> | null

  /** Extract token from Authorization header */
  extractToken(req: TitanRequest): string | null

  /** Get authenticated user from request */
  getUser(req: TitanRequest): Record<string, any> | null

  /** Protect route using JWT authentication */
  guard(req: TitanRequest): Record<string, any> | AuthError

  /** Find user in database by identity */
  findUser(identity: string): any | null

  /** Create a new user in database */
  createUser(data: Record<string, any>): any | null

  /** Register new user */
  signUp(data: Record<string, any>): AuthResult | AuthError

  /** Authenticate existing user */
  signIn(data: Record<string, any>): AuthResult | AuthError

  /**
   * Access OAuth provider utilities.
   *
   * @example
   * const google = auth.oauth("google")
   * const { url, state } = google.loginUrl()
   */
  oauth(provider: OAuthProvider): OAuthHelper
}

export default IAuth