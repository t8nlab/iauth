# @t8n/iauth

Intelligent authentication extension for the **TitanPL framework**.

`@t8n/iauth` provides a **simple, synchronous authentication system** designed specifically for the **TitanPL Gravity Runtime**. It integrates password hashing, JWT authentication, OAuth login, and database-backed user management into a minimal API that works seamlessly with Titan actions.

The library follows Titan’s **sync-first architecture** and uses Titan native APIs wherever possible.

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
* OAuth login flows

This results in duplicated authentication logic across multiple projects.

`@t8n/iauth` provides a **single reusable authentication layer** so developers can focus on building application logic instead of repeatedly rebuilding authentication systems.

---

# Features

## Authentication

* Password hashing using **bcryptjs**
* JWT token generation using **Titan native JWT**
* Token verification
* Automatic token extraction from request headers
* Protected route helper (`guard`)

## Database Integration

* Built-in user lookup
* Built-in user creation
* Configurable identity field
* Configurable password column

## OAuth Login

Supports OAuth login providers:

* Google
* GitHub
* Discord

Developers can integrate OAuth authentication in only a few lines of code.

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
| `beforeLogin`      | Hook executed before login            |
| `afterLogin`       | Hook executed after login             |
| `oauth`            | OAuth provider configuration          |

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
  secret: "supersecret",

  db: {
    conn: db,
    table: "users"
  },

  oauth: {
    google: {
      clientId: t.env.GOOGLE_CLIENT_ID,
      clientSecret: t.env.GOOGLE_CLIENT_SECRET,
      redirect: "http://localhost:5100/user"
    }
  }
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

# Example Database Table

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE,
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

# OAuth Configuration

```javascript
const auth = new IAuth({
  secret: "supersecret",

  oauth: {
    google: {
      clientId: "GOOGLE_CLIENT_ID",
      clientSecret: "GOOGLE_CLIENT_SECRET",
      redirect: "http://localhost:5100/user"
    }
  }
})
```

---

# OAuth Login Route

```javascript
import { response } from "@titanpl/native"
import { auth } from "../auth/config"

export function login() {

  const google = auth.oauth("google")

  return response.redirect(google.loginUrl())

}
```

Example route:

```
GET /lg
```

The user is redirected to the OAuth provider.

---

# OAuth Callback Example

```javascript
import { response } from "@titanpl/native"
import { auth } from "../auth/config"

export async function getuser(req) {

  const google = auth.oauth("google")

  const { code } = req.query

  const tokenData = await google.exchange(code)

  const profile = await google.profile(tokenData.access_token)

  const token = auth.signToken({
    email: profile.email
  })

  return response.json({
    message: "OAuth login successful",
    token,
    user: profile
  })
}
```

---

# Route Configuration

OAuth routes must be defined manually in your Titan router.

Example `app.js`:

```javascript
import t from "@titanpl/route"

t.get("/lg").action("login")
t.get("/user").action("getuser")

t.get("/").reply("Ready to land on Titan Planet 🚀")

t.start(5100, "Titan Running!")
```

Routes:

```
GET /lg
```

Redirects the user to the OAuth provider.

```
GET /user
```

Handles the OAuth callback.

---

# OAuth Flow

```
GET /lg
     ↓
Redirect to Google
     ↓
User logs in
     ↓
Google redirects back
     ↓
GET /user?code=xxxxx
     ↓
Code exchanged for access token
     ↓
User profile retrieved
     ↓
JWT session created
```

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
email lookup in database
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

## OAuth

```javascript
auth.oauth("google")
auth.oauth("github")
auth.oauth("discord")
```

---

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

# Future Features

Planned improvements include:

* Role-based authorization
* Refresh tokens
* Session-based authentication
* Password reset flows
* Email verification
* Login rate limiting
* OAuth auto-routing

---

# License

ISC
