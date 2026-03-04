/**
 * @package @t8n/iauth
 * Intelligent authentication extension for the TitanPL framework.
 *
 * @description
 * `@t8n/iauth` provides a synchronous authentication system designed for the
 * TitanPL Gravity Runtime. It includes password hashing, JWT authentication,
 * OAuth login, and database-backed user management.
 *
 * This library follows Titan's sync-first architecture and integrates with
 * Titan native APIs.
 *
 * @example
 * import IAuth from "@t8n/iauth"
 *
 * const auth = new IAuth({
 *   secret: "supersecret",
 *   db: {
 *     conn: db,
 *     table: "users"
 *   }
 * })
 */

export type OAuthProvider = "google" | "github" | "discord"

/**
 * OAuth provider configuration.
 */
export interface OAuthProviderConfig {

  /**
   * OAuth client ID issued by the provider.
   */
  clientId: string

  /**
   * OAuth client secret issued by the provider.
   */
  clientSecret: string

  /**
   * Redirect URL for OAuth callback.
   */
  redirect: string
}

/**
 * Database configuration used by the authentication system.
 */
export interface DatabaseConfig {

  /**
   * Database connection instance.
   */
  conn: any

  /**
   * User table name.
   */
  table: string

  /**
   * Identity column used for login.
   *
   * Default: `email`
   */
  identityField?: string

  /**
   * Password column name.
   *
   * Default: `password`
   */
  passwordField?: string
}

/**
 * Authentication configuration options.
 */
export interface AuthConfig {

  /**
   * Secret key used to sign JWT tokens.
   */
  secret: string

  /**
   * JWT token expiration time.
   *
   * Default: `"7d"`
   */
  exp?: string

  /**
   * Database configuration.
   */
  db?: DatabaseConfig

  /**
   * OAuth provider configuration.
   */
  oauth?: Record<OAuthProvider, OAuthProviderConfig>

  /**
   * Hook executed before login validation.
   */
  beforeLogin?: (data: any) => void

  /**
   * Hook executed after successful login.
   */
  afterLogin?: (result: any) => void
}

/**
 * Titan request object.
 */
export interface TitanRequest {

  /**
   * Request headers.
   */
  headers?: Record<string, string>

  /**
   * Request body.
   */
  body?: any

  /**
   * URL query parameters.
   */
  query?: Record<string, string>
}

/**
 * Successful authentication result.
 */
export interface AuthResult {

  /**
   * Authenticated user object.
   */
  user: any

  /**
   * Generated JWT token.
   */
  token: string
}

/**
 * Authentication error response.
 */
export interface AuthError {

  /**
   * Error message.
   */
  error: string
}

/**
 * OAuth helper utilities returned by `auth.oauth()`.
 */
export interface OAuthHelper {

  /**
   * Generate the OAuth login redirect URL.
   */
  loginUrl(): string

  /**
   * Exchange OAuth authorization code for access token.
   *
   * @param code Authorization code returned by the provider
   */
  exchange(code: string): Promise<any>

  /**
   * Fetch OAuth user profile using access token.
   *
   * @param token OAuth access token
   */
  profile(token: string): Promise<any>
}

/**
 * Main authentication class for TitanPL applications.
 *
 * Provides password authentication, JWT sessions, OAuth login,
 * and protected route helpers.
 */
declare class IAuth {

  /**
   * Create a new authentication instance.
   *
   * @param config Authentication configuration
   */
  constructor(config?: AuthConfig)

  /**
   * Hash a plaintext password using bcrypt.
   *
   * @param password Plaintext password
   * @returns Hashed password
   */
  hashPassword(password: string): string

  /**
   * Verify a plaintext password against a stored bcrypt hash.
   *
   * @param password Plaintext password
   * @param hash Stored password hash
   */
  verifyPassword(password: string, hash: string): boolean

  /**
   * Generate a signed JWT token.
   *
   * @param payload JWT payload
   */
  signToken(payload: Record<string, any>): string

  /**
   * Verify a JWT token.
   *
   * @param token JWT token
   */
  verifyToken(token: string): Record<string, any> | null

  /**
   * Extract JWT token from Authorization header.
   *
   * Supports Bearer tokens.
   *
   * @param req Titan request
   */
  extractToken(req: TitanRequest): string | null

  /**
   * Get authenticated user from request token.
   *
   * @param req Titan request
   */
  getUser(req: TitanRequest): Record<string, any> | null

  /**
   * Protect a route using JWT authentication.
   *
   * @param req Titan request
   */
  guard(req: TitanRequest): Record<string, any> | AuthError

  /**
   * Find a user in the database by identity field.
   *
   * @param identity Identity value (email/username)
   */
  findUser(identity: string): any | null

  /**
   * Create a new user in the configured database.
   *
   * @param data User data
   */
  createUser(data: Record<string, any>): any | null

  /**
   * Register a new user.
   *
   * Automatically hashes password and generates JWT token.
   *
   * @param data User credentials
   */
  signUp(data: Record<string, any>): AuthResult | AuthError

  /**
   * Authenticate an existing user.
   *
   * @param data Login credentials
   */
  signIn(data: Record<string, any>): AuthResult | AuthError

  /**
   * Access OAuth provider utilities.
   *
   * @param provider OAuth provider name
   *
   * @example
   * const google = auth.oauth("google")
   * const url = google.loginUrl()
   */
  oauth(provider: OAuthProvider): OAuthHelper
}

export default IAuth