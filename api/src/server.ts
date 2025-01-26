import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { PlaywrightService } from './services/playwright-service';
import { CrawlerService } from './services/crawler-service';
import type { TestConfig } from './types';

interface AnalysisSession {
  ws: WebSocket;
  crawler?: CrawlerService;
  playwright?: PlaywrightService;
}

export class Server {
  private app = express();
  private httpServer = createServer(this.app);
  private wss = new WebSocketServer({ server: this.httpServer });
  private sessions = new Map<string, AnalysisSession>();

  constructor() {
    this.setupMiddleware();
    this.setupWebSocket();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const sessionId = Math.random().toString(36).substring(7);
      console.log(`New WebSocket connection established: ${sessionId}`);

      this.sessions.set(sessionId, { ws });

      ws.on('close', () => {
        console.log(`WebSocket connection closed: ${sessionId}`);
        this.sessions.delete(sessionId);
      });

      ws.send(JSON.stringify({ type: 'connected', sessionId }));
    });
  }

  private setupRoutes(): void {
    this.app.post('/analyze', async (req, res) => {
      const { url, config, sessionId } = req.body as { 
        url: string; 
        config: TestConfig; 
        sessionId: string 
      };
      
      console.log('Received analysis request:', { url, config, sessionId });
      
      const session = this.sessions.get(sessionId);
      if (!session) {
        console.log('Invalid session ID:', sessionId);
        return res.status(400).json({ error: 'Invalid session ID' });
      }

      try {
        session.crawler = new CrawlerService(config);
        session.playwright = new PlaywrightService(config);

        // Set up progress tracking
        session.crawler.on('progress', (progress) => {
          session.ws.send(JSON.stringify({
            type: 'crawlProgress',
            data: progress
          }));
        });

        // Start analysis
        const crawlResults = await session.crawler.crawl(url);
        const testResults = await session.playwright.runTests(
          crawlResults
            .filter(result => result.status === 200)
            .map(result => result.url)
        );

        // Send final results
        session.ws.send(JSON.stringify({
          type: 'complete',
          data: {
            ...testResults,
            crawlResults
          }
        }));

        res.json({ success: true });
      } catch (error) {
        console.error('Analysis failed:', error);
        session.ws.send(JSON.stringify({
          type: 'error',
          error: 'Analysis failed'
        }));
        res.status(500).json({ error: 'Analysis failed' });
      }
    });
  }

  public start(port: number): void {
    this.httpServer.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  }
} 