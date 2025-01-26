import type { TestResult, WCAGViolation } from '../types/wcag';

interface TestResultsProps {
  results: TestResult;
}

export function TestResults({ results }: TestResultsProps) {
  const getImpactColor = (impact: WCAGViolation['impact']): string => {
    const colors = {
      critical: '#ff4d4d',
      serious: '#ff9100',
      moderate: '#ffcc00',
      minor: '#8c959f'
    };
    return colors[impact] || '#8c959f';
  };

  const getImpactIcon = (impact: WCAGViolation['impact']) => {
    const icons = {
      critical: '🔴',
      serious: '🟠',
      moderate: '🟡',
      minor: '⚪'
    };
    return icons[impact] || '⚪';
  };

  return (
    <div className="test-results" role="region" aria-label="Accessibility Test Results">
      <div className="results-header">
        <h2>Accessibility Test Results</h2>
        <time 
          className="timestamp" 
          dateTime={new Date(results.timestamp).toISOString()}
          aria-label="Test completion time"
        >
          {new Date(results.timestamp).toLocaleString()}
        </time>
      </div>

      <div className="results-summary">
        <div className="summary-card" role="region" aria-label="Overview Statistics">
          <h3>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
            Overview
          </h3>
          <div className="stats-grid">
            <div className="stat-item" role="status" aria-label="Pages Tested">
              <span className="stat-label">Pages Tested</span>
              <span className="stat-value">{results.summary.totalPages}</span>
            </div>
            <div className="stat-item" role="status" aria-label="Total Violations">
              <span className="stat-label">Total Violations</span>
              <span className="stat-value error">{results.summary.totalViolations}</span>
            </div>
            <div className="stat-item" role="status" aria-label="Passes">
              <span className="stat-label">Passes</span>
              <span className="stat-value success">{results.passes}</span>
            </div>
            <div className="stat-item" role="status" aria-label="Needs Review">
              <span className="stat-label">Needs Review</span>
              <span className="stat-value warning">{results.incomplete}</span>
            </div>
          </div>
        </div>

        <div className="summary-card" role="region" aria-label="Impact Distribution">
          <h3>
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Impact Distribution
          </h3>
          <div className="impact-grid">
            {Object.entries(results.summary.violationsByImpact).map(([impact, count]) => (
              <div 
                key={impact} 
                className="impact-item"
                style={{ 
                  borderLeft: `4px solid ${getImpactColor(impact as WCAGViolation['impact'])}` 
                }}
                role="status"
                aria-label={`${impact} impact violations: ${count}`}
              >
                <span className="impact-label">
                  <span aria-hidden="true">{getImpactIcon(impact as WCAGViolation['impact'])}</span>
                  {impact}
                </span>
                <span className="impact-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="violations-section">
        <h3>Accessibility Issues</h3>
        {results.violations.map((violation, index) => (
          <div 
            key={`${violation.id}-${index}`} 
            className="violation-card"
            style={{ borderLeftColor: getImpactColor(violation.impact) }}
          >
            <div className="violation-header">
              <h4>{violation.id}</h4>
              <span className="impact-badge" style={{ backgroundColor: getImpactColor(violation.impact) }}>
                {violation.impact}
              </span>
            </div>
            
            <p className="violation-description">{violation.description}</p>
            <a 
              href={violation.helpUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="help-link"
            >
              Learn how to fix this
            </a>

            <div className="affected-nodes">
              <h5>Affected Elements ({violation.nodes.length})</h5>
              {violation.nodes.map((node, nodeIndex) => (
                <div key={nodeIndex} className="node-details">
                  <pre className="html-snippet">{node.html}</pre>
                  <p className="failure-summary">{node.failureSummary}</p>
                  <code className="selector">{node.target.join(' ')}</code>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 