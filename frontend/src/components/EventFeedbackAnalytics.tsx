import React, { useEffect, useState, memo, Suspense, lazy, useRef } from 'react';
import api from '../config/axios';
import { Line, Pie } from 'react-chartjs-2';
import '../styles/EventFeedbackAnalytics.css';
// Add DatePicker imports
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// Add icons for filters
import { FaFilter, FaCalendarAlt, FaDownload, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Create a component to suppress console warnings specifically for react-wordcloud
class ErrorBoundary extends React.Component<
  { children: React.ReactNode, fallback?: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode, fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  // Save original console.error
  componentDidMount() {
    // Suppress only the specific defaultProps warning
    this.originalConsoleError = console.error;
    console.error = (...args) => {
      // Filter out the specific warning about defaultProps
      if (args[0]?.includes?.('Support for defaultProps will be removed')) {
        return;
      }
      this.originalConsoleError.apply(console, args);
    };
  }

  componentWillUnmount() {
    // Restore original console.error when unmounting
    if (this.originalConsoleError) {
      console.error = this.originalConsoleError;
    }
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong with the word cloud.</div>;
    }
    return this.props.children;
  }

  private originalConsoleError: typeof console.error = console.error;
}

// Lazy load ReactWordcloud to further isolate it
const LazyWordCloud = lazy(() => import('react-wordcloud').then(module => ({
  default: ({ words, options }: { words: any[], options: any }) => (
    <div style={{ width: '100%', height: '300px' }}>
      <module.default words={words} options={options} />
    </div>
  )
})));

// Create a wrapper component with error boundary and suspense
const WordCloudWithErrorHandling = ({ words, options }: { words: any[], options: any }) => {
  return (
    <ErrorBoundary fallback={
      <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        Unable to load word cloud
      </div>
    }>
      <Suspense fallback={
        <div style={{ width: '100%', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          Loading word cloud...
        </div>
      }>
        <LazyWordCloud words={words} options={options} />
      </Suspense>
    </ErrorBoundary>
  );
};

// Rest of the component remains the same
interface FeedbackAnalytics {
  overallStats: {
    average_rating: number;
    total_feedback: number;
    events_with_feedback: number;
  };
  wordFrequency: Array<{ word: string; frequency: number }>;
  eventStats: Array<{
    id: number;
    title: string;
    average_rating: number;
    feedback_count: number;
    feedback_details: Array<{
      rating: number;
      comment: string;
      created_at: string;
      user_name: string;
      user_role: string;
    }>;
  }>;
  sentimentStats: {
    positive_feedback: number;
    neutral_feedback: number;
    negative_feedback: number;
  };
  volunteerFeedback: Array<{
    event_id: number;
    event_title: string;
    volunteer_comment: string;
    created_at: string;
    scholar_name: string;
    scholar_id: number;
  }>;
}

const EventFeedbackAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add date filter state variables
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(false);

  // Add refs for charts to capture them during export
  const sentimentChartRef = useRef<any>(null);
  const wordCloudContainerRef = useRef<HTMLDivElement>(null);

  const [selectedRole, setSelectedRole] = useState<string>("scholar");

  // Add state for sentiment data
  const [sentimentData, setSentimentData] = useState({
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [0, 0, 0],
      backgroundColor: ['#4CAF50', '#FFC107', '#FF5252'],
      borderWidth: 0
    }]
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        let url = '/admin/feedback-analytics';
        
        // Add date parameters if filter is applied
        if (isFilterApplied) {
          url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
        }
        
        const { data } = await api.get<FeedbackAnalytics>(url);
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching feedback analytics:', error);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh every 5 minutes, or when filter changes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, [startDate, endDate, isFilterApplied]); // Add filter dependencies

  // Apply date filter function
  const applyDateFilter = () => {
    if (startDate > endDate) {
      setError("Start date cannot be after end date");
      return;
    }
    
    setIsFilterApplied(true);
    setShowDateFilter(false);
  };

  // Reset date filter function
  const resetDateFilter = () => {
    setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)));
    setEndDate(new Date());
    setIsFilterApplied(false);
    setSelectedEvent(null);
    setFilterRating(null);
  };

  // Add the print export function
  const handleExportFeedback = () => {
    try {
      toast.info("Preparing export...");
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      
      // Prepare chart images if they're available
      let sentimentChartImg = '';
      if (sentimentChartRef.current) {
        sentimentChartImg = sentimentChartRef.current.canvas.toDataURL('image/png');
      }
      
      // Generate HTML content for the print window
      const currentDate = new Date().toLocaleDateString();
      const dateRange = isFilterApplied 
        ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
        : 'Last 30 days';
        
      // Ensure analytics is available before generating export
      if (!analytics) {
        toast.error("Analytics data not available for export");
        printWindow.close();
        return;
      }
      
      // Create printable HTML content
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Event Feedback Analytics Export - ${currentDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              padding: 20px;
            }
            h1, h2, h3 {
              color: #EE3F24;
              text-align: center;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #EE3F24;
              padding-bottom: 10px;
            }
            .date {
              font-weight: normal;
              font-size: 14px;
              color: #666;
            }
            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              margin-bottom: 30px;
            }
            .stat-card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .chart-container {
              margin: 20px 0;
              page-break-inside: avoid;
              border: 1px solid #eee;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
            }
            .chart-img {
              max-width: 500px;
              height: auto;
              display: block;
              margin: 0 auto;
            }
            .feedback-list {
              margin-top: 30px;
            }
            .event-feedback {
              margin-bottom: 20px;
              page-break-inside: avoid;
              border: 1px solid #eee;
              padding: 15px;
              border-radius: 8px;
            }
            .feedback-item {
              padding: 10px 0;
              border-bottom: 1px solid #eee;
            }
            .rating {
              color: #FF9800;
            }
            .word-frequency {
              columns: 3;
              margin: 0 auto;
              max-width: 600px;
              text-align: left;
            }
            .word-frequency-item {
              break-inside: avoid;
              margin-bottom: 5px;
            }
            @media print {
              body {
                padding: 0;
                margin: 20px;
              }
              h1 {
                font-size: 18px;
              }
              h2 {
                font-size: 16px;
              }
              h3 {
                font-size: 14px;
              }
              .no-break {
                page-break-inside: avoid;
              }
              .page-break {
                page-break-before: always;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Event Feedback Analytics Report</h1>
            <div class="date">Generated: ${currentDate}<br>Period: ${dateRange}</div>
          </div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <h3>Overall Rating</h3>
              <h2>${averageRating} / 5.0</h2>
            </div>
            <div class="stat-card">
              <h3>Total Feedback</h3>
              <h2>${analytics.overallStats.total_feedback}</h2>
            </div>
            <div class="stat-card">
              <h3>Events with Feedback</h3>
              <h2>${analytics.overallStats.events_with_feedback}</2>
            </div>
          </div>
          
          <div class="chart-container">
            <h2>Feedback Sentiment Distribution</h2>
            ${sentimentChartImg ? `<img src="${sentimentChartImg}" class="chart-img" alt="Sentiment Chart" />` : 'Chart not available'}
          </div>
          
          <div class="chart-container">
            <h2>Common Feedback Themes</h2>
            <div class="word-frequency">
              ${wordCloudData.slice(0, 30).map((word, index) => 
                `<div class="word-frequency-item">${index + 1}. ${word.text} (${word.value})</div>`
              ).join('')}
            </div>
          </div>
          
          <div class="feedback-list">
            <h2>Event Feedback Summary</h2>
            ${analytics.eventStats
              .filter(event => !selectedEvent || event.id === selectedEvent)
              .map(event => `
                <div class="event-feedback no-break">
                  <h3>${event.title}</h3>
                  <p>Average Rating: ${event.average_rating.toFixed(1)} | Total Feedback: ${event.feedback_count}</p>
                  ${event.feedback_details
                    .filter(feedback => !filterRating || feedback.rating === filterRating)
                    .slice(0, 5) // Limit to top 5 feedbacks per event
                    .map(feedback => `
                      <div class="feedback-item">
                        <div class="rating">${'★'.repeat(feedback.rating)}</div>
                        <p>${feedback.comment}</p>
                        <small>${feedback.user_name} - ${new Date(feedback.created_at).toLocaleDateString()}</small>
                      </div>
                    `).join('')}
                </div>
              `).join('')}
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      toast.success("Export ready. A print dialog will open.");
    } catch (error) {
      console.error('Error exporting feedback:', error);
      toast.error("Failed to export feedback data");
    }
  };

  // When role changes, update charts with filtered data
  useEffect(() => {
    if (analytics) {
      updateSentimentChartForRole();
    }
  }, [selectedRole, selectedEvent, filterRating, analytics]);

  // Simplify the sentiment data calculation to focus strictly on user roles
  const updateSentimentChartForRole = () => {
    if (!analytics) return;

    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    console.log(`Updating sentiment chart for role: ${selectedRole}`);

    // Get all event feedback, filtered by role and event (if selected)
    const filteredEvents = analytics.eventStats
      .filter(event => !selectedEvent || event.id === selectedEvent);
      
    if (selectedRole === "scholar") {
      // SIMPLIFIED: Only count feedback where user_role is scholar
      // and ignore volunteerFeedback completely
      filteredEvents.forEach(event => {
        const scholarFeedback = event.feedback_details.filter(
          feedback => feedback.user_role === 'scholar' && 
                     (!filterRating || feedback.rating === filterRating)
        );
        
        scholarFeedback.forEach(feedback => {
          if (feedback.rating >= 4) positiveCount++;
          else if (feedback.rating === 3) neutralCount++;
          else if (feedback.rating <= 2) negativeCount++;
        });
      });
      
      console.log(`Scholar feedback sentiment counts: ${positiveCount} positive, ${neutralCount} neutral, ${negativeCount} negative`);
    } else if (selectedRole === "volunteer") {
      // Only count feedback where user_role is volunteer
      filteredEvents.forEach(event => {
        const volunteerFeedback = event.feedback_details.filter(
          feedback => feedback.user_role === 'volunteer' && 
                     (!filterRating || feedback.rating === filterRating)
        );
        
        volunteerFeedback.forEach(feedback => {
          if (feedback.rating >= 4) positiveCount++;
          else if (feedback.rating === 3) neutralCount++;
          else if (feedback.rating <= 2) negativeCount++;
        });
      });
      
      console.log(`Volunteer feedback sentiment counts: ${positiveCount} positive, ${neutralCount} neutral, ${negativeCount} negative`);
    }

    // If no feedback found for the current filter, use the overall stats
    if (positiveCount === 0 && neutralCount === 0 && negativeCount === 0) {
      positiveCount = analytics.sentimentStats.positive_feedback;
      neutralCount = analytics.sentimentStats.neutral_feedback;
      negativeCount = analytics.sentimentStats.negative_feedback;
    }

    // Update sentiment chart data
    setSentimentData({
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [positiveCount, neutralCount, negativeCount],
        backgroundColor: ['#4CAF50', '#FFC107', '#FF5252'],
        borderWidth: 0
      }]
    });
  };

  // Simplify the word cloud data generation to focus strictly on user roles
const getFilteredWordCloudData = () => {
  if (!analytics) return [];
  console.log('Selected role for word cloud:', selectedRole);

  // Only process data for the current selected role
  if (selectedRole === "scholar") {
    // SCHOLAR-ONLY APPROACH: Only collect comments from event feedback where user_role = 'scholar'
    let scholarComments: string[] = [];
    
    // Get filtered events and only extract scholar feedback
    analytics.eventStats
      .filter(event => !selectedEvent || event.id === selectedEvent)
      .forEach(event => {
        // Get only scholar feedback
        const scholarEventFeedback = event.feedback_details.filter(
          feedback => feedback.user_role === 'scholar' && 
                     (!filterRating || feedback.rating === filterRating)
        );
        
        // Log what we found
        console.log(`Event ${event.id}: Found ${scholarEventFeedback.length} scholar feedback comments`);
        
        // Add non-empty comments to our array
        scholarEventFeedback.forEach(feedback => {
          if (feedback.comment && feedback.comment.trim()) {
            scholarComments.push(feedback.comment);
          }
        });
      });
    
    console.log(`Total scholar comments found: ${scholarComments.length}`);
    
    // If no scholar comments, return empty array
    if (scholarComments.length === 0) {
      console.log('No scholar comments to analyze');
      return [];
    }
    
    // Sample the first few comments for debugging
    if (scholarComments.length > 0) {
      console.log('Sample scholar comments:', scholarComments.slice(0, 2));
    }
    
    // Process scholar comments only
    return processCommentsForWordCloud(scholarComments);
    
  } else if (selectedRole === "volunteer") {
    // VOLUNTEER-ONLY APPROACH: Only collect comments from event feedback where user_role = 'volunteer'
    let volunteerComments: string[] = [];
    
    // Get filtered events and only extract volunteer feedback
    analytics.eventStats
      .filter(event => !selectedEvent || event.id === selectedEvent)
      .forEach(event => {
        // Get only volunteer feedback
        const volunteerEventFeedback = event.feedback_details.filter(
          feedback => feedback.user_role === 'volunteer' && 
                     (!filterRating || feedback.rating === filterRating)
        );
        
        // Log what we found
        console.log(`Event ${event.id}: Found ${volunteerEventFeedback.length} volunteer feedback comments`);
        
        // Add non-empty comments to our array
        volunteerEventFeedback.forEach(feedback => {
          if (feedback.comment && feedback.comment.trim()) {
            volunteerComments.push(feedback.comment);
          }
        });
      });
    
    console.log(`Total volunteer comments found: ${volunteerComments.length}`);
    
    // If no volunteer comments, return empty array
    if (volunteerComments.length === 0) {
      console.log('No volunteer comments to analyze');
      return [];
    }
    
    // Sample the first few comments for debugging
    if (volunteerComments.length > 0) {
      console.log('Sample volunteer comments:', volunteerComments.slice(0, 2));
    }
    
    // Process volunteer comments only
    return processCommentsForWordCloud(volunteerComments);
  }
  
  // If no role matches or other issue, return empty array
  return [];
};

// Helper function to process comments into word cloud data
const processCommentsForWordCloud = (comments: string[]): { text: string, value: number }[] => {
  // Join all comments and convert to lowercase
  const allCommentsText = comments.join(' ').toLowerCase();
  
  // Extract words (only alphabetic words with 4+ characters)
  const words = allCommentsText.match(/\b[a-z]{4,}\b/g) || [];
  
  // Define common words to exclude (stop words)
  const stopWords = new Set([
    'with', 'this', 'that', 'from', 'have', 'were', 'they', 'will', 
    'would', 'should', 'could', 'what', 'when', 'where', 'which',
    'your', 'their', 'very', 'some', 'just', 'because', 'about'
  ]);
  
  // Count word frequency
  const frequency: { [key: string]: number } = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  // Convert to word cloud format
  return Object.entries(frequency)
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 30); // Only keep top 30 words
};

  // Add type safety check for average_rating
  const averageRating = analytics?.overallStats?.average_rating !== undefined 
    ? Number(analytics.overallStats.average_rating).toFixed(1)
    : '0.0';

  const wordCloudData = analytics?.wordFrequency?.map(({ word, frequency }) => ({
    text: word,
    value: frequency
  })) || [];

  if (loading) return <div className="loading-container">Loading analytics data...</div>;
  if (error && !analytics) return <div className="error-container">{error}</div>;
  if (!analytics) return <div className="error-container">No analytics data available</div>;

  return (
    <div className="feedback-analytics-container">
      {error && <div className="error-banner">{error}</div>}
      
      {/* Add date filter UI at the top */}
      <div className="feedback-filter-container">
        <div className="feedback-date-filter-button" onClick={() => setShowDateFilter(!showDateFilter)}>
          <FaFilter size={14} color="#FF3D00" />
          <span>
            {isFilterApplied 
              ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
              : "Filter by Date"}
          </span>
        </div>
        
        {isFilterApplied && (
          <button 
            className="feedback-date-reset-button" 
            onClick={resetDateFilter}>
            Reset
          </button>
        )}
        
        {/* Add Export Button */}
        <button 
          className="feedback-export-button" 
          onClick={handleExportFeedback}
          title="Export feedback data">
          <FaPrint size={14} />
          <span>Export</span>
        </button>
        
        {showDateFilter && (
          <div className="feedback-date-filter-dropdown">
            <div className="feedback-date-filter-inputs">
              <div className="feedback-date-input-group">
                <label>From:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date: Date | null) => date && setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  maxDate={new Date()}
                  className="feedback-date-picker"
                />
              </div>
              <div className="feedback-date-input-group">
                <label>To:</label>
                <DatePicker
                  selected={endDate}
                  onChange={(date: Date | null) => date && setEndDate(date)}
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                  maxDate={new Date()}
                  className="feedback-date-picker"
                />
              </div>
            </div>
            <div className="feedback-date-filter-actions">
              <button className="feedback-apply-filter-button" onClick={applyDateFilter}>Apply Filter</button>
              <button className="feedback-cancel-filter-button" onClick={() => setShowDateFilter(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Filter indication bar */}
      {isFilterApplied && (
        <div className="feedback-filter-active-bar">
          <FaCalendarAlt size={16} color="#FF3D00" />
          <span>Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}</span>
        </div>
      )}
      
      {/* Rest of your existing UI components */}
      <div className="feedback-header">
        <p>Event Feedback</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card highlight-card">
          <h3>Overall Rating</h3>
          <h2>{averageRating} / 5.0</h2>
        </div>
        <div className="stat-card">
          <h3>Total Feedback</h3>
          <h2>{analytics.overallStats.total_feedback}</h2>
        </div>
        <div className="stat-card">
          <h3>Events with Feedback</h3>
          <h2>{analytics.overallStats.events_with_feedback}</h2>
        </div>
      </div>

      <div className="charts-section">
        <div className="sentiment-chart">
          <h2>
            {selectedRole === 'scholar' 
              ? 'Scholar Feedback Sentiment' 
              : 'Volunteer Feedback Sentiment'}
          </h2>
          <div>
            <Pie 
              ref={sentimentChartRef}
              data={sentimentData}
              options={{ 
                maintainAspectRatio: true,
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      padding: 20,
                      usePointStyle: true
                    }
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const dataset = context.dataset;
                        const total = dataset.data.reduce((acc: number, data: number) => acc + data, 0);
                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="word-cloud-container" ref={wordCloudContainerRef}>
          <h2>
            {selectedRole === 'scholar' 
              ? 'Top Words in Scholar Feedback' 
              : 'Top Words in Volunteer Feedback'}
          </h2>
          <WordCloudWithErrorHandling
            words={getFilteredWordCloudData()}
            options={{
              colors: ['#FF3D00', '#FF6E40', '#FF9E80'],
              fontFamily: 'Inter',
              fontSizes: [20, 60],
              rotations: 0,
              rotationAngles: [0, 0],
              deterministic: true,
              enableTooltip: true,
              padding: 3,
              fontStyle: 'normal',
              fontWeight: 'normal',
              transitionDuration: 300
            }}
          />
        </div>
      </div>

      {/* NEW: Role selection tabs */}
      <div className="feedback-role-tabs">
        <button 
          className={selectedRole === "scholar" ? "role-tab-active" : ""}
          onClick={() => setSelectedRole("scholar")}
        >
          Scholar Feedback
        </button>
        <button 
          className={selectedRole === "volunteer" ? "role-tab-active" : ""}
          onClick={() => setSelectedRole("volunteer")}
        >
          Volunteer Feedback
        </button>
      </div>

      {/* Common filters for both sections */}
      <div className="feedback-filters">
        <div>
          <label htmlFor="event-select">Event:</label>
          <select 
            id="event-select"
            onChange={(e) => setSelectedEvent(e.target.value ? Number(e.target.value) : null)}
            value={selectedEvent || ''}
          >
            <option value="">All Events</option>
            {analytics.eventStats.map(event => (
              <option key={event.id} value={event.id}>{event.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rating-select">Rating:</label>
          <select
            id="rating-select"
            onChange={(e) => setFilterRating(e.target.value ? Number(e.target.value) : null)}
            value={filterRating || ''}
          >
            <option value="">All Ratings</option>
            {[5, 4, 3, 2, 1].map(rating => (
              <option key={rating} value={rating}>{rating} Stars</option>
            ))}
          </select>
        </div>
      </div>

      {/* SCHOLAR FEEDBACK SECTION - MERGED */}
      {selectedRole === "scholar" && (
        <div className="scholar-feedback-section">
          <h2 className="section-title">Scholar Feedback</h2>
          
          {/* Regular Event Feedback by Scholars */}
          <div className="scholar-feedback-category">
            <h3 className="category-title">Event Feedback</h3>
            <div className="events-feedback-grid">
              {analytics.eventStats
                .filter(event => !selectedEvent || event.id === selectedEvent)
                .map(event => {
                  // Filter feedback by scholars
                  const scholarFeedback = event.feedback_details.filter(
                    feedback => feedback.user_role === 'scholar' && 
                    (!filterRating || feedback.rating === filterRating)
                  );
                  
                  if (scholarFeedback.length === 0) return null;
                  
                  return (
                    <div key={`scholar-${event.id}`} className="event-feedback-card scholar-card">
                      <h3>{event.title}</h3>
                      <p>Scholar Feedback: {scholarFeedback.length}</p>
                      <div className="feedback-list">
                        {scholarFeedback.map((feedback, index) => (
                          <div key={index} className="feedback-item">
                            <div className="rating">{'⭐'.repeat(feedback.rating)}</div>
                            <p>{feedback.comment}</p>
                            <small>
                              {feedback.user_name} - 
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
            </div>
              
            {/* Show message if no scholar feedback */}
            {analytics.eventStats
              .filter(event => !selectedEvent || event.id === selectedEvent)
              .every(event => !event.feedback_details.find(
                f => f.user_role === 'scholar' && (!filterRating || f.rating === filterRating)
              )) && (
              <div className="no-feedback-container">
                <p>No scholar feedback found for events.</p>
              </div>
            )}
          </div>

          {/* Scholar Feedback on Volunteers */}
          <div className="scholar-feedback-category">
            <h3 className="category-title">Volunteer Feedback</h3>
            <div className="volunteer-feedback-grid">
              {analytics.volunteerFeedback
                .filter(feedback => !selectedEvent || feedback.event_id === selectedEvent)
                .length === 0 ? (
                <div className="no-feedback-container">
                  <p>No volunteer feedback has been submitted by scholars yet.</p>
                </div>
              ) : (
                analytics.volunteerFeedback
                  .filter(feedback => !selectedEvent || feedback.event_id === selectedEvent)
                  .map((feedback, index) => (
                    <div key={index} className="volunteer-feedback-card">
                      <h3>{feedback.event_title}</h3>
                      <div className="feedback-item volunteer">
                        <p className="feedback-comment">{feedback.volunteer_comment}</p>
                        <div className="feedback-meta">
                          <span className="scholar-name">Scholar: {feedback.scholar_name}</span>
                          <span className="feedback-date">
                            {new Date(feedback.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* VOLUNTEER FEEDBACK SECTION */}
      {selectedRole === "volunteer" && (
        <div className="events-feedback-grid">
          {analytics.eventStats
            .filter(event => !selectedEvent || event.id === selectedEvent)
            .map(event => {
              // Filter feedback by volunteers
              const volunteerFeedback = event.feedback_details.filter(
                feedback => feedback.user_role === 'volunteer' && 
                (!filterRating || feedback.rating === filterRating)
              );
              
              if (volunteerFeedback.length === 0) return null;
              
              return (
                <div key={`volunteer-${event.id}`} className="event-feedback-card volunteer-card">
                  <h3>{event.title}</h3>
                  <p>Volunteer Feedback: {volunteerFeedback.length}</p>
                  <div className="feedback-list">
                    {volunteerFeedback.map((feedback, index) => (
                      <div key={index} className="feedback-item">
                        <div className="rating">{'⭐'.repeat(feedback.rating)}</div>
                        <p>{feedback.comment}</p>
                        <small>
                          {feedback.user_name} - 
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </small>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }).filter(Boolean)}
            
          {/* Show message if no volunteer feedback */}
          {analytics.eventStats
            .filter(event => !selectedEvent || event.id === selectedEvent)
            .every(event => !event.feedback_details.find(
              f => f.user_role === 'volunteer' && (!filterRating || f.rating === filterRating)
            )) && (
            <div className="no-feedback-container">
              <p>No volunteer feedback found for the selected filters.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventFeedbackAnalytics;
