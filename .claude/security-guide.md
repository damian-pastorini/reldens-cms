# Security Guide

## Authentication

**Role-based admin access:**
- Admin panel protected by authentication middleware
- Session-based authentication
- Configurable admin role ID
- Custom authentication callbacks supported

## Password Encryption

**Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2)
- Iterations: 100,000
- Key Length: 64 bytes
- Digest: SHA-512
- Salt Length: 32 bytes (randomly generated)
- Storage Format: `salt:hash` (192 characters total)

**Automatic Password Encryption:**
- Event-driven encryption on save
- Enabled by default via `PasswordEncryptionHandler`
- Can be disabled with `enablePasswordEncryption: false` in Manager config

See `.claude/password-management-guide.md` for comprehensive password management documentation.

## CSRF Protection

**Session-based CSRF tokens:**
- CSRF tokens generated per session
- Validated on form submissions
- Integrated with Express session middleware

## File Upload Validation

**MIME type checking:**
- Validates file MIME types against allowed types
- Extension whitelist validation
- Configurable allowed extensions per field

**Upload field configuration:**
- `allowedTypes`: Must be a STRING ('image', 'audio', 'text'), NOT an array
- `bucket`: Relative path from projectRoot
- `bucketPath`: URL path for display

## Entity Access Control

**Public/private entity rules:**
- Configured via `entities_access` table
- Per-entity operation rules (read, write, update, delete)
- Public entities accessible without authentication
- Private entities require authentication

## Honeypot Protection

**Bot detection in forms:**
- Hidden honeypot fields in dynamic forms
- Submission rejected if honeypot field is filled
- Transparent to legitimate users

## Rate Limiting

**Via @reldens/server-utils:**
- Configurable rate limits per endpoint
- IP-based rate limiting
- Prevents brute force attacks

## XSS Protection

**Input sanitization:**
- Via @reldens/server-utils
- HTML entity encoding
- Script tag removal
- Event handler attribute removal

## SQL Injection Prevention

**Via Prisma ORM:**
- Parameterized queries
- No raw SQL execution
- Type-safe query building

## Path Validation

**File path security:**
- Path traversal prevention
- Restricted file access
- Validated upload paths

## CSP Headers

**Content Security Policy via Helmet:**
- Configurable CSP directives
- Script source restrictions
- Style source restrictions

## HTTPS Support

**SSL/TLS configuration:**
- HTTPS server support
- Configurable SSL certificates
- Automatic HTTP to HTTPS redirect
