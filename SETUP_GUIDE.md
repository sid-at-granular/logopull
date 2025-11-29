# Quick Setup Guide

## Step 1: Clerk Setup (5 minutes)

1. **Create Clerk Account**
   - Go to [clerk.com](https://clerk.com) and sign up (free tier available)
   - Create a new application

2. **Get Your Keys**
   - In Clerk Dashboard → **API Keys**
   - Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
   - Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

3. **Configure Allowed Origins**
   - Go to **Configure** → **Domains**
   - Add `http://localhost:5173` for local development
   - After Azure deployment, add your Azure App Service URL

## Step 2: Local Development Setup

1. **Create Environment File**
   ```bash
   # Create .env.local file
   cat > .env.local << EOF
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
   CLERK_SECRET_KEY=sk_test_your_key_here
   PORT=5174
   NODE_ENV=development
   EOF
   ```

2. **Install and Run**
   ```bash
   npm install
   npm start
   ```

3. **Test the Application**
   - Open `http://localhost:5173`
   - Sign in with Clerk
   - Try extracting a logo from any website

## Step 3: Azure Deployment

### Using Azure Developer CLI (Recommended)

1. **Install Azure Developer CLI**
   ```bash
   # macOS
   brew tap azure/azd && brew install azd
   
   # Windows (PowerShell)
   powershell -ex AllSigned -c "irm 'https://aka.ms/install-azd.ps1' | iex"
   
   # Linux
   curl -fsSL https://aka.ms/azd-install | bash
   ```

2. **Login and Deploy**
   ```bash
   azd auth login
   azd provision  # Creates Azure resources
   azd deploy     # Deploys your app
   ```

3. **Set Environment Variables**
   - After deployment, Azure will show you the App Service URL
   - Go to Azure Portal → Your App Service → Configuration
   - Add these application settings:
     - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
     - `CLERK_SECRET_KEY` = your Clerk secret key
   - Click **Save** and restart the app

4. **Update Clerk Dashboard**
   - Add your Azure App Service URL to Clerk's allowed origins
   - Example: `https://your-app-name.azurewebsites.net`

### Manual Azure Deployment

1. **Build the App**
   ```bash
   npm run build
   ```

2. **Create Resource Group**
   ```bash
   az group create --name logoPull-rg --location eastus
   ```

3. **Deploy Infrastructure**
   ```bash
   az deployment group create \
     --resource-group logoPull-rg \
     --template-file infra/main.bicep \
     --parameters @infra/main.parameters.json
   ```

4. **Deploy Code**
   ```bash
   # Get your app name from the deployment output
   az webapp up \
     --name <your-app-name> \
     --resource-group logoPull-rg \
     --runtime "NODE:20-lts"
   ```

5. **Set Environment Variables** (same as step 3 above)

6. **Update Clerk Dashboard** (same as step 4 above)

## Troubleshooting

### "VITE_CLERK_PUBLISHABLE_KEY is not set"
- Make sure `.env.local` exists in the root directory
- Check that the variable name is exactly `VITE_CLERK_PUBLISHABLE_KEY`
- Restart your dev server after creating/updating `.env.local`

### "Please sign in to use this feature"
- Check that Clerk keys are set correctly
- Verify your domain is in Clerk's allowed origins
- Check browser console for Clerk errors

### Azure Deployment Fails
- Ensure Node.js 20 is selected in App Service configuration
- Check that `CLERK_SECRET_KEY` is set in App Service settings
- Verify the startup command is `node server/index.js`
- Check logs: `az webapp log tail --name <app-name> --resource-group <rg-name>`

### API Returns 401 Unauthorized
- Verify `CLERK_SECRET_KEY` is set in Azure App Service
- Check that the frontend is sending the Authorization header
- Ensure Clerk publishable key matches between frontend and Clerk dashboard

## Next Steps

- Customize authentication methods in Clerk dashboard
- Set up custom domains in Azure
- Configure Azure Key Vault for production secrets
- Set up CI/CD pipeline for automated deployments

