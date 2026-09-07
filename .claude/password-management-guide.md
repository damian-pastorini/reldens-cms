# Password Management Guide

**Package**: @reldens/cms
**Feature**: User Password Management and Encryption
**Version**: 0.48.0+

## Overview

The CMS provides comprehensive password management features to ensure secure handling of user passwords. This guide covers password encryption, updating passwords, and best practices for password security.

## Password Encryption

### How It Works

User passwords are encrypted using PBKDF2 (Password-Based Key Derivation Function 2) with:
- **Iterations**: 100,000
- **Key Length**: 64 bytes
- **Digest**: SHA-512
- **Salt Length**: 32 bytes (randomly generated per password)

The encrypted password is stored in the format: `salt:hash` where both salt and hash are hex-encoded.

### Automatic Encryption

The CMS includes a `PasswordEncryptionHandler` that automatically encrypts passwords when saving user records through the admin panel.

**How It Works**:
1. Listens to the `reldens.adminBeforeEntitySave` event
2. Detects when the `users` entity is being saved
3. Checks if the `password` field is being modified
4. Verifies the password is not already encrypted
5. Encrypts the password using `Encryptor.encryptPassword()`
6. Updates the request body with the encrypted password

**Enabled by Default**: The password encryption handler is enabled by default in the Manager configuration.

**To Disable** (not recommended):
```javascript
const manager = new Manager({
    enablePasswordEncryption: false,  // Disables automatic password encryption
    // ... other config
});
```

### Manual Encryption

To manually encrypt a password in your code:

```javascript
const { Encryptor } = require('@reldens/server-utils');

let plainPassword = 'mySecurePassword123';
let encryptedPassword = Encryptor.encryptPassword(plainPassword);
// Returns: '64char-salt:128char-hash'
```

### Password Validation

During authentication, passwords are validated using:

```javascript
const { Encryptor } = require('@reldens/server-utils');

let plainPassword = 'userProvidedPassword';
let storedPassword = '64char-salt:128char-hash';
let isValid = Encryptor.validatePassword(plainPassword, storedPassword);
// Returns: true or false
```

## Updating User Passwords

### Method 1: CLI Command (Recommended)

The CMS provides a dedicated CLI command for updating user passwords:

#### Basic Usage

```bash
# Update by email (will prompt for password)
npx reldens-cms-update-password --email=admin@example.com

# Update by username (will prompt for password)
npx reldens-cms-update-password --username=admin

# Update with password in command (less secure, not recommended)
npx reldens-cms-update-password --email=admin@example.com --password=newPassword123
```

#### CLI Options

- `--email=[email]` - User email address
- `--username=[username]` - User username
- `--password=[password]` - New password (prompted if not provided)
- `--help` or `-h` - Show help message

#### Requirements

- Either `--email` or `--username` must be provided
- CMS must be installed (install.lock file must exist)
- Entities must be generated for the configured driver

#### How It Works

The CLI tool is **driver-agnostic** and works with any storage driver:
1. Reads `RELDENS_STORAGE_DRIVER` from .env (defaults to 'mikro-orm')
2. Uses `EntitiesLoader` to load entities for the detected driver
3. If driver is 'prisma', automatically loads the Prisma modules from `./prisma/client` using the adapter from `RELDENS_PRISMA_ADAPTER` / `RELDENS_PRISMA_ADAPTER_CLASS`
4. Initializes Manager and dataServer with the correct driver
5. Updates password using the driver's entity repository

#### Security Notes

- **Interactive Mode** (no --password flag): Most secure, passwords are not stored in command history
- **Command-Line Mode** (with --password flag): Less secure, password appears in shell history

### Method 2: Admin Panel

User passwords can be updated through the admin panel when editing a user record.

**Password Field Behavior**:
- **Field Type**: `type="password"` (hidden input, not plain text)
- **On Edit**: Password field is empty (does not show encrypted hash)
- **On Create**: Password field is empty and required
- **On Update**: Password field is optional - only updates if filled
- **Encryption**: Automatic via `PasswordEncryptionHandler` before save

**How It Works**:
1. When editing a user, the password field is empty (line 605-607 in router-contents.js)
2. Input type is set to 'password' for security (line 706-708 in router-contents.js)
3. If password field is left empty, it's skipped during update (line 515-519 in router-contents.js)
4. If password is entered, it's encrypted by `PasswordEncryptionHandler` before save
5. Password is stored as encrypted `salt:hash` in database

**Configuration**:
- Password field names configurable via `passwordFieldNames` (default: `['password']`)
- Can be customized when creating RouterContents instance

**Important Notes**:
- Password encryption is enabled by default via `PasswordEncryptionHandler`
- If you disabled automatic encryption, passwords will be saved as plain text (not recommended)
- Always verify encryption is enabled in production environments

### Method 3: Direct Database Update

For emergency situations or when CLI is not available:

1. Generate encrypted password using Node.js:

```javascript
const { Encryptor } = require('@reldens/server-utils');
let encryptedPassword = Encryptor.encryptPassword('yourNewPassword');
console.log(encryptedPassword);
```

2. Update database directly:

```sql
UPDATE users
SET password = 'generated-salt:generated-hash'
WHERE email = 'admin@example.com';
```

**⚠️ Warning**: Only use direct database updates as a last resort. Prefer CLI or admin panel methods.

### Method 4: Programmatic Update

```javascript
const { Manager } = require('@reldens/cms');
const { Encryptor } = require('@reldens/server-utils');

async function updateUserPassword(email, newPassword)
{
    let manager = new Manager({projectRoot: process.cwd()});
    await manager.initializeDataServer();
    let usersEntity = manager.dataServer.getEntity('users');
    let user = await usersEntity.loadOneBy('email', email);
    if(!user){
        console.error('User not found');
        return false;
    }
    let encryptedPassword = Encryptor.encryptPassword(newPassword);
    await usersEntity.updateById(user.id, {password: encryptedPassword});
    console.log('Password updated successfully');
    return true;
}
```

## Password Security Best Practices

### For Developers

1. **Never Store Plain Text Passwords**
   - Always use `Encryptor.encryptPassword()` before saving
   - Verify automatic encryption is enabled in production

2. **Verify Password Encryption**
   - Check that stored passwords contain `:` separator
   - Verify salt length is 64 characters (hex)
   - Verify hash length is 128 characters (hex)

3. **Use CLI for Password Updates**
   - Prefer interactive mode (no --password flag)
   - Avoid logging passwords in application logs

4. **Validate Password Format**
   - Use `PasswordEncryptionHandler.isAlreadyEncrypted()` to check format
   - Don't re-encrypt already encrypted passwords

5. **Handle Password Changes**
   - Clear user sessions after password changes
   - Send email notifications for password changes
   - Implement password history to prevent reuse

### For Users

1. **Strong Password Requirements**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words and patterns
   - Use password managers

2. **Password Rotation**
   - Change passwords regularly (every 90 days recommended)
   - Change immediately if compromise is suspected
   - Never share passwords

3. **Account Security**
   - Use unique passwords for each system
   - Enable two-factor authentication when available
   - Monitor login activity

## Password Encryption Handler

### Architecture

The `PasswordEncryptionHandler` class provides automatic password encryption for user entities.

**File**: `lib/password-encryption-handler.js`

**Key Methods**:
- `registerEventListeners()` - Registers event listeners for automatic encryption
- `handleBeforeEntitySave()` - Processes password encryption before entity save
- `isAlreadyEncrypted()` - Checks if password is already in encrypted format

### Configuration

```javascript
const { Manager } = require('@reldens/cms');

let manager = new Manager({
    projectRoot: process.cwd(),
    enablePasswordEncryption: true,  // Default: true
    // ... other config
});
```

### Customization

To customize the password encryption handler:

```javascript
const { PasswordEncryptionHandler } = require('@reldens/cms');

let customHandler = new PasswordEncryptionHandler({
    events: eventsManager,
    entityKey: 'users',           // Entity to monitor
    passwordField: 'password',     // Field name
    enabled: true                  // Enable/disable
});

customHandler.registerEventListeners();
```

### Event Integration

The password handler hooks into the admin save process:

**Event**: `reldens.adminBeforeEntitySave`

**Event Data**:
- `driverResource` - Entity resource being saved
- `req` - Express request object
- `res` - Express response object
- `entityPath` - Entity path

**Processing Flow**:
1. Event is emitted before entity save
2. Handler checks if entity is 'users'
3. Handler checks if password field is present
4. Handler verifies password is not already encrypted
5. Handler encrypts password and updates `req.body.password`
6. Entity save continues with encrypted password

## Troubleshooting

### Common Issues

**Issue**: "Encryptor is not a constructor"
**Solution**: Use `Encryptor.encryptPassword()` directly, not `new Encryptor()`

**Issue**: "Invalid password during login"
**Solution**: Verify password is encrypted in database (should contain `:` and be 192 chars total)

**Issue**: "Password not encrypted when saving"
**Solution**: Verify `enablePasswordEncryption: true` in Manager config

**Issue**: "Password gets re-encrypted"
**Solution**: The handler checks for encryption format, but ensure you're not manually encrypting before save

### Debugging

Enable debug logging to troubleshoot password issues:

```bash
RELDENS_LOG_LEVEL=9 node .
```

Look for these debug messages:
- "Password encrypted successfully for user entity save"
- "Password field appears to be already encrypted"
- "PasswordEncryptionHandler registered for event"

### Verification

To verify a password is correctly encrypted:

```javascript
const { Encryptor } = require('@reldens/server-utils');

let storedPassword = 'from-database';
let parts = storedPassword.split(':');

if(2 === parts.length && 64 === parts[0].length && 128 === parts[1].length){
    console.log('Password is correctly encrypted');
} else {
    console.log('Password format is invalid');
}
```

## Migration from Plain Text Passwords

If you have existing plain text passwords in your database:

1. **Create Migration Script**:

```javascript
const { Manager } = require('@reldens/cms');
const { Encryptor } = require('@reldens/server-utils');

async function migratePasswords()
{
    let manager = new Manager({projectRoot: process.cwd()});
    await manager.initializeDataServer();
    let usersEntity = manager.dataServer.getEntity('users');
    let allUsers = await usersEntity.loadAll();
    for(let user of allUsers){
        let parts = user.password.split(':');
        if(2 === parts.length && 64 === parts[0].length){
            console.log('User '+user.email+' already encrypted, skipping');
            continue;
        }
        let encryptedPassword = Encryptor.encryptPassword(user.password);
        await usersEntity.updateById(user.id, {password: encryptedPassword});
        console.log('Migrated password for user: '+user.email);
    }
    console.log('Migration completed');
}

migratePasswords().catch(console.error);
```

2. **Run Migration**:
```bash
node migrate-passwords.js
```

3. **Verify Migration**:
```sql
SELECT id, email, LENGTH(password) as pwd_length,
       CASE WHEN password LIKE '%:%' THEN 'Encrypted' ELSE 'Plain' END as status
FROM users;
```

## API Reference

### Encryptor Methods

**`Encryptor.encryptPassword(password)`**
- **Parameters**: `password` (string) - Plain text password
- **Returns**: String in format `salt:hash` or `false` on error
- **Usage**: Encrypt a password before storing

**`Encryptor.validatePassword(password, storedPassword)`**
- **Parameters**:
  - `password` (string) - Plain text password to verify
  - `storedPassword` (string) - Encrypted password from database
- **Returns**: Boolean - `true` if password matches, `false` otherwise
- **Usage**: Validate password during authentication

### PasswordEncryptionHandler Methods

**`new PasswordEncryptionHandler(props)`**
- **Parameters**: Object with `events`, `entityKey`, `passwordField`, `enabled`
- **Returns**: PasswordEncryptionHandler instance

**`registerEventListeners()`**
- **Parameters**: None
- **Returns**: Boolean - `true` if registered, `false` if disabled

**`isAlreadyEncrypted(value)`**
- **Parameters**: `value` (string) - Password value to check
- **Returns**: Boolean - `true` if encrypted format, `false` otherwise

## Support

For issues or questions about password management:

- **GitHub Issues**: https://github.com/damian-pastorini/reldens-cms/issues
- **Discord**: https://discord.gg/HuJMxUY
- **Email**: info@dwdeveloper.com

## Related Documentation

- Main CLAUDE.md - Package overview and architecture
- @reldens/server-utils CLAUDE.md - Encryptor class documentation
- Security Features section in main documentation
