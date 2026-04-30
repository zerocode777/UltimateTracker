const express = require('express');
const path = require('path');
const { searchStream, getCategories } = require('./scrapers');
const RankingsSearcher = require('./scrapers/rankings');
const { getPopular, refreshPopular } = require('./scrapers/popular');

const app = express();
const PORT = 7777;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// SSE search endpoint - streams results per source
app.get('/api/search', (req, res) => {
  const { q, category = 'all' } = req.query;
  if (!q || q.trim().length === 0) {
    return res.json({ results: [], errors: [] });
  }

  // Set up SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const query = q.trim();

  searchStream(query, category, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }).then(() => {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }).catch((err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  });

  req.on('close', () => {
    // Client disconnected
  });
});

// Categories endpoint
app.get('/api/categories', (req, res) => {
  res.json(getCategories());
});

// Rankings endpoints
const rankings = new RankingsSearcher();

app.get('/api/rankings/types', (req, res) => {
  res.json(rankings.getTypes());
});

app.get('/api/rankings/:type', (req, res) => {
  const { type } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  console.log(`[Rankings] Loading "${type}" rankings...`);

  rankings.streamRankings(type, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }).then(() => {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
    console.log(`[Rankings] "${type}" complete`);
  }).catch((err) => {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  });

  req.on('close', () => {});
});

// Popular torrents endpoint
app.get('/api/popular/:category', async (req, res) => {
  const { category } = req.params;

  try {
    const result = await getPopular(category);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: 'Unknown category' });
  }
});

// Popular torrents refresh endpoint
app.post('/api/popular/:category/refresh', async (req, res) => {
  const { category } = req.params;

  try {
    await refreshPopular(category);
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: 'Refresh failed' });
  }
});

app.listen(PORT, () => {
  console.log(`UltimateTracker running at http://localhost:${PORT}`);
});
