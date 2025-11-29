import './style.css';
import { Clerk } from '@clerk/clerk-js';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  console.error('VITE_CLERK_PUBLISHABLE_KEY is not set');
}

let clerk;
const app = document.querySelector('#app');

// Initialize Clerk
async function initClerk() {
  clerk = new Clerk(CLERK_PUBLISHABLE_KEY);
  await clerk.load();
  
  // Listen for authentication state changes (only re-render auth buttons, not entire app)
  clerk.addListener((event) => {
    // Only update auth buttons, don't re-render everything
    updateAuthButtons();
  });
  
  renderApp();
}

initClerk();

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function updateAuthButtons() {
  if (!clerk) return;
  const authButtons = document.querySelector('#auth-buttons');
  if (!authButtons) return;
  
  const isSignedIn = clerk.user !== null;
  authButtons.innerHTML = '';
  
  if (isSignedIn) {
    const userButton = document.createElement('button');
    userButton.className = 'panel__button';
    userButton.style.padding = '0.5rem 1rem';
    userButton.style.fontSize = '0.9rem';
    userButton.textContent = clerk.user?.primaryEmailAddress?.emailAddress || 'User';
    userButton.addEventListener('click', () => {
      clerk.openUserProfile();
    });
    
    const signOutButton = document.createElement('button');
    signOutButton.className = 'panel__button';
    signOutButton.style.padding = '0.5rem 1rem';
    signOutButton.style.fontSize = '0.9rem';
    signOutButton.style.background = 'rgba(79, 95, 247, 0.1)';
    signOutButton.style.color = '#4f5ff7';
    signOutButton.textContent = 'Sign Out';
    signOutButton.addEventListener('click', async () => {
      await clerk.signOut();
      renderApp(); // Full re-render on sign out
    });
    
    authButtons.append(userButton, signOutButton);
  } else {
    const signInButton = document.createElement('button');
    signInButton.className = 'panel__button';
    signInButton.style.padding = '0.5rem 1rem';
    signInButton.style.fontSize = '0.9rem';
    signInButton.textContent = 'Sign In';
    signInButton.addEventListener('click', () => {
      clerk.openSignIn();
    });
    authButtons.append(signInButton);
  }
}

function renderApp() {
  if (!clerk) return;
  const isSignedIn = clerk.user !== null;
  
  // Save current state before re-rendering
  const currentUrlValue = urlInput?.value || '';
  const currentStatus = statusEl?.textContent || '';
  const currentStatusState = statusEl?.dataset.state || '';
  const currentResultsHTML = resultsEl?.innerHTML || '';
  
  app.innerHTML = `
    <main class="page">
      <section class="panel">
        <header class="panel__header">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h1 style="margin: 0;">Logo Pull</h1>
            <div id="auth-buttons" style="display: flex; gap: 0.5rem;"></div>
          </div>
          <p>Enter a website URL and we&apos;ll try to find any logos or icons you can download.</p>
        </header>
        ${isSignedIn ? `
          <form id="logo-form" class="panel__form">
            <input
              id="url-input"
              class="panel__input"
              type="url"
              name="url"
              placeholder="https://example.com"
              value="${escapeHtml(currentUrlValue)}"
              required
            />
            <button type="submit" class="panel__button">Pull logos</button>
          </form>
          <p id="status" class="status" data-state="${escapeHtml(currentStatusState)}">${escapeHtml(currentStatus || 'Ready when you are.')}</p>
        ` : `
          <div style="text-align: center; padding: 2rem 0;">
            <p style="color: #4b4c5f; margin-bottom: 1.5rem;">Please sign in to use Logo Pull</p>
            <button id="sign-in-btn" class="panel__button">Sign In</button>
          </div>
        `}
      </section>
      <section class="results" id="results" aria-live="polite">${currentResultsHTML}</section>
    </main>
  `;

  // Restore elements reference
  getElements();

  // Render auth buttons
  const authButtons = document.querySelector('#auth-buttons');
  if (authButtons) {
    if (isSignedIn) {
      const userButton = document.createElement('button');
      userButton.className = 'panel__button';
      userButton.style.padding = '0.5rem 1rem';
      userButton.style.fontSize = '0.9rem';
      userButton.textContent = clerk.user?.primaryEmailAddress?.emailAddress || 'User';
      userButton.addEventListener('click', () => {
        clerk.openUserProfile();
      });
      
      const signOutButton = document.createElement('button');
      signOutButton.className = 'panel__button';
      signOutButton.style.padding = '0.5rem 1rem';
      signOutButton.style.fontSize = '0.9rem';
      signOutButton.style.background = 'rgba(79, 95, 247, 0.1)';
      signOutButton.style.color = '#4f5ff7';
      signOutButton.textContent = 'Sign Out';
      signOutButton.addEventListener('click', async () => {
        await clerk.signOut();
        renderApp();
      });
      
      authButtons.append(userButton, signOutButton);
    } else {
      const signInButton = document.createElement('button');
      signInButton.className = 'panel__button';
      signInButton.style.padding = '0.5rem 1rem';
      signInButton.style.fontSize = '0.9rem';
      signInButton.textContent = 'Sign In';
      signInButton.addEventListener('click', () => {
        clerk.openSignIn();
      });
      authButtons.append(signInButton);
    }
  }

  // Handle sign in button in the main content area
  const signInBtn = document.querySelector('#sign-in-btn');
  if (signInBtn) {
    signInBtn.addEventListener('click', () => {
      clerk.openSignIn();
    });
  }
  
  // Re-setup form handler after re-render
  setupFormHandler();
}

// renderApp is called from initClerk

let form = document.querySelector('#logo-form');
let urlInput = document.querySelector('#url-input');
let statusEl = document.querySelector('#status');
let resultsEl = document.querySelector('#results');

function getElements() {
  form = document.querySelector('#logo-form');
  urlInput = document.querySelector('#url-input');
  statusEl = document.querySelector('#status');
  resultsEl = document.querySelector('#results');
}

const DOWNLOAD_OPTIONS = [
  { value: 'original', label: 'Original' },
  { value: 'png', label: 'PNG' },
  { value: 'svg', label: 'SVG' },
];

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.state = type;
}

function clearResults() {
  resultsEl.innerHTML = '';
}

function triggerDownload(dataUrl, fileName) {
  const anchor = document.createElement('a');
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

function getExtension(fileName) {
  const parts = fileName.split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function replaceExtension(fileName, nextExt) {
  const base = fileName.includes('.') ? fileName.substring(0, fileName.lastIndexOf('.')) : fileName;
  return `${base}.${nextExt}`;
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image'));
    image.src = dataUrl;
  });
}

async function convertToPng(dataUrl) {
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth || image.width || 512;
  const height = image.naturalHeight || image.height || 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL('image/png');
}

async function convertToSvg(dataUrl) {
  if (dataUrl.startsWith('data:image/svg')) {
    return dataUrl;
  }
  const image = await loadImage(dataUrl);
  const width = image.naturalWidth || image.width || 512;
  const height = image.naturalHeight || image.height || 512;
  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <image href="${dataUrl}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />
    </svg>
  `.trim();
  const encoded = encodeURIComponent(svgContent);
  return `data:image/svg+xml;charset=utf-8,${encoded}`;
}

async function handleDownload(logo, format, button) {
  try {
    button.disabled = true;
    button.textContent = 'Preparing...';

    if (format === 'original') {
      triggerDownload(logo.dataUrl, logo.fileName);
      return;
    }

    if (format === 'png') {
      const pngUrl = await convertToPng(logo.dataUrl);
      triggerDownload(pngUrl, replaceExtension(logo.fileName, 'png'));
      return;
    }

    if (format === 'svg') {
      const svgUrl = await convertToSvg(logo.dataUrl);
      triggerDownload(svgUrl, replaceExtension(logo.fileName, 'svg'));
    }
  } catch (error) {
    console.error('Download failed', error);
    setStatus('Conversion failed. Please try a different option.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Download';
  }
}

function renderLogos(data) {
  clearResults();
  if (!data?.logos?.length) {
    setStatus('No logos found for that site.', 'warning');
    return;
  }

  setStatus(`Found ${data.count} possible logo${data.count > 1 ? 's' : ''}.`, 'success');

  data.logos.forEach((logo) => {
    const card = document.createElement('article');
    card.className = 'logo-card';

    const preview = document.createElement('div');
    preview.className = 'logo-card__preview';
    const image = document.createElement('img');
    image.src = logo.dataUrl;
    image.alt = `Logo candidate from ${logo.originalUrl}`;
    preview.append(image);

    const content = document.createElement('div');
    content.className = 'logo-card__content';

    const title = document.createElement('h3');
    title.textContent = logo.fileName;
    content.append(title);

    const meta = document.createElement('p');
    meta.className = 'logo-card__meta';
    const sizeText = logo.byteSize ? ` • ${formatBytes(logo.byteSize)}` : '';
    meta.textContent = `${logo.mimeType}${sizeText}`;
    content.append(meta);

    const source = document.createElement('p');
    source.className = 'logo-card__source';
    source.textContent = `Source: ${logo.originalUrl}`;
    content.append(source);

    const controls = document.createElement('div');
    controls.className = 'logo-card__controls';

    const select = document.createElement('select');
    select.className = 'logo-card__select';
    DOWNLOAD_OPTIONS.forEach((option) => {
      const opt = document.createElement('option');
      opt.value = option.value;
      const ext = getExtension(logo.fileName);
      if (option.value === 'original') {
        opt.textContent = `${option.label} (${ext || 'file'})`;
      } else {
        opt.textContent = `Download as ${option.label}`;
      }
      select.append(opt);
    });

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'logo-card__button';
    button.textContent = 'Download';
    button.addEventListener('click', () =>
      handleDownload(logo, select.value, button)
    );

    controls.append(select, button);
    content.append(controls);

    card.append(preview, content);
    resultsEl.append(card);
  });
}

async function fetchLogos(url) {
  getElements();
  setStatus('Looking for logos...', 'loading');
  clearResults();

  try {
    if (!clerk) {
      setStatus('Authentication not initialized. Please refresh the page.', 'error');
      return;
    }

    // Get the session token from Clerk
    if (!clerk.user) {
      setStatus('Please sign in to use this feature.', 'error');
      return;
    }

    // Get session and token
    const session = clerk.session;
    if (!session) {
      setStatus('Please sign in to use this feature.', 'error');
      return;
    }

    const token = await session.getToken();
    if (!token) {
      console.error('Failed to get token from session');
      setStatus('Unable to get authentication token. Please sign in again.', 'error');
      return;
    }

    console.log('Fetching logos with auth token');
    const response = await fetch(`/api/logos?url=${encodeURIComponent(url)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    // Check if response is actually JSON
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    
    // Handle non-JSON responses
    if (!contentType.includes('application/json')) {
      if (response.status === 401) {
        setStatus('Authentication failed. Please sign in again.', 'error');
        renderApp();
        return;
      }
      if (text.trim().startsWith('<!')) {
        if (response.status === 404) {
          setStatus('API endpoint not found. Make sure the server is running.', 'error');
        } else {
          setStatus('Server returned HTML instead of JSON. Check server logs.', 'error');
        }
        console.error('Non-JSON response:', response.status, text.substring(0, 200));
        return;
      }
      setStatus(`Unexpected response (${response.status}). Please try again.`, 'error');
      return;
    }

    // Parse JSON only if content-type is correct
    let payload;
    try {
      payload = JSON.parse(text);
    } catch (jsonError) {
      setStatus('Server returned invalid JSON. Please ensure the server is running correctly.', 'error');
      return;
    }

    if (!response.ok) {
      console.error('API error:', response.status, payload);
      if (response.status === 401) {
        setStatus('Authentication failed. Please sign in again.', 'error');
        renderApp();
      } else {
        setStatus(payload.error || `Something went wrong (${response.status}).`, 'error');
      }
      return;
    }

    renderLogos(payload);
  } catch (error) {
    console.error(error);
    if (error.message && error.message.includes('JSON')) {
      setStatus('Server not running. Please start the server with "npm run start" or "npm run server".', 'error');
    } else {
      setStatus('Request failed. Check your connection and try again.', 'error');
    }
  }
}

// Set up form handler when form exists
let formSubmitHandler = null;

function setupFormHandler() {
  getElements();
  if (form) {
    // Remove old listener if it exists
    if (formSubmitHandler) {
      form.removeEventListener('submit', formSubmitHandler);
    }
    
    // Create new handler
    formSubmitHandler = (event) => {
      event.preventDefault();
      getElements(); // Refresh element references
      const url = urlInput?.value.trim();
      if (!url) return;
      fetchLogos(url);
    };
    
    // Add listener
    form.addEventListener('submit', formSubmitHandler);
  }
  if (statusEl && clerk && clerk.user && !statusEl.textContent) {
    setStatus('Ready when you are.', 'info');
  }
}
