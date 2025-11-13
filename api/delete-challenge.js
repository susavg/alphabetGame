/**
 * Vercel Serverless Function: Delete Challenge
 * Removes challenge from catalog and deletes files from Blob storage
 */

import { del, list } from '@vercel/blob';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Simple authentication check
function isAuthenticated(req) {
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const providedPassword = req.headers['x-admin-password'];
  return providedPassword === adminPassword;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check authentication
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // Delete all blobs for this challenge
    const { blobs } = await list({ prefix: `challenges/${slug}/` });

    for (const blob of blobs) {
      await del(blob.url);
    }

    // Update catalog.json
    const catalogPath = join(process.cwd(), 'catalog.json');
    let catalog = {};

    if (existsSync(catalogPath)) {
      catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
    }

    if (catalog.challenges && catalog.challenges[slug]) {
      delete catalog.challenges[slug];
      writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
    }

    return res.status(200).json({
      success: true,
      message: `Challenge '${slug}' deleted successfully`,
      deletedFiles: blobs.length,
    });
  } catch (error) {
    console.error('Delete error:', error);
    return res.status(500).json({ error: error.message });
  }
}
