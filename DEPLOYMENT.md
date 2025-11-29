# Deployment Guide

This guide covers multiple deployment options for Logo Pull.

## Quick Start

### Local Docker Testing

```bash
# Build and run locally
docker-compose up

# Or use npm scripts
npm run docker:build
npm run docker:run
```

## Deployment Options

### 1. Azure Container Instances (Recommended for Simple Deployments)

**Pros**: Simple, fast, pay-per-use  
**Cons**: No auto-scaling, manual updates

```bash
# Build Docker image
docker build -t logopull:latest .

# Tag for Azure Container Registry
docker tag logopull:latest <your-registry>.azurecr.io/logopull:latest

# Push to registry
az acr login --name <your-registry>
docker push <your-registry>.azurecr.io/logopull:latest

# Deploy
az container create \
  --resource-group logopull-rg \
  --name logopull \
  --image <your-registry>.azurecr.io/logopull:latest \
  --dns-name-label logopull-unique \
  --ports 8080 \
  --environment-variables \
    NODE_ENV=production \
    PORT=8080 \
    CLERK_SECRET_KEY='your-key' \
    VITE_CLERK_PUBLISHABLE_KEY='your-key' \
    CLERK_PUBLISHABLE_KEY='your-key'
```

### 2. Azure App Service (Recommended for Production)

**Pros**: Auto-scaling, CI/CD integration, managed service  
**Cons**: More expensive than Container Instances

#### Using GitHub Actions (Automated)

1. **Fork/Push to GitHub**
2. **Set up secrets** in GitHub repo settings:
   - `AZURE_CREDENTIALS` - Azure service principal JSON
   - `AZURE_RESOURCE_GROUP` - Resource group name
   - `CLERK_SECRET_KEY` - Your Clerk secret key
   - `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key

3. **Push to main branch** - deployment happens automatically!

#### Manual Deployment

```bash
# Create resource group
az group create --name logopull-rg --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group logopull-rg \
  --template-file infra/main-container.bicep \
  --parameters dockerImage='ghcr.io/your-username/logopull:main'

# Set environment variables
az webapp config appsettings set \
  --name logopull-app \
  --resource-group logopull-rg \
  --settings \
    NODE_ENV=production \
    PORT=8080 \
    CLERK_SECRET_KEY='your-key' \
    VITE_CLERK_PUBLISHABLE_KEY='your-key' \
    CLERK_PUBLISHABLE_KEY='your-key'
```

### 3. Azure Kubernetes Service (For Scale)

**Pros**: Full Kubernetes features, auto-scaling, high availability  
**Cons**: More complex setup, requires Kubernetes knowledge

```bash
# Create AKS cluster
az aks create \
  --resource-group logopull-rg \
  --name logopull-aks \
  --node-count 2 \
  --enable-addons monitoring

# Get credentials
az aks get-credentials --resource-group logopull-rg --name logopull-aks

# Deploy using kubectl
kubectl apply -f k8s/
```

### 4. GitHub Container Registry + Azure

1. **Build and push to GHCR**:
   ```bash
   # Login to GHCR
   echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
   
   # Build and push
   docker build -t ghcr.io/your-username/logopull:latest .
   docker push ghcr.io/your-username/logopull:latest
   ```

2. **Deploy to Azure** using the image from GHCR

## Environment Variables

Required environment variables for production:

- `NODE_ENV=production`
- `PORT=8080`
- `CLERK_SECRET_KEY` - Your Clerk secret key
- `VITE_CLERK_PUBLISHABLE_KEY` - Your Clerk publishable key (for frontend)
- `CLERK_PUBLISHABLE_KEY` - Same as above (for backend)

## Post-Deployment Checklist

1. ✅ Set environment variables in Azure
2. ✅ Add Azure URL to Clerk dashboard allowed origins
3. ✅ Test authentication flow
4. ✅ Test logo extraction
5. ✅ Monitor logs: `az webapp log tail --name logopull-app --resource-group logopull-rg`

## Troubleshooting

### Container won't start
- Check logs: `az container logs --resource-group logopull-rg --name logopull`
- Verify environment variables are set correctly
- Ensure PORT is set to 8080

### Authentication not working
- Verify Clerk keys are set correctly
- Check that Azure URL is in Clerk's allowed origins
- Review server logs for authentication errors

### Build fails in CI/CD
- Check that all secrets are set in GitHub
- Verify Azure credentials have correct permissions
- Check build logs for specific errors

