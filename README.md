# project-oidc-mapping
A command line tool that helps you map 2 OIDC roles for each Ops Manager project:
- `<authPrefix>/read_<app>_<env>`->`read@bv<dbname>adm`
- `<authPrefix>/write_<app>_<env>`->`readWrite@bv<dbname>adm`

## Disclaimer
DISCLAIMER: THESE CODE SAMPLES ARE PROVIDED FOR EDUCATIONAL AND ILLUSTRATIVE PURPOSES ONLY,
TO DEMONSTRATE THE FUNCTIONALITY OF SPECIFIC MONGODB FEATURES.
THEY ARE NOT PRODUCTION-READY AND MAY LACK THE SECURITY HARDENING, ERROR HANDLING, AND TESTING REQUIRED FOR A LIVE ENVIRONMENT.
YOU ARE RESPONSIBLE FOR TESTING, VALIDATING, AND SECURING THIS CODE WITHIN YOUR OWN ENVIRONMENT BEFORE IMPLEMENTATION.
THIS MATERIAL IS PROVIDED "AS IS" WITHOUT WARRANTY OR LIABILITY.

## Prerequisites

- [Node.js](https://nodejs.org/) 24.14.1 (Defined in `.nvmrc`)
- Ops Manager Global API key, with `Global Automation Admin` role.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure credentials**
    1. For devlopment, copy `.env.example` to `.env` and fill in your keys:

      ```bash
      cp .env.example .env
      ```

      | Variable      | Description                                    |
      |---------------|------------------------------------------------|
      | `PUBLIC_KEY`  | Your API public key (Digest auth username)     |
      | `PRIVATE_KEY` | Your API private key (Digest auth password)    |

      > **Note:** `.env` is listed in `.gitignore` and will never be committed.
   2. For production, export environment variables before running the script:
      ```bash
      export PUBLIC_KEY=<public key>
      export PRIVATE_KEY=<private key>
      ```

## Usage

```
npm start <url>
```

| Argument | Description                                              |
|----------|----------------------------------------------------------|
| `url`    | The full URL of Ops Manager (**required**)                   |

### Examples

**GET request**

```bash
export PUBLIC_KEY=myPublicKey
export PRIVATE_KEY=myPrivateKey \
npm start https://example.com/
```