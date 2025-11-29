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

## Azure Deployment

### Option 1: Using Azure Developer CLI (azd)

1. **Install Azure Developer CLI**:
   ```bash
   # macOS
   brew tap azure/azd && brew install azd
   
   # Or follow instructions at: https://aka.ms/azure-dev/install
   ```

2. **Login to Azure**:
   ```bash
   azd auth login
   ```

3. **Provision and Deploy**:
   ```bash
   azd provision
   azd deploy
   ```

4. **Set Environment Variables**:
   After deployment, set your Clerk keys in Azure Portal:
   - Go to your App Service → Configuration → Application settings
   - Add:
     - `VITE_CLERK_PUBLISHABLE_KEY` = your Clerk publishable key
     - `CLERK_SECRET_KEY` = your Clerk secret key
   - Save and restart the app

5. **Update Clerk Dashboard**:
   - Add your Azure App Service URL to allowed origins in Clerk dashboard
   - Example: `https://your-app-name.azurewebsites.net`

### Option 2: Manual Azure Deployment

1. **Build the Application**:
   ```bash
   npm run build
   ```

2. **Create Azure Resources**:
   ```bash
   # Using Azure CLI
   az group create --name logoPull-rg --location eastus
   az deployment group create \
     --resource-group logoPull-rg \
     --template-file infra/main.bicep \
     --parameters @infra/main.parameters.json
   ```

3. **Deploy to App Service**:
   ```bash
   # Install Azure Functions Core Tools if needed
   az webapp up \
     --name your-app-name \
     --resource-group logoPull-rg \
     --runtime "NODE:20-lts" \
     --startup-file "node server/index.js"
   ```

4. **Set Environment Variables** (same as Option 1)

5. **Update Clerk Dashboard** (same as Option 1)

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

