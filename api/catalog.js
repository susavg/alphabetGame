/**
 * Vercel Serverless Function: Get Catalog
 * Returns the catalog from blob storage (production) or local file (dev)
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const catalogPath = join(process.cwd(), 'catalog.json');
    let catalog = { challenges: {} };

    // Try to read from local file system first (for dev)
    if (existsSync(catalogPath)) {
      try {
        catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
      } catch (e) {
        console.log('Could not read local catalog.json:', e.message);
      }
    }

    // Try to fetch from blob storage (for production)
    try {
      const { head } = await import('@vercel/blob');
      const blobInfo = await head('catalog.json');
      if (blobInfo) {
        // Add cache-busting to ensure fresh data
        const response = await fetch(blobInfo.url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        const blobCatalog = await response.json();
        // Blob catalog takes precedence (contains blob URLs)
        catalog = { ...catalog, ...blobCatalog };
      }
    } catch (e) {
      console.log('No catalog in blob storage:', e.message);
    }

    // Set cache control headers to prevent stale catalog
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    return res.status(200).json(catalog);
  } catch (error) {
    console.error('Catalog error:', error);
    return res.status(500).json({ error: error.message });
  }
}
