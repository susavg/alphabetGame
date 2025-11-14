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

  // Build game settings
  const gameSettings = {};

  // Time limit
  const timeLimit = document.getElementById('timeLimit').value;
  if (timeLimit) {
    gameSettings.timeLimit = parseInt(timeLimit);
  }

  // Max hints
  const maxHints = document.getElementById('maxHints').value;
  if (maxHints) {
    gameSettings.maxHints = parseInt(maxHints);
  }

  // Fuzzy matching
  const fuzzyEnabled = document.getElementById('fuzzyMatchingEnabled').checked;
  const fuzzyThreshold = document.getElementById('fuzzyThreshold').value;
  const fuzzyMaxDistance = document.getElementById('fuzzyMaxDistance').value;

  gameSettings.fuzzyMatching = {
    enabled: fuzzyEnabled,
    threshold: fuzzyThreshold ? parseFloat(fuzzyThreshold) : 0.8,
    maxDistance: fuzzyMaxDistance ? parseInt(fuzzyMaxDistance) : 2
  };

  // Penalize unanswered
  gameSettings.penalizeUnanswered = document.getElementById('penalizeUnanswered').checked;

  // Scoring
  const correctPoints = document.getElementById('correctPoints').value;
  const incorrectPoints = document.getElementById('incorrectPoints').value;
  const pasapalabraPoints = document.getElementById('pasapalabraPoints').value;
  const timeBonusThreshold = document.getElementById('timeBonusThreshold').value;
  const timeBonus120 = document.getElementById('timeBonus120').value;
  const timeBonus180 = document.getElementById('timeBonus180').value;
  const timeBonus240 = document.getElementById('timeBonus240').value;

  gameSettings.scoring = {
    correct: correctPoints ? parseInt(correctPoints) : 5,
    incorrect: incorrectPoints ? parseInt(incorrectPoints) : -3,
    pasapalabra: pasapalabraPoints ? parseInt(pasapalabraPoints) : -1,
    timeBonus: {
      threshold: timeBonusThreshold ? parseInt(timeBonusThreshold) : 10,
      levels: [
        { maxTime: 120, bonus: timeBonus120 ? parseInt(timeBonus120) : 30 },
        { maxTime: 180, bonus: timeBonus180 ? parseInt(timeBonus180) : 20 },
        { maxTime: 240, bonus: timeBonus240 ? parseInt(timeBonus240) : 10 }
      ]
    }
  };

  const config = {
    title,
    subtitle: subtitle || 'The Alphabet Game',
    gameSettings
  };

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

// Template downloads - DEPRECATED: Using direct download links in HTML now
// async function downloadTemplate(type) {...}
// async function downloadExistingChallenge() {...}
// These functions are no longer needed as we use direct links to GitHub and local files

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

// Active Challenge Management
async function loadActiveChallengeForm() {
  try {
    // Fetch catalog.json
    const response = await fetch(`${API_BASE}/catalog.json`);
    if (!response.ok) {
      throw new Error('Failed to load catalog');
    }

    const catalog = await response.json();
    const select = document.getElementById('activeChallenge');
    const currentActive = catalog.routing?.defaultSlug || '';

    // Clear existing options
    select.innerHTML = '';

    // Add options from challenges
    if (catalog.challenges) {
      Object.keys(catalog.challenges).forEach(slug => {
        const challenge = catalog.challenges[slug];
        const option = document.createElement('option');
        option.value = slug;
        option.textContent = challenge.title || slug;
        if (slug === currentActive) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }

    // Show current active challenge
    if (currentActive) {
      showActiveMessage(`Current active challenge: <strong>${currentActive}</strong>`, 'info');
    }
  } catch (error) {
    console.error('Error loading challenges:', error);
    showActiveMessage('Error loading challenges: ' + error.message, 'error');
  }
}

async function setActiveChallenge(event) {
  event.preventDefault();

  const slug = document.getElementById('activeChallenge').value;
  if (!slug) {
    showActiveMessage('Please select a challenge', 'error');
    return;
  }

  try {
    // Fetch current catalog
    const response = await fetch(`${API_BASE}/catalog.json`);
    if (!response.ok) {
      throw new Error('Failed to load catalog');
    }

    const catalog = await response.json();

    // Update defaultSlug
    if (!catalog.routing) {
      catalog.routing = { param: 'challenge' };
    }
    catalog.routing.defaultSlug = slug;

    // Send update to API
    const updateResponse = await fetch(`${API_BASE}/api/update-catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': adminPassword
      },
      body: JSON.stringify(catalog)
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      throw new Error(error.error || 'Failed to update catalog');
    }

    showActiveMessage(`✅ Active challenge changed to: <strong>${slug}</strong>`, 'success');
    loadActiveChallengeForm(); // Refresh the form
  } catch (error) {
    console.error('Error setting active challenge:', error);
    showActiveMessage('❌ Error: ' + error.message, 'error');
  }
}

function showActiveMessage(message, type) {
  const container = document.getElementById('activeMessage');
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Load download buttons for challenges
async function loadDownloadButtons() {
  try {
    const response = await fetch(`${API_BASE}/catalog.json`);
    if (!response.ok) {
      throw new Error('Failed to load catalog');
    }

    const catalog = await response.json();
    const container = document.getElementById('downloadChallengesButtons');

    if (!catalog.challenges || Object.keys(catalog.challenges).length === 0) {
      container.innerHTML = '<p style="opacity: 0.6;">No challenges available yet.</p>';
      return;
    }

    const buttons = Object.entries(catalog.challenges).map(([slug, config]) => {
      return `
        <button type="button" onclick="downloadChallenge('${slug}')" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; transition: background 0.2s; text-align: left;">
          <div style="font-size: 1.1rem; margin-bottom: 0.25rem;">📦 ${config.title || slug}</div>
          <div style="font-size: 0.85rem; opacity: 0.8;">Download template files</div>
        </button>
      `;
    }).join('');

    container.innerHTML = buttons;
  } catch (error) {
    console.error('Error loading download buttons:', error);
    document.getElementById('downloadChallengesButtons').innerHTML =
      '<p style="color: #E30613;">Error loading challenges. Please refresh the page.</p>';
  }
}

// Download challenge as combined JSON file
async function downloadChallenge(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/download-challenge?slug=${slug}`);
    if (!response.ok) {
      throw new Error('Failed to download challenge');
    }

    const data = await response.json();

    // Create a downloadable JSON file
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug}-template.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    alert('Failed to download challenge: ' + error.message);
  }
}

// Challenge Editor Functions
let currentEditingChallenge = null;

function openChallengeEditor(slug = null) {
  currentEditingChallenge = slug;
  const modal = document.getElementById('challengeEditorModal');
  const title = document.getElementById('editorTitle');

  if (slug) {
    title.textContent = 'Edit Challenge';
    loadChallengeForEditing(slug);
  } else {
    title.textContent = 'Create New Challenge';
    document.getElementById('editorSlug').value = '';
    document.getElementById('editorTitle').value = '';
    document.getElementById('editorSubtitle').value = '';
    renderQuestionsEditor({});
  }

  modal.style.display = 'block';
}

function closeChallengeEditor() {
  document.getElementById('challengeEditorModal').style.display = 'none';
  currentEditingChallenge = null;
}

function renderQuestionsEditor(questionsData = {}) {
  const container = document.getElementById('questionsEditor');
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Escape HTML to prevent issues with quotes
  const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  };

  const html = letters.map(letter => {
    // API now returns simple structure: { definition: '', answer: '', hint: '' }
    const question = questionsData[letter] || { definition: '', answer: '', hint: '' };

    return `
      <div style="background: #f5f5f5; padding: 1rem; margin-bottom: 1rem; border-radius: 4px; border-left: 4px solid #E30613;">
        <h4 style="margin: 0 0 0.75rem; color: #E30613;">Letter ${letter}</h4>
        <div style="display: grid; gap: 0.75rem;">
          <div>
            <label style="font-size: 0.875rem; font-weight: 500;">Question/Definition *</label>
            <textarea id="question_${letter}" rows="2" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-family: inherit;" placeholder="e.g., European country starting with ${letter}">${escapeHtml(question.definition)}</textarea>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
            <div>
              <label style="font-size: 0.875rem; font-weight: 500;">Answer *</label>
              <input type="text" id="answer_${letter}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., Austria" value="${escapeHtml(question.answer)}">
            </div>
            <div>
              <label style="font-size: 0.875rem; font-weight: 500;">Hint (optional)</label>
              <input type="text" id="hint_${letter}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;" placeholder="e.g., Alpine country" value="${escapeHtml(question.hint)}">
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
}

async function loadChallengeForEditing(slug) {
  try {
    const response = await fetch(`${API_BASE}/api/download-challenge?slug=${slug}`);
    if (!response.ok) throw new Error('Failed to load challenge');

    const data = await response.json();

    // API now returns clean structure: { slug, title, subtitle, questions: { A: {...}, B: {...}, ... } }
    document.getElementById('editorSlug').value = data.slug || slug;
    document.getElementById('editorSlug').readOnly = true;
    document.getElementById('editorTitle').value = data.title || '';
    document.getElementById('editorSubtitle').value = data.subtitle || '';

    renderQuestionsEditor(data.questions || {});
  } catch (error) {
    console.error('Error loading challenge:', error);
    showEditorMessage('Error loading challenge: ' + error.message, 'error');
  }
}

function showEditorMessage(message, type) {
  const container = document.getElementById('editorMessage');
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
  setTimeout(() => {
    container.innerHTML = '';
  }, 5000);
}

// Handle editor form submission
document.getElementById('challengeEditorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveChallengeFromEditor();
});

async function saveChallengeFromEditor() {
  const slug = document.getElementById('editorSlug').value.trim().toLowerCase();
  const title = document.getElementById('editorTitle').value.trim();
  const subtitle = document.getElementById('editorSubtitle').value.trim();

  if (!slug || !title) {
    showEditorMessage('Please fill in required fields', 'error');
    return;
  }

  // Collect all questions
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const questionsData = {};

  for (const letter of letters) {
    const question = document.getElementById(`question_${letter}`).value.trim();
    const answer = document.getElementById(`answer_${letter}`).value.trim();
    const hint = document.getElementById(`hint_${letter}`).value.trim();

    if (!question || !answer) {
      showEditorMessage(`Please fill in question and answer for letter ${letter}`, 'error');
      return;
    }

    questionsData[letter] = [{
      definition: question,
      answer: answer,
      ...(hint && { hint: hint })
    }];
  }

  // Create FormData for upload
  const formData = new FormData();
  formData.append('slug', slug);

  const config = {
    title,
    subtitle: subtitle || 'The Alphabet Game'
  };
  formData.append('config', JSON.stringify(config));

  // Convert questions to JSON blob
  const questionsBlob = new Blob([JSON.stringify(questionsData, null, 2)], { type: 'application/json' });
  formData.append('questions', questionsBlob, 'questions.json');

  try {
    showEditorMessage('Saving challenge... <span class="loading"></span>', 'info');

    const response = await fetch(`${API_BASE}/api/upload-challenge`, {
      method: 'POST',
      headers: {
        'x-admin-password': adminPassword
      },
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      showEditorMessage('✅ Challenge saved successfully!', 'success');
      setTimeout(() => {
        closeChallengeEditor();
        loadExistingChallenges();
      }, 1500);
    } else {
      showEditorMessage('❌ Error: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Save error:', error);
    showEditorMessage('❌ Error: ' + error.message, 'error');
  }
}

// Load existing challenges with edit buttons
async function loadExistingChallenges() {
  try {
    const response = await fetch(`${API_BASE}/catalog.json`);
    if (!response.ok) throw new Error('Failed to load catalog');

    const catalog = await response.json();
    const container = document.getElementById('existingChallengesButtons');

    if (!catalog.challenges || Object.keys(catalog.challenges).length === 0) {
      container.innerHTML = '<p style="opacity: 0.6;">No challenges yet. Create your first one!</p>';
      return;
    }

    const buttons = Object.entries(catalog.challenges).map(([slug, config]) => {
      return `
        <button type="button" onclick="openChallengeEditor('${slug}')" style="width: 100%; padding: 1rem; background: rgba(255,255,255,0.2); backdrop-filter: blur(10px); color: white; border: none; border-radius: 4px; font-weight: 500; cursor: pointer; transition: background 0.2s; text-align: left;">
          <div style="font-size: 1.1rem; margin-bottom: 0.25rem;">✏️ ${config.title || slug}</div>
          <div style="font-size: 0.85rem; opacity: 0.8;">Click to edit questions</div>
        </button>
      `;
    }).join('');

    container.innerHTML = buttons;
  } catch (error) {
    console.error('Error loading challenges:', error);
    document.getElementById('existingChallengesButtons').innerHTML =
      '<p style="color: #E30613;">Error loading challenges. Please refresh the page.</p>';
  }
}

// Load active challenge form on page load
window.addEventListener('DOMContentLoaded', () => {
  const savedPassword = localStorage.getItem('adminPassword');
  if (savedPassword) {
    adminPassword = savedPassword;
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
    loadActiveChallengeForm();
    loadExistingChallenges();
    renderQuestionsEditor(); // Initialize empty editor
  }
});
