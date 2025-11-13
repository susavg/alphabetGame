/**
 * Admin Dashboard JavaScript
 * Handles authentication, file uploads, and challenge management
 */

let adminPassword = '';
const API_BASE = window.location.origin;

// Authentication
function authenticate() {
  const password = document.getElementById('adminPassword').value;
  if (!password) {
    showAuthMessage('Please enter a password', 'error');
    return;
  }

  adminPassword = password;
  localStorage.setItem('adminPassword', password);

  // Test authentication by trying to list challenges
  testAuthentication();
}

async function testAuthentication() {
  try {
    const response = await fetch(`${API_BASE}/api/list-challenges`, {
      headers: {
        'x-admin-password': adminPassword
      }
    });

    if (response.ok) {
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('adminPanel').classList.remove('hidden');
      loadChallenges();
    } else {
      // Public endpoint, so we're authenticated
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('adminPanel').classList.remove('hidden');
      loadChallenges();
    }
  } catch (error) {
    console.error('Auth test error:', error);
    showAuthMessage('Error connecting to server: ' + error.message, 'error');
  }
}

function logout() {
  adminPassword = '';
  localStorage.removeItem('adminPassword');
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('adminPanel').classList.add('hidden');
  document.getElementById('adminPassword').value = '';
}

function showAuthMessage(message, type = 'info') {
  const messageDiv = document.getElementById('authMessage');
  messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    messageDiv.innerHTML = '';
  }, 5000);
}

// Check if already authenticated
window.addEventListener('load', () => {
  const savedPassword = localStorage.getItem('adminPassword');
  if (savedPassword) {
    adminPassword = savedPassword;
    document.getElementById('adminPassword').value = savedPassword;
    testAuthentication();
  }
});

// Upload Form Handler
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await uploadChallenge();
});

async function uploadChallenge() {
  const slug = document.getElementById('challengeSlug').value.trim().toLowerCase();
  const title = document.getElementById('challengeTitle').value.trim();
  const subtitle = document.getElementById('challengeSubtitle').value.trim();
  const questionsFile = document.getElementById('questionsFile').files[0];
  const previewFile = document.getElementById('previewFile').files[0];
  const logoFile = document.getElementById('logoFile').files[0];
  const timeLimit = document.getElementById('timeLimit').value;

  if (!slug || !title || !questionsFile) {
    showUploadMessage('Please fill in required fields', 'error');
    return;
  }

  // Validate slug format
  if (!/^[a-z0-9-]+$/.test(slug)) {
    showUploadMessage('Slug must contain only lowercase letters, numbers, and hyphens', 'error');
    return;
  }

  // Validate JSON files
  try {
    const questionsContent = await readFileAsText(questionsFile);
    const questionsData = JSON.parse(questionsContent);

    // Validate questions structure
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    for (const letter of letters) {
      if (!questionsData[letter] || !Array.isArray(questionsData[letter]) || questionsData[letter].length === 0) {
        showUploadMessage(`Missing or invalid questions for letter ${letter}`, 'error');
        return;
      }
    }

    if (previewFile) {
      const previewContent = await readFileAsText(previewFile);
      JSON.parse(previewContent); // Just validate it's valid JSON
    }
  } catch (error) {
    showUploadMessage('Invalid JSON file: ' + error.message, 'error');
    return;
  }

  const formData = new FormData();
  formData.append('slug', slug);
  formData.append('questions', questionsFile);

  const config = {
    title,
    subtitle: subtitle || 'The Alphabet Game'
  };

  if (timeLimit) {
    config.gameSettings = { timeLimit: parseInt(timeLimit) };
  }

  formData.append('config', JSON.stringify(config));

  if (previewFile) {
    formData.append('preview', previewFile);
  }

  if (logoFile) {
    formData.append('logo', logoFile);
  }

  try {
    showUploadMessage('Uploading... <span class="loading"></span>', 'info');

    const response = await fetch(`${API_BASE}/api/upload-challenge`, {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword
      },
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      showUploadMessage(`✅ Challenge uploaded successfully! <a href="${result.challengeUrl}" target="_blank">View Challenge</a>`, 'success');
      document.getElementById('uploadForm').reset();
      loadChallenges();
    } else {
      showUploadMessage('❌ Upload failed: ' + result.error, 'error');
    }
  } catch (error) {
    showUploadMessage('❌ Upload error: ' + error.message, 'error');
  }
}

function showUploadMessage(message, type = 'info') {
  const messageDiv = document.getElementById('uploadMessage');
  messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
}

// Load and display challenges
async function loadChallenges() {
  const container = document.getElementById('challengesList');
  container.innerHTML = '<div class="alert alert-info">Loading challenges... <span class="loading"></span></div>';

  try {
    const response = await fetch(`${API_BASE}/api/list-challenges`);
    const result = await response.json();

    if (response.ok && result.challenges) {
      updateStats(result.challenges.length);
      displayChallenges(result.challenges);
    } else {
      container.innerHTML = '<div class="alert alert-error">Failed to load challenges</div>';
    }
  } catch (error) {
    container.innerHTML = `<div class="alert alert-error">Error: ${error.message}</div>`;
  }
}

function updateStats(totalChallenges) {
  const statsContainer = document.getElementById('statsContainer');
  statsContainer.innerHTML = `
    <div class="stats">
      <div class="stat-card">
        <div class="number">${totalChallenges}</div>
        <div class="label">Total Challenges</div>
      </div>
      <div class="stat-card">
        <div class="number">26</div>
        <div class="label">Questions per Challenge</div>
      </div>
      <div class="stat-card">
        <div class="number">${totalChallenges * 26}</div>
        <div class="label">Total Questions</div>
      </div>
    </div>
  `;
}

function displayChallenges(challenges) {
  const container = document.getElementById('challengesList');

  if (challenges.length === 0) {
    container.innerHTML = '<div class="alert alert-info">No challenges found. Upload your first challenge above!</div>';
    return;
  }

  const html = `
    <div class="challenges-grid">
      ${challenges.map(challenge => `
        <div class="challenge-card">
          <h3>${challenge.title || 'Untitled Challenge'}</h3>
          <div class="slug">${challenge.slug}</div>
          <p>${challenge.subtitle || ''}</p>

          <div class="challenge-files">
            ${challenge.files && challenge.files.length > 0 ? `
              <strong>Files:</strong>
              ${challenge.files.map(file => `
                <div>📄 ${file.name} (${formatBytes(file.size)})</div>
              `).join('')}
            ` : '<div>No files in Blob Storage (using local files)</div>'}
          </div>

          <div class="challenge-actions">
            <button class="success" onclick="viewChallenge('${challenge.slug}')">👁️ View</button>
            <button class="warning" onclick="downloadChallenge('${challenge.slug}')">📥 Download</button>
            <button class="danger" onclick="deleteChallenge('${challenge.slug}')">🗑️ Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  container.innerHTML = html;
}

// Helper functions
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

// Template downloads
async function downloadTemplate(type) {
  try {
    const response = await fetch(`${API_BASE}/api/generate-template?type=${type}`);
    const data = await response.json();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    alert('Error downloading template: ' + error.message);
  }
}

// Download existing challenge
async function downloadExistingChallenge() {
  const slug = prompt('Enter the challenge slug to download:');
  if (!slug) return;

  await downloadChallenge(slug);
}

async function downloadChallenge(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/get-challenge?slug=${slug}`);
    const result = await response.json();

    if (!response.ok) {
      alert('Error: ' + result.error);
      return;
    }

    // Download each JSON file
    for (const [filename, fileData] of Object.entries(result.files)) {
      if (filename.endsWith('.json') && fileData.content) {
        const blob = new Blob([JSON.stringify(fileData.content, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${slug}-${filename}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }

    alert(`Downloaded files for challenge: ${slug}`);
  } catch (error) {
    alert('Error downloading challenge: ' + error.message);
  }
}

// View challenge
function viewChallenge(slug) {
  window.open(`/?challenge=${slug}`, '_blank');
}

// Delete challenge
async function deleteChallenge(slug) {
  if (!confirm(`Are you sure you want to delete the challenge "${slug}"? This cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/delete-challenge?slug=${slug}`, {
      method: 'DELETE',
      headers: {
        'x-admin-password': adminPassword
      }
    });

    const result = await response.json();

    if (response.ok) {
      alert('✅ Challenge deleted successfully');
      loadChallenges();
    } else {
      alert('❌ Delete failed: ' + result.error);
    }
  } catch (error) {
    alert('❌ Delete error: ' + error.message);
  }
}
