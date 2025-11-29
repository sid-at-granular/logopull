# Logo Pull

A web application that extracts logos and icons from websites. Built with Vite, Express, and protected with Clerk authentication.

## Features

- 🔐 **Authentication**: Secure user authentication with Clerk
- 🎨 **Logo Extraction**: Automatically finds logos and icons from any website
- 📥 **Multiple Formats**: Download logos in original, PNG, or SVG formats
- 🚀 **Azure Ready**: Pre-configured for deployment to Azure App Service

## Prerequisites

- Node.js 20+ 
- npm or yarn
- A Clerk account (free tier available at [clerk.com](https://clerk.com))
- Azure account (for deployment)

## Local Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Clerk

1. Create a new application at [dashboard.clerk.com](https://dashboard.clerk.com)
2. Copy your **Publishable Key** and **Secret Key**
3. Create a `.env.local` file in the root directory:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here
PORT=5174
NODE_ENV=development
```

### 3. Configure Clerk Application

In your Clerk dashboard:
1. Go to **Configure** → **Domains**
2. Add `http://localhost:5173` to allowed origins (for development)
3. Configure your authentication methods (Email, Google, etc.)

### 4. Run the Application

```bash
# Start both frontend and backend
npm start

# Or run separately:
npm run dev      # Frontend only (port 5173)
npm run server   # Backend only (port 5174)
```

The application will be available at `http://localhost:5173`

## Docker Deployment

### Local Docker Development

1. **Build and run with Docker Compose**:
   ```bash
   docker-compose up
   ```
   The app will be available at `http://localhost:8080`

2. **Or build and run manually**:
   ```bash
   npm run docker:build
   npm run docker:run
   ```

### Production Deployment

#### Option 1: Azure Container Instances (Simple)

1. **Build and push to Azure Container Registry**:
   ```bash
   # Create resource group and container registry
   az group create --name logopull-rg --location eastus
   az acr create --resource-group logopull-rg --name logopullregistry --sku Basic
   
   # Build and push image
   az acr build --registry logopullregistry --image logopull:latest .
   
   # Deploy container
   az container create \
     --resource-group logopull-rg \
     --name logopull \
     --image logopullregistry.azurecr.io/logopull:latest \
     --dns-name-label logopull-unique \
     --ports 8080 \
     --registry-login-server logopullregistry.azurecr.io \
     --environment-variables \
       NODE_ENV=production \
       PORT=8080 \
       CLERK_SECRET_KEY='your-secret-key' \
       VITE_CLERK_PUBLISHABLE_KEY='your-publishable-key' \
       CLERK_PUBLISHABLE_KEY='your-publishable-key'
   ```

#### Option 2: Azure App Service with Docker

1. **Deploy using Bicep template**:
   ```bash
   az group create --name logopull-rg --location eastus
   az deployment group create \
     --resource-group logopull-rg \
     --template-file infra/main-container.bicep \
     --parameters dockerImage='your-registry/logopull:latest'
   ```

2. **Set environment variables in Azure Portal**:
   - Go to App Service → Configuration → Application settings
   - Add your Clerk keys

#### Option 3: CI/CD with GitHub Actions

1. **Set up GitHub Secrets**:
   - Go to your GitHub repo → Settings → Secrets and variables → Actions
   - Add:
     - `AZURE_CREDENTIALS` (Azure service principal JSON)
     - `AZURE_RESOURCE_GROUP` (your resource group name)
     - `CLERK_SECRET_KEY`
     - `VITE_CLERK_PUBLISHABLE_KEY`

2. **Push to main branch**:
   ```bash
   git push origin main
   ```
   GitHub Actions will automatically build and deploy!

3. **Update Clerk Dashboard**:
   - Add your Azure App Service URL to allowed origins
   - Example: `https://logopull-app.azurewebsites.net`

## Project Structure

```
logoPull/
├── src/              # Frontend source code
│   ├── main.js      # Main application logic with Clerk integration
│   └── style.css    # Styles
├── server/          # Backend Express server
│   └── index.js     # API routes with Clerk protection
├── infra/           # Azure infrastructure as code
│   ├── main.bicep  # Bicep template for Azure resources
│   └── main.parameters.json
├── public/          # Static assets
└── dist/            # Built files (generated)
```

## Environment Variables

### Required

- `VITE_CLERK_PUBLISHABLE_KEY`: Your Clerk publishable key (frontend)
- `CLERK_SECRET_KEY`: Your Clerk secret key (backend)

### Optional

- `PORT`: Server port (default: 5174)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS (production)

## API Endpoints

- `GET /api/logos?url=<website-url>` - Extract logos from a website (requires authentication)
- `GET /api/health` - Health check endpoint

## Troubleshooting

### Authentication Issues

- Ensure Clerk keys are set correctly in environment variables
- Check that your domain is added to Clerk's allowed origins
- Verify the Clerk publishable key starts with `pk_test_` or `pk_live_`

### Azure Deployment Issues

- Ensure Node.js 20 is selected in App Service configuration
- Check that environment variables are set in App Service
- Verify the startup command is `node server/index.js`
- Check App Service logs: `az webapp log tail --name your-app-name --resource-group your-rg`

## License

MIT

