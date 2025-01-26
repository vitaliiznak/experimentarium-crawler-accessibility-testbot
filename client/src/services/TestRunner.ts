import type { AnalysisProgress, TestConfig, TestResult } from '../types/wcag';

export class TestRunner {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  private setupWebSocket(): Promise<string> {
    return new Promise((resolve, reject) => {
      const wsUrl = `ws://${window.location.hostname}:${window.location.port}/ws`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connection established');
      };

      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'connected') {
          console.log('Received session ID:', message.sessionId);
          resolve(message.sessionId);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };
    });
  }

  async runTests(url: string, onProgress?: (progress: AnalysisProgress) => void): Promise<TestResult> {
    try {
      // Setup WebSocket if not already connected
      if (!this.sessionId) {
        this.sessionId = await this.setupWebSocket();
      }

      return new Promise((resolve, reject) => {
        if (!this.ws) return reject(new Error('WebSocket not connected'));

        // Set up message handler for both progress and completion
        this.ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          console.log('Received WebSocket message:', message);

          switch (message.type) {
            case 'crawlProgress':
              if (onProgress) {
                onProgress(message.data);
              }
              break;
            case 'complete':
              resolve(message.data);
              break;
            case 'error':
              reject(new Error(message.error));
              break;
          }
        };

        // Start analysis
        fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url,
            config: this.config,
            sessionId: this.sessionId,
          }),
        }).catch(reject);
      });
    } catch (error) {
      // Only close WebSocket on error
      if (this.ws) {
        this.ws.close();
        this.ws = null;
        this.sessionId = null;
      }
      throw error;
    }
  }
} 