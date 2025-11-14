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

    // Parse questions to extract structured data for editor
    let questionsData = {};
    if (files.questions) {
      try {
        const parsed = JSON.parse(files.questions);
        questionsData = parsed;
      } catch (error) {
        console.error('Error parsing questions:', error);
      }
    }

    // Transform to editor-friendly format
    const editorData = {
      slug,
      title: challenge.title,
      subtitle: challenge.subtitle || 'The Alphabet Game',
      questions: {}
    };

    // Convert each letter's questions to simple format
    Object.keys(questionsData).forEach(letter => {
      const letterQuestions = questionsData[letter];
      if (Array.isArray(letterQuestions) && letterQuestions.length > 0) {
        const firstQuestion = letterQuestions[0];

        // Join arrays for editing: answers with comma, hints with pipe
        let answerValue = '';
        if (Array.isArray(firstQuestion.answers)) {
          answerValue = firstQuestion.answers.join(', ');
        } else if (firstQuestion.answer) {
          answerValue = firstQuestion.answer;
        }

        let hintValue = '';
        if (Array.isArray(firstQuestion.hints)) {
          hintValue = firstQuestion.hints.join(' | ');
        } else if (firstQuestion.hint) {
          hintValue = firstQuestion.hint;
        }

        editorData.questions[letter] = {
          definition: firstQuestion.definition || '',
          answer: answerValue,
          hint: hintValue
        };
      }
    });

    return res.status(200).json(editorData);
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: error.message });
  }
}
