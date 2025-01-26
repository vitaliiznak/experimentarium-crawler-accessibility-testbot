import express from 'express';
import { PlaywrightService } from './src/services/playwright-service';
import type { TestConfig } from './src/types';

const app = express();
app.use(express.json());

app.post('/analyze', async (req, res) => {
  const { url, config }: { url: string; config: TestConfig } = req.body;
  
  try {
    const service = new PlaywrightService(config);
    const results = await service.runTests([url]);
    res.json(results);
  } catch (error) {
    console.error('Analysis failed:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});