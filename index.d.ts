/**
 * @package @t8n/iauth
 * Intelligent authentication extension for the TitanPL framework.
 *
 * @description
 * `@t8n/iauth` provides a synchronous authentication system designed for the
 * TitanPL Gravity Runtime. It includes password hashing, JWT authentication,
 * Database-backed user management.
 *
 * Built for Titan’s synchronous execution model.
 */

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

}

export default IAuth