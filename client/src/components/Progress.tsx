import type { AnalysisProgress } from '../types/wcag';

interface ProgressProps {
  progress: AnalysisProgress;
}

export function Progress({ progress }: ProgressProps) {
  const percentage = Math.round(
    (progress.processedUrls / Math.max(progress.totalUrlsFound, 1)) * 100
  );

  return (
    <div className="progress-container">
      <div className="progress-header">
        <h3>Analysis in Progress</h3>
        <span className="progress-percentage">{percentage}%</span>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-bar-fill" 
          style={{ 
            width: `${percentage}%`,
            transition: 'width 0.3s ease-in-out'
          }}
        />
      </div>

      <div className="progress-details">
        <div className="current-url">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Currently analyzing: </span>
          <code>{progress.currentUrl}</code>
        </div>
        <div className="progress-stats">
          <span>Pages processed: </span>
          <strong>{progress.processedUrls}</strong>
          <span> of </span>
          <strong>{progress.totalUrlsFound}</strong>
        </div>
      </div>
    </div>
  );
} 