/**
 * Vercel Serverless Function: Update Catalog
 * Updates the catalog.json file with new configuration
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Simple authentication check
function isAuthenticated(req) {
  const adminPassword = process.env.GAME_ADMIN_SECRET || 'admin123';
  const providedPassword = req.headers['x-admin-password'];
  return providedPassword === adminPassword;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const newCatalog = req.body;

    if (!newCatalog || typeof newCatalog !== 'object') {
      return res.status(400).json({ error: 'Invalid catalog data' });
    }

    // Validate that it has the required structure
    if (!newCatalog.routing || !newCatalog.challenges) {
      return res.status(400).json({ error: 'Catalog must have routing and challenges sections' });
    }

    // Write to catalog.json
    const catalogPath = join(process.cwd(), 'catalog.json');
    writeFileSync(catalogPath, JSON.stringify(newCatalog, null, 2));

    return res.status(200).json({
      success: true,
      message: 'Catalog updated successfully',
      defaultSlug: newCatalog.routing.defaultSlug
    });
  } catch (error) {
    console.error('Update catalog error:', error);
    return res.status(500).json({ error: error.message });
  }
}
