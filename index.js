import { jwt, url } from "@titanpl/native"
import "@titanpl/node/globals"
import bcrypt from "bcryptjs"

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

    this.secret = config.secret || process.env.AUTH_SECRET || "secret"
    this.exp = config.exp || "7d"

    this.conn = config.db?.conn || null
    this.table = config.db?.table || "users"

    this.identityField = config.db?.identityField || "email"
    this.passwordField = config.db?.passwordField || "password"

    this.beforeLogin = config.beforeLogin || null
    this.afterLogin = config.afterLogin || null

    this.oauthConfig = config.oauth || {}
  }

  /* ---------- PASSWORD ---------- */

  hashPassword(password) {
    const salt = bcrypt.genSaltSync(12)
    return bcrypt.hashSync(password, salt)
  }

  verifyPassword(password, hash) {
    return bcrypt.compareSync(password, hash)
  }

  /* ---------- JWT ---------- */

  signToken(payload) {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.exp
    })
  }

  verifyToken(token) {

    try {

      const decoded = jwt.verify(token, this.secret)

      if (decoded.exp) {
        decoded.exp_readable = new Date(decoded.exp * 1000).toISOString()
      }

      return decoded

    } catch {
      return null
    }
  }

  /* ---------- TOKEN ---------- */

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

  /* ---------- DATABASE ---------- */

  findUser(identity) {

    if (!this.conn) return null

    const sql = `
      SELECT * FROM ${this.table}
      WHERE ${this.identityField} = ?
      LIMIT 1
    `

    const result = drift(this.conn.query(sql, [identity]))

    return result?.[0] || null
  }

  createUser(data) {

    if (!this.conn) return null

    const sql = `
      INSERT INTO ${this.table}
      (${this.identityField}, ${this.passwordField})
      VALUES (?, ?)
    `

    drift(this.conn.query(sql, [
      data[this.identityField],
      data[this.passwordField]
    ]))

    return this.findUser(data[this.identityField])
  }

  /* ---------- AUTH ---------- */

  signUp(data) {

    const identity = data[this.identityField]
    const password = data[this.passwordField]

    const hash = this.hashPassword(password)

    const user = this.createUser({
      [this.identityField]: identity,
      [this.passwordField]: hash
    })

    if (!user) {
      return { error: "User creation failed" }
    }

    const token = this.signToken({
      id: user.id,
      [this.identityField]: user[this.identityField]
    })

    return { user, token }
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

    const result = { user, token }

    if (this.afterLogin) this.afterLogin(result)

    return result
  }

  /* ---------- OAUTH ---------- */

  oauth(provider) {

    const cfg = this.oauthConfig[provider]

    if (!cfg) {
      throw new Error(`OAuth provider not configured: ${provider}`)
    }

    const base = oauthProviders[provider]

    return {

      loginUrl: () => {

        const params = new url.SearchParams({
          client_id: cfg.clientId,
          redirect_uri: cfg.redirect,
          response_type: "code",
          scope: base.scope
        })

        return base.auth + "?" + params.toString()
      },

      exchange: async (code) => {

        const res = await fetch(base.token, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: cfg.clientId,
            client_secret: cfg.clientSecret,
            code,
            redirect_uri: cfg.redirect,
            grant_type: "authorization_code"
          })
        })

        return res.json()
      },

      profile: async (token) => {

        const res = await fetch(base.user, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })

        return res.json()
      }

    }
  }

}

export default IAuth