# project-oidc-mapping

A command-line REST API client that authenticates using **HTTP Digest Authentication**.  
It accepts a target URL as a CLI argument and reads credentials from environment variables.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure credentials**

   Copy `.env.example` to `.env` and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   | Variable      | Description                                    |
   |---------------|------------------------------------------------|
   | `PUBLIC_KEY`  | Your API public key (Digest auth username)     |
   | `PRIVATE_KEY` | Your API private key (Digest auth password)    |

   > **Note:** `.env` is listed in `.gitignore` and will never be committed.

---

## Usage

```
node src/client.js <url> [method] [body]
```

| Argument | Description                                              |
|----------|----------------------------------------------------------|
| `url`    | The full URL to request (**required**)                   |
| `method` | HTTP method: `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (default: `GET`) |
| `body`   | JSON string body for `POST`/`PUT`/`PATCH` requests       |

### Examples

**GET request**

```bash
PUBLIC_KEY=myPublicKey PRIVATE_KEY=myPrivateKey \
  node src/client.js https://example.com/api/resource
```

**POST request with a JSON body**

```bash
PUBLIC_KEY=myPublicKey PRIVATE_KEY=myPrivateKey \
  node src/client.js https://example.com/api/resource POST '{"key":"value"}'
```

**Using a `.env` file (with [dotenv CLI](https://github.com/motdotla/dotenv))**

```bash
npx dotenv -e .env -- node src/client.js https://example.com/api/resource
```

**Show help**

```bash
node src/client.js --help
```

---

## How it works

1. An initial unauthenticated request is sent to the server.
2. The server responds with `401 Unauthorized` and a `WWW-Authenticate: Digest ...` header.
3. The client computes the digest response using `PUBLIC_KEY` (username), `PRIVATE_KEY` (password), and the server-supplied challenge fields (`realm`, `nonce`, `qop`, etc.).
4. A second request is sent with the computed `Authorization` header.

The digest computation supports both `MD5` and `SHA-256` algorithms and both `qop=auth` and no-qop challenge modes.
