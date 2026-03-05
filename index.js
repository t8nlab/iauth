import { jwt, url, crypto, fetch } from "@titanpl/native"
import "@titanpl/node/globals"
import bcrypt from "bcryptjs"
import { registerExtension } from "./utils/registerExtension"

const oauthProviders = {
  google: {
    auth: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    user: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile"
  },
  github: {
    auth: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    user: "https://api.github.com/user",
    scope: "read:user user:email"
  },
  discord: {
    auth: "https://discord.com/api/oauth2/authorize",
    token: "https://discord.com/api/oauth2/token",
    user: "https://discord.com/api/users/@me",
    scope: "identify email"
  }
}

class IAuth {

  constructor(config = {}) {

    this.secret = config.secret || process.env.AUTH_SECRET
    if (!this.secret) throw new Error("AUTH_SECRET must be defined")

    this.exp = config.exp || "7d"

    this.conn = config.db?.conn
    this.table = config.db?.table || "users"

    this.identityField = config.db?.identityField || "email"
    this.passwordField = config.db?.passwordField || "password"

    this.scope = config.db?.scope || ["id", this.identityField]
    this.columns = [...new Set([...this.scope, this.passwordField])]

    this.beforeLogin = config.beforeLogin || null
    this.afterLogin = config.afterLogin || null

    this.oauthConfig = config.oauth || {}

    this.validateIdentifier(this.table)
    this.validateIdentifier(this.identityField)
    this.validateIdentifier(this.passwordField)
  }

  validateIdentifier(value) {
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      throw new Error(`Invalid SQL identifier: ${value}`)
    }
  }

  hashPassword(password) {
    const salt = bcrypt.genSaltSync(12)
    return bcrypt.hashSync(password, salt)
  }

  verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash)
  }

  signToken(payload) {
    return jwt.sign(payload, this.secret, { expiresIn: this.exp })
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret)
    } catch {
      return null
    }
  }

  extractToken(req) {

    const header = req.headers?.authorization
    if (!header) return null

    if (header.startsWith("Bearer ")) {
      return header.slice(7)
    }

    return header
  }

  getUser(req) {

    const token = this.extractToken(req)
    if (!token) return null

    return this.verifyToken(token)
  }

  guard(req) {

    const user = this.getUser(req)

    if (!user) {
      return { error: "Unauthorized" }
    }

    return user
  }

  sanitizeUser(user) {

    if (!user) return null

    const safe = {}

    for (const field of this.scope) {
      if (user[field] !== undefined) {
        safe[field] = user[field]
      }
    }

    return safe
  }

  normalizeResult(result) {
    return result?.rows || result
  }

  findUser(identity) {

    if (!this.conn) return null

    const sql = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.table}
      WHERE ${this.identityField} = $1
      LIMIT 1
    `

    const result = drift(this.conn.query(sql, [identity]))
    const rows = this.normalizeResult(result)

    return rows?.[0] || null
  }

  createUser(data) {

    if (!this.conn) return null

    const fields = Object.keys(data)
    const placeholders = fields.map((_, i) => `$${i + 1}`)

    const sql = `
      INSERT INTO ${this.table}
      (${fields.join(", ")})
      VALUES (${placeholders.join(", ")})
      RETURNING *
    `

    const values = fields.map(f => data[f])

    const result = drift(this.conn.query(sql, values))
    const rows = this.normalizeResult(result)

    return rows?.[0] || null
  }

  signUp(data) {

    const identity = data[this.identityField]
    const password = data[this.passwordField]

    if (!identity || !password) {
      return { error: "Identity and password required" }
    }

    const existing = this.findUser(identity)
    if (existing) {
      return { error: "User already exists" }
    }

    const hash = this.hashPassword(password)

    const userData = {
      ...data,
      [this.passwordField]: hash
    }

    const user = this.createUser(userData)

    if (!user) {
      return { error: "User creation failed" }
    }

    const token = this.signToken({
      id: user.id,
      [this.identityField]: user[this.identityField]
    })

    return {
      user: this.sanitizeUser(user),
      token
    }
  }

  signIn(data) {

    const identity = data[this.identityField]
    const password = data[this.passwordField]

    if (this.beforeLogin) this.beforeLogin(data)

    const user = this.findUser(identity)

    if (!user) {
      return { error: "User not found" }
    }

    const valid = this.verifyPassword(password, user[this.passwordField])

    if (!valid) {
      return { error: "Invalid credentials" }
    }

    const token = this.signToken({
      id: user.id,
      [this.identityField]: user[this.identityField]
    })

    const result = {
      user: this.sanitizeUser(user),
      token
    }

    if (this.afterLogin) this.afterLogin(result)

    return result
  }

  oauth(provider) {

    const cfg = this.oauthConfig[provider]
    if (!cfg) throw new Error(`OAuth provider not configured: ${provider}`)

    const base = oauthProviders[provider]

    return {

      loginUrl: () => {

        const state = crypto.uuid()

        const scope = cfg.scope
          ? [...new Set((base.scope + " " + cfg.scope).split(" "))].join(" ")
          : base.scope

        const params = new url.SearchParams({
          client_id: cfg.clientId,
          redirect_uri: cfg.redirect,
          response_type: "code",
          scope,
          state
        })

        return {
          url: base.auth + "?" + params.toString(),
          state
        }
      },

      exchange: (code, state, expectedState) => {

        if (state !== expectedState) {
          throw new Error("OAuth state mismatch (CSRF protection)")
        }

        const params = new url.SearchParams({
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
          code,
          redirect_uri: cfg.redirect,
          grant_type: "authorization_code"
        })

        const res = drift(
          fetch(base.token, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params.toString()
          })
        )

        const body = typeof res === "string" ? res : res.body
        return JSON.parse(body)
      },

      profile: (token) => {

        const res = drift(
          fetch(base.user, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        )

        const body = typeof res === "string" ? res : res.body
        return JSON.parse(body)
      }

    }
  }

}

registerExtension("auth", IAuth)

export default IAuth