/**
 * Vercel Serverless Function: Upload Challenge
 * Handles uploading questions.json, preview.json, and configuration
 */

import { put } from '@vercel/blob';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

// Simple authentication check
function isAuthenticated(req) {
  const adminPassword = process.env.GAME_ADMIN_SECRET || 'admin123';
  const providedPassword = req.headers['x-admin-password'];
  return providedPassword === adminPassword;
}

export const config = {
  api: {
    bodyParser: false, // We'll handle file uploads manually
  },
};

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
    // Parse multipart form data using dynamic import for ES modules
    const formidable = (await import('formidable')).default;
    const form = formidable({ multiples: true });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const slug = Array.isArray(fields.slug) ? fields.slug[0] : fields.slug;
    const configData = fields.config ? JSON.parse(Array.isArray(fields.config) ? fields.config[0] : fields.config) : {};

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // Validate slug (alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only.' });
    }

    const uploadedFiles = {};

    // Upload questions.json to Vercel Blob if provided
    if (files.questions) {
      const questionsFile = Array.isArray(files.questions) ? files.questions[0] : files.questions;
      const questionsContent = readFileSync(questionsFile.filepath, 'utf-8');

      // Validate JSON
      try {
        JSON.parse(questionsContent);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid questions.json format' });
      }

      const blob = await put(`challenges/${slug}/questions.json`, questionsContent, {
        access: 'public',
        contentType: 'application/json',
      });
      uploadedFiles.questions = blob.url;
    }

    // Upload preview.json to Vercel Blob if provided
    if (files.preview) {
      const previewFile = Array.isArray(files.preview) ? files.preview[0] : files.preview;
      const previewContent = readFileSync(previewFile.filepath, 'utf-8');

      // Validate JSON
      try {
        JSON.parse(previewContent);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid preview.json format' });
      }

      const blob = await put(`challenges/${slug}/preview.json`, previewContent, {
        access: 'public',
        contentType: 'application/json',
      });
      uploadedFiles.preview = blob.url;
    }

    // Upload logo if provided
    if (files.logo) {
      const logoFile = Array.isArray(files.logo) ? files.logo[0] : files.logo;
      const logoContent = readFileSync(logoFile.filepath);
      const logoExt = logoFile.originalFilename.split('.').pop();

      const blob = await put(`challenges/${slug}/logo.${logoExt}`, logoContent, {
        access: 'public',
        contentType: logoFile.mimetype,
      });
      uploadedFiles.logo = blob.url;
    }

    // Update catalog - try local file first, fall back to blob storage
    const catalogPath = join(process.cwd(), 'catalog.json');
    let catalog = {};

    // Try to read from local file system (works in local dev)
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
      console.log('No existing catalog in blob storage:', e.message);
    }

    if (!catalog.challenges) {
      catalog.challenges = {};
    }

    // Create or update challenge entry
    catalog.challenges[slug] = {
      basePath: `challenges/${slug}`,
      title: configData.title || `Challenge: ${slug}`,
      subtitle: configData.subtitle || 'The Alphabet Game',
      ...(uploadedFiles.questions && { questionsPath: uploadedFiles.questions }),
      ...(uploadedFiles.preview && { previewPath: uploadedFiles.preview }),
      ...(uploadedFiles.logo && { logoPath: uploadedFiles.logo }),
      ...configData,
    };

    // Save catalog to blob storage (production)
    try {
      const catalogBlob = await put('catalog.json', JSON.stringify(catalog, null, 2), {
        access: 'public',
        contentType: 'application/json',
      });
      console.log('Catalog saved to blob storage:', catalogBlob.url);
    } catch (e) {
      console.error('Failed to save catalog to blob storage:', e);
    }

    // Try to save to local file system (for local dev)
    try {
      writeFileSync(catalogPath, JSON.stringify(catalog, null, 2));
      console.log('Catalog saved to local file system');
    } catch (e) {
      console.log('Could not write to local file system (expected in production):', e.message);
    }

    return res.status(200).json({
      success: true,
      slug,
      files: uploadedFiles,
      challengeUrl: `/?challenge=${slug}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: error.message });
  }
}
