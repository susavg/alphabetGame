/**
 * Vercel Serverless Function: List Challenges
 * Returns all available challenges from catalog.json
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

    // Try to read from local file system first
    if (existsSync(catalogPath)) {
      try {
        catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
      } catch (e) {
        console.log('Could not read local catalog.json:', e.message);
      }
    }

    // Also try to fetch from blob storage (for production)
    try {
      const { head } = await import('@vercel/blob');
      const blobInfo = await head('catalog.json');
      if (blobInfo) {
        const response = await fetch(blobInfo.url);
        const blobCatalog = await response.json();
        // Merge blob catalog with local (blob takes precedence)
        catalog = { ...catalog, ...blobCatalog };
      }
    } catch (e) {
      console.log('No catalog in blob storage:', e.message);
    }

    // Try to get blobs if Blob Storage is configured
    let blobs = [];
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { list } = await import('@vercel/blob');
        const result = await list();
        blobs = result.blobs || [];
      }
    } catch (blobError) {
      console.log('Blob storage not available:', blobError.message);
    }

    const challengesWithDetails = Object.entries(catalog.challenges || {}).map(([slug, config]) => {
      // Find associated blobs if available
      const challengeBlobs = blobs.filter(blob => blob.pathname?.startsWith(`challenges/${slug}/`));

      return {
        slug,
        ...config,
        files: challengeBlobs.map(blob => ({
          name: blob.pathname.split('/').pop(),
          url: blob.url,
          size: blob.size,
          uploadedAt: blob.uploadedAt,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      challenges: challengesWithDetails,
      total: challengesWithDetails.length,
    });
  } catch (error) {
    console.error('List error:', error);
    return res.status(500).json({ error: error.message });
  }
}
