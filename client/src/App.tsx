import { useState, useEffect } from 'react'
import type { TestResult, AnalysisProgress } from './types/wcag'
import './App.css'
import type { TestConfig } from './types/wcag'
import { TestRunner } from './services/TestRunner'
import { Progress } from './components/Progress'
import { TestResults } from './components/TestResults'

function App() {
  const [url, setUrl] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [results, setResults] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<TestConfig>({
    maxDepth: 2,
    excludePatterns: [],
    includePatterns: [],
    maxPages: 10,
    wcagLevel: 'AA'
  })
  const [progress, setProgress] = useState<AnalysisProgress | null>(null)

  const handleAnalyze = async (): Promise<void> => {
    if (!url) return

    try {
      setIsLoading(true)
      setError(null)
      setProgress(null)
      setResults(null)
      
      console.log('Starting analysis for:', url)
      const testRunner = new TestRunner(config)
      const result = await testRunner.runTests(url, (progressData) => {
        console.log('Analysis progress:', progressData)
        setProgress(progressData)
      })
      
      console.log('Analysis complete:', result)
      setResults(result)
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
      setProgress(null)
    }
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setUrl(e.target.value)
    setError(null)
  }

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to analyze
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        handleAnalyze();
      }
      // Esc to clear input
      if (e.key === 'Escape') {
        setUrl('');
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [url]);

  return (
    <div className="container">
      <header className="app-header">
        <h1>WCAG Test Bot</h1>
        <p>wcag-test --analyze --standard="WCAG2.1"</p>
      </header>
      
      <div className="input-group">
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="https://"
          className="url-input"
          pattern="https?://.*"
          required
          aria-label="URL to analyze"
        />
        <button 
          onClick={handleAnalyze}
          disabled={isLoading || !url}
          className="analyze-button"
        >
          {isLoading ? (
            <>
              <span className="loading-spinner" />
              Running...
            </>
          ) : (
            'Analyze'
          )}
        </button>
      </div>

      {error && (
        <div className="error-message" role="alert">
          <code>Error: {error}</code>
        </div>
      )}

      {progress && <Progress progress={progress} />}
      {results && <TestResults results={results} />}

      <div className="keyboard-shortcuts">
        <span><kbd className="kbd">Ctrl</kbd> + <kbd className="kbd">Enter</kbd> Run analysis</span>
        <span style={{ marginLeft: '1rem' }}><kbd className="kbd">Esc</kbd> Clear</span>
      </div>
    </div>
  )
}

export default App