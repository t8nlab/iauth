import { jwt } from "@titanpl/native"
import "@titanpl/node/globals"
import bcrypt from "bcryptjs"
import { registerExtension } from "./utils/registerExtension"



class IAuth {

  constructor(config = {}) {

    this.secret = config.secret || t.env.AUTH_SECRET
    if (!this.secret) throw new Error("AUTH_SECRET must be defined")

    this.exp = config.exp || "7d"

    this.conn = config.db?.conn
    this.table = config.db?.table || "users"

    this.identityField = config.db?.identityField || "email"
    this.passwordField = config.db?.passwordField || "password"

    this.scope = config.db?.scope || ["id", this.identityField]
    this.columns = [...new Set([...this.scope, this.passwordField])]

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

    const user = this.createUser({
      ...data,
      [this.passwordField]: hash
    })

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

    return {
      user: this.sanitizeUser(user),
      token
    }
  }

}

registerExtension("auth", IAuth)

export default IAuth