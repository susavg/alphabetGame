/**
 * Vercel Serverless Function: Get Challenge Details
 * Returns full challenge configuration and file contents
 */

import { list } from '@vercel/blob';

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
    const { slug } = req.query;

    if (!slug) {
      return res.status(400).json({ error: 'Slug is required' });
    }

    // Get all blobs for this challenge
    const { blobs } = await list({ prefix: `challenges/${slug}/` });

    if (blobs.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Fetch content of JSON files
    const files = {};
    for (const blob of blobs) {
      const filename = blob.pathname.split('/').pop();
      files[filename] = {
        url: blob.url,
        size: blob.size,
        uploadedAt: blob.uploadedAt,
      };

      // If it's a JSON file, fetch its content
      if (filename.endsWith('.json')) {
        try {
          const response = await fetch(blob.url);
          files[filename].content = await response.json();
        } catch (e) {
          console.error(`Error fetching ${filename}:`, e);
        }
      }
    }

    return res.status(200).json({
      success: true,
      slug,
      files,
    });
  } catch (error) {
    console.error('Get challenge error:', error);
    return res.status(500).json({ error: error.message });
  }
}
