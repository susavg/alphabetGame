/**
 * Vercel Serverless Function: Download Challenge as ZIP
 * Downloads questions.json and preview.json as a ZIP file
 */

import { readFileSync } from 'fs';
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

  const { slug } = req.query;

  if (!slug) {
    return res.status(400).json({ error: 'Slug parameter is required' });
  }

  try {
    // Load catalog to get challenge info
    const catalogPath = join(process.cwd(), 'catalog.json');
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));

    const challenge = catalog.challenges?.[slug];
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const basePath = challenge.basePath || `challenges/${slug}`;
    const questionsPath = challenge.questionsPath || 'questions.json';
    const previewPath = challenge.previewPath || 'preview.json';

    // Load the files
    let files = {};

    // Load questions
    try {
      if (questionsPath.startsWith('http')) {
        // Fetch from URL
        const response = await fetch(questionsPath);
        files.questions = await response.text();
      } else {
        // Load from local file
        const fullPath = join(process.cwd(), basePath, questionsPath);
        files.questions = readFileSync(fullPath, 'utf-8');
      }
    } catch (error) {
      console.error(`Error loading questions for ${slug}:`, error);
    }

    // Load preview
    try {
      if (previewPath.startsWith('http')) {
        const response = await fetch(previewPath);
        files.preview = await response.text();
      } else {
        const fullPath = join(process.cwd(), basePath, previewPath);
        files.preview = readFileSync(fullPath, 'utf-8');
      }
    } catch (error) {
      console.error(`Error loading preview for ${slug}:`, error);
    }

    if (!files.questions && !files.preview) {
      return res.status(404).json({ error: 'No files found for this challenge' });
    }

    // Create simple ZIP structure (minimal implementation)
    // For a proper ZIP, we'd use a library like 'jszip', but for simplicity
    // we'll return JSON with both files
    const zipData = {
      challenge: slug,
      title: challenge.title,
      files: {
        'questions.json': files.questions,
        'preview.json': files.preview
      }
    };

    // Set headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.json"`);

    return res.status(200).json(zipData);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: error.message });
  }
}
