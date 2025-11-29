# Environment Variables Setup

## Local Development

Create a `.env.local` file in the root directory with the following variables:

```env
# Clerk Configuration
# Get these from https://dashboard.clerk.com
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Server Configuration
PORT=5174
NODE_ENV=development
```

## Azure Deployment

The Clerk environment variables need to be set in Azure App Service. You have two options:

### Option 1: Direct Environment Variables (Simple)

Set these in Azure Portal:
1. Go to your App Service → Configuration → Application settings
2. Add:
   - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
   - `CLERK_SECRET_KEY` = your Clerk secret key

### Option 2: Azure Key Vault (Recommended for Production)

1. Create a Key Vault in Azure
2. Store your Clerk keys as secrets:
   - `clerk-publishable-key`
   - `clerk-secret-key`
3. Update `infra/main.bicep` with your Key Vault name
4. Grant the App Service access to the Key Vault

