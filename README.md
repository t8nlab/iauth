# `@t8n/iauth`

Intelligent authentication extension for the **TitanPL framework**.

`@t8n/iauth` provides a **simple, synchronous authentication system** designed specifically for the **TitanPL Gravity Runtime**. It integrates password hashing, JWT authentication, OAuth login, and database-backed user management into a minimal API that works seamlessly with Titan actions.

The library follows Titan’s **sync-first architecture** and uses **Titan native APIs** wherever possible.

---

# Why This Exists

Authentication logic is one of the most repeated pieces of code in backend development.

In a typical Titan project, developers must manually implement:

* password hashing
* login validation
* JWT token generation
* token verification
* token extraction from request headers
* database user lookup
* protected route logic

This results in duplicated authentication logic across multiple projects.

`@t8n/iauth` provides a **single reusable authentication layer** so developers can focus on building application logic instead of repeatedly rebuilding authentication systems.

---

# Features

## Authentication

* Password hashing using **bcrypt**
* JWT token generation using **Titan native JWT**
* Token verification
* Automatic token extraction from request headers
* Protected route helper (`guard()`)

## Database Integration

* Built-in user lookup
* Built-in user creation
* Configurable identity field
* Configurable password column
* Automatic duplicate user prevention


## Titan Native Compatibility

The library is designed specifically for Titan:

* Titan JWT implementation
* Titan URL utilities
* Fully synchronous APIs
* Compatible with the Gravity runtime

---

# Installation

```bash
npm install @t8n/iauth
```

---

# Basic Setup

```javascript
import IAuth from "@t8n/iauth"

const auth = new IAuth({
  secret: "supersecret",

  db: {
    conn: db,
    table: "users"
  }
})
```

---

# Configuration Options

| Option             | Description                           |
| ------------------ | ------------------------------------- |
| `secret`           | JWT signing secret                    |
| `exp`              | Token expiration time                 |
| `db.conn`          | Database connection                   |
| `db.table`         | User table name                       |
| `db.identityField` | Identity column (default: `email`)    |
| `db.passwordField` | Password column (default: `password`) |
| `db.scope`         | Fields returned to client             |
| `beforeLogin`      | Hook executed before login            |
| `afterLogin`       | Hook executed after login             |

---

# Recommended Project Structure

For larger Titan applications, it is recommended to centralize authentication configuration in a dedicated folder.

```
app
 ├ actions
 │   ├ login.js
 │   ├ signup.js
 │   └ profile.js
 │
 ├ auth
 │   └ config.js
 │
 └ app.js
```

This allows all actions to reuse the same authentication instance.

---

# Auth Configuration File

Create a shared configuration file.

```
app/auth/config.js
```

Example:

```javascript
import IAuth from "@t8n/iauth"

export const auth = new IAuth({
  secret: t.env.AUTH_SECRET,

  db: {
    conn: db,
    table: "users",
    scope: ["id", "email"]
  },
})
```

Now the same authentication instance can be reused across all actions.

---

# Using Auth in Actions

Import the shared instance in any action.

Example:

```javascript
import { response } from "@titanpl/native"
import { auth } from "../auth/config"

export function profile(req) {

  const user = auth.guard(req)

  if (user.error) {
    return response.json({ error: "Unauthorized" })
  }

  return response.json({ user })
}
```

---

Example PostgreSQL table:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  password TEXT
);
```

---

# Signup Example

```javascript
import { auth } from "../auth/config"

export function signup(req) {

  const result = auth.signUp(req.body)

  return result
}
```

Response:

```json
{
  "user": {
    "id": 1,
    "email": "admin@test.com"
  },
  "token": "jwt-token"
}
```

---

# Login Example

```javascript
import { auth } from "../auth/config"

export function login(req) {

  const result = auth.signIn(req.body)

  return result
}
```

---

# Protected Route Example

```javascript
import { response } from "@titanpl/native"
import { auth } from "../auth/config"

export function profile(req) {

  const user = auth.guard(req)

  if (user.error) {
    return response.json({ error: "Unauthorized" })
  }

  return response.json({ user })
}
```

The `guard()` helper automatically:

1. Extracts the JWT token from the request
2. Verifies the token
3. Returns the authenticated user

---

# OAuth Login

OAuth allows users to login using external providers such as Google, GitHub, or Discord.

---

# JWT Token Structure

```json
{
  "id": 1,
  "email": "admin@test.com",
  "exp": 1773222105,
  "exp_readable": "2026-03-11T09:41:45.000Z"
}
```

`exp_readable` is automatically added for easier debugging.

---

# Internal Authentication Flow

## Signup

```
user submits email/password
        ↓
password hashed using bcrypt
        ↓
user stored in database
        ↓
JWT token generated
        ↓
user + token returned
```

## Login

```
identity lookup in database
        ↓
password verified using bcrypt
        ↓
JWT token created
        ↓
token returned
```

## Protected Route

```
request received
        ↓
Authorization header parsed
        ↓
JWT verified
        ↓
user returned
```

---

# API Reference

## Password Utilities

```javascript
auth.hashPassword(password)
auth.verifyPassword(password, hash)
```

## JWT

```javascript
auth.signToken(payload)
auth.verifyToken(token)
```

## Token Utilities

```javascript
auth.extractToken(req)
auth.getUser(req)
auth.guard(req)
```

## Authentication

```javascript
auth.signUp(data)
auth.signIn(data)
```

# Why This Makes Titan Development Easier

Without this extension, Titan developers would need to manually implement:

* password hashing
* JWT creation
* token validation
* database queries
* token parsing
* protected route checks

This logic would appear in **every project**.

With `@t8n/iauth`, authentication becomes:

```javascript
auth.signUp()
auth.signIn()
auth.guard()
```

This reduces boilerplate and keeps authentication consistent across Titan projects.

---

# Design Philosophy

The library follows Titan design principles:

* synchronous APIs
* minimal abstractions
* native Titan compatibility
* developer-controlled database
* lightweight architecture

`@t8n/iauth` is not a heavy framework. It is a **thin authentication layer designed specifically for Titan**.

---

# License

ISC