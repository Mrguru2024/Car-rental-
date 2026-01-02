# .gitignore Security Documentation

This document explains how the `.gitignore` file protects secrets and credentials in this project.

## Protected Files and Patterns

### Environment Variables (CRITICAL)

The following environment variable files are **never** committed:

- `.env` - General environment file
- `.env.local` - Local development secrets (PRIMARY FILE)
- `.env.development.local` - Development-specific secrets
- `.env.test.local` - Test-specific secrets
- `.env.production.local` - Production secrets
- `.env*.production` - Any production environment files
- `.env*.development` - Any development environment files
- `.env*.staging` - Any staging environment files

**Why these are critical:**
- Contains `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Contains `STRIPE_SECRET_KEY` (full payment access)
- Contains `STRIPE_WEBHOOK_SECRET` (webhook verification)
- Contains `DATA_ENCRYPTION_KEY` (data decryption)
- Contains various API keys (VinAudit, OpenCage, etc.)

### What IS Committed (Safe)

The following file IS committed as it contains no secrets:

- `.env.example` - Template file with placeholder values only

## Protected File Patterns

### Credential Files
- `*.pem`, `*.key`, `*.p12`, `*.pfx` - Certificate and key files
- `*.secret`, `*.private` - Any file with "secret" or "private" in name
- `secrets/`, `.secrets/` - Secret directories
- `credentials/`, `.credentials/` - Credential directories

### Build Artifacts
- `.next/` - Next.js build output (may contain processed env vars)
- `out/` - Next.js export output
- `dist/`, `build/` - Build directories

### IDE and Editor Files
- `.vscode/`, `.idea/` - IDE configuration (may contain workspace secrets)
- `*.swp`, `*.swo` - Vim swap files

### Temporary Files
- `*.backup`, `*.bak`, `*.old` - Backup files that might contain old secrets
- `tmp/`, `temp/` - Temporary directories
- `*.log` - Log files (may contain sensitive data)

## Security Best Practices

### 1. Never Commit Secrets

❌ **NEVER do this:**
```bash
git add .env.local
git commit -m "Add environment variables"
```

✅ **ALWAYS do this:**
```bash
# .env.local is automatically ignored
git add .env.example  # Only commit the example file
git commit -m "Update environment template"
```

### 2. Verify Before Committing

Before committing, always check what files will be added:

```bash
# See what files git will track
git status

# See if any .env files are staged
git status | grep -i env

# Verify .gitignore is working
git check-ignore -v .env.local
```

### 3. If Secrets Were Accidentally Committed

If you accidentally commit secrets:

1. **Immediately rotate all exposed keys:**
   - Generate new Supabase service role key
   - Generate new Stripe keys
   - Generate new DATA_ENCRYPTION_KEY (requires re-encrypting data)
   - Rotate all API keys

2. **Remove from Git history:**
   ```bash
   # Remove file from history (CAUTION: rewrites history)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env.local" \
     --prune-empty --tag-name-filter cat -- --all
   
   # Force push (coordinate with team first!)
   git push origin --force --all
   ```

3. **Update secrets in all environments:**
   - Update in Vercel/hosting platform
   - Update in team members' local `.env.local` files
   - Update in any CI/CD systems

### 4. Use .env.example as Template

The `.env.example` file should:
- ✅ Contain all required variable names
- ✅ Use placeholder values (e.g., `your-key-here`)
- ✅ Include helpful comments
- ❌ Never contain real secrets
- ❌ Never contain actual API keys

### 5. Team Guidelines

- Every team member should copy `.env.example` to `.env.local`
- Each team member fills in their own credentials
- Never share `.env.local` files directly
- Use secure channels (password managers, encrypted messages) to share keys if needed
- Rotate keys when team members leave

## Verification Commands

### Check if .env files are ignored

```bash
# Should show that .env.local is ignored
git check-ignore -v .env.local

# Should NOT show .env.example (it should be tracked)
git check-ignore -v .env.example
```

### List all ignored files

```bash
# See all ignored files
git status --ignored

# See ignored files matching pattern
git ls-files --others --ignored --exclude-standard | grep env
```

### Verify no secrets in repository

```bash
# Search for common secret patterns (run periodically)
git grep -i "STRIPE_SECRET_KEY="
git grep -i "SUPABASE_SERVICE_ROLE_KEY="
git grep -i "DATA_ENCRYPTION_KEY="

# Should return no results (except in .env.example with placeholder values)
```

## CI/CD Considerations

### Environment Variables in CI/CD

- Never hardcode secrets in CI/CD configuration files
- Use CI/CD platform's secret management:
  - GitHub Actions: Secrets
  - GitLab CI: Variables (masked)
  - Vercel: Environment Variables
  - CircleCI: Environment Variables

### Pre-commit Hooks (Optional)

Consider adding a pre-commit hook to prevent accidental commits:

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Check for .env files
if git diff --cached --name-only | grep -q '\.env$'; then
  echo "ERROR: Attempted to commit .env file"
  echo "Please remove .env files from staging area"
  exit 1
fi

# Check for secrets in staged files
if git diff --cached | grep -qE "(STRIPE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|DATA_ENCRYPTION_KEY)=[^y]"; then
  echo "WARNING: Potential secret detected in staged files"
  echo "Please review before committing"
  exit 1
fi
```

## Monitoring

### GitHub Secret Scanning

GitHub automatically scans for exposed secrets. If you see alerts:
1. Immediately rotate the exposed secret
2. Remove from Git history if it was committed
3. Review how it was exposed and prevent future occurrences

### Regular Audits

Periodically:
1. Review `.gitignore` to ensure it's up to date
2. Search repository for any hardcoded secrets
3. Verify team members understand secret management
4. Rotate secrets regularly (especially after team changes)

## Related Documentation

- [Environment Variables Setup](./ENVIRONMENT_SETUP.md) - How to configure environment variables
- [Security Documentation](./SECURITY.md) - General security practices
- [Insurance Setup Guide](./INSURANCE_SETUP.md) - Includes security considerations