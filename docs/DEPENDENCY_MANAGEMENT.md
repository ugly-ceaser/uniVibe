# Dependency Management Guide

This document outlines the strategies and tools used to enforce dependency version control in the UniVibe project.

## 🎯 Goals

- **Reproducible Builds**: Ensure all developers and CI/CD systems use identical dependency versions
- **Security**: Prevent security vulnerabilities through controlled updates
- **Stability**: Avoid breaking changes from unexpected dependency updates
- **Team Consistency**: All team members work with the same dependency versions

## 🔒 Version Control Strategies

### 1. Package Lock Files

#### `package-lock.json`

- **Purpose**: Locks exact versions of all dependencies and their sub-dependencies
- **Commit**: Always commit this file to version control
- **Install**: Use `npm ci` instead of `npm install` for consistent installs

#### `yarn.lock` (if using Yarn)

- Alternative to package-lock.json
- Choose one lock file strategy and stick with it

### 2. Version Constraints in package.json

#### Exact Versions (`"package": "1.2.3"`)

```json
{
  "dependencies": {
    "react": "19.0.0",
    "react-native": "0.79.1"
  }
}
```

#### Caret Ranges (`"package": "^1.2.3"`)

```json
{
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

- Allows patch and minor updates
- Prevents major breaking changes

#### Tilde Ranges (`"package": "~1.2.3"`)

```json
{
  "dependencies": {
    "typescript": "~5.8.3"
  }
}
```

- Allows only patch updates
- More restrictive than caret ranges

### 3. Engine Constraints

```json
{
  "engines": {
    "node": ">=18.0.0 <21.0.0",
    "npm": ">=8.0.0 <10.0.0"
  }
}
```

- Enforces Node.js and npm version requirements
- CI/CD systems will fail if versions don't match
- Use `.nvmrc` for local development

### 4. Overrides and Resolutions

```json
{
  "overrides": {
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "resolutions": {
    "react": "19.0.0"
  }
}
```

- Forces specific versions even for transitive dependencies
- Useful for resolving version conflicts
- Ensures React ecosystem consistency

## 🛠️ Tools and Scripts

### Available npm Scripts

```bash
# Check for outdated packages
npm run deps:check

# Update packages within version constraints
npm run deps:update

# Security audit
npm run deps:audit

# Fix security vulnerabilities
npm run deps:fix

# Lock dependencies to exact versions
npm run deps:lock

# Clean and reinstall dependencies
npm run deps:clean
```

### Dependency Lock Script

```bash
# Make script executable
chmod +x scripts/lock-deps.sh

# Run dependency locking
./scripts/lock-deps.sh
```

## 📋 Best Practices

### 1. Installation Commands

#### ✅ Use These Commands

```bash
# Fresh install (respects lock file)
npm ci

# Install new package (updates lock file)
npm install package-name

# Update lock file only
npm install --package-lock-only
```

#### ❌ Avoid These Commands

```bash
# Don't use in production/CI
npm install

# Don't ignore lock file
npm install --no-package-lock
```

### 2. Version Updates

#### When to Update

- Security patches (immediate)
- Bug fixes (within 1-2 weeks)
- Minor features (monthly review)
- Major versions (quarterly review)

#### Update Process

1. **Check current versions**: `npm run deps:check`
2. **Review changelogs** for breaking changes
3. **Update incrementally** (one major package at a time)
4. **Test thoroughly** after each update
5. **Lock new versions**: `npm run deps:lock`
6. **Commit changes**: Include package.json and package-lock.json

### 3. Team Workflow

#### New Team Member Setup

```bash
# Clone repository
git clone <repo-url>
cd univibe

# Use correct Node version
nvm use

# Install dependencies
npm ci
```

#### Daily Development

```bash
# Pull latest changes
git pull origin main

# Install any new dependencies
npm ci

# Start development
npm run dev
```

## 🔍 Monitoring and Maintenance

### 1. Regular Checks

#### Weekly

- Run `npm run deps:check` for outdated packages
- Review security advisories

#### Monthly

- Update minor versions within constraints
- Review major version roadmaps

#### Quarterly

- Plan major version updates
- Review dependency health

### 2. Security Monitoring

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix

# Fix with breaking changes
npm audit fix --force
```

### 3. Dependency Health

#### Tools

- [npm-check-updates](https://github.com/raineorshine/npm-check-updates)
- [npm outdated](https://docs.npmjs.com/cli/v8/commands/npm-outdated)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

## 🚨 Troubleshooting

### Common Issues

#### Version Conflicts

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm ci
```

#### Peer Dependency Warnings

- Check if warnings are critical
- Update packages to compatible versions
- Use overrides if necessary

#### Lock File Mismatches

```bash
# Regenerate lock file
npm run deps:lock

# Commit the new lock file
git add package-lock.json
git commit -m "Update dependency lock file"
```

### Emergency Updates

#### Security Vulnerabilities

1. **Immediate**: Update vulnerable packages
2. **Test**: Verify functionality
3. **Deploy**: Push to production
4. **Document**: Record the incident

#### Breaking Changes

1. **Assess**: Evaluate impact
2. **Plan**: Create migration strategy
3. **Test**: Thorough testing in staging
4. **Deploy**: Gradual rollout

## 📚 Additional Resources

- [npm Package Lock Documentation](https://docs.npmjs.com/cli/v8/configuring-npm/package-lock-json)
- [Semantic Versioning](https://semver.org/)
- [Node.js Version Management](https://github.com/nvm-sh/nvm)
- [npm Security Best Practices](https://docs.npmjs.com/about-audit-reports)

## 🤝 Team Responsibilities

### Developers

- Use `npm ci` for installations
- Commit package-lock.json changes
- Report dependency issues

### Tech Leads

- Review dependency updates
- Approve major version changes
- Monitor security advisories

### DevOps

- Ensure CI/CD uses lock files
- Monitor build consistency
- Alert on dependency issues
