import React, { useEffect, useState, memo, Suspense, lazy } from 'react';
import api from '../config/axios';
import { Line, Pie } from 'react-chartjs-2';
import '../styles/EventFeedbackAnalytics.css';

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
    }>;
  }>;
  sentimentStats: {
    positive_feedback: number;
    neutral_feedback: number;
    negative_feedback: number;
  };
}

const EventFeedbackAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        // Try the correct API endpoint - check if it might be a different path
        const { data } = await api.get<FeedbackAnalytics>('/admin/feedback-analytics');
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching feedback analytics:', error);
        setError('Failed to load analytics data. Please try again later.');
        
        // For development/testing - use mock data if API fails
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for development');
          setAnalytics(getMockAnalyticsData());
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading-container">Loading analytics data...</div>;
  if (error && !analytics) return <div className="error-container">{error}</div>;
  if (!analytics) return <div className="error-container">No analytics data available</div>;

  // Add type safety check for average_rating
  const averageRating = typeof analytics.overallStats.average_rating === 'number' 
    ? analytics.overallStats.average_rating.toFixed(1)
    : '0.0';

  const wordCloudData = analytics.wordFrequency.map(({ word, frequency }) => ({
    text: word,
    value: frequency
  }));

  const getFilteredWordCloudData = () => {
    if (!analytics) return [];

    // Get filtered events
    const filteredEvents = analytics.eventStats
      .filter(event => !selectedEvent || event.id === selectedEvent);

    // Collect all comments from filtered events and ratings
    const allComments = filteredEvents.flatMap(event =>
      event.feedback_details
        .filter(feedback => !filterRating || feedback.rating === filterRating)
        .map(feedback => feedback.comment)
    ).join(' ').toLowerCase();

    // Split into words and count frequency
    const words = allComments.match(/\b\w+\b/g) || [];
    const frequency: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (word.length > 3) { // Only count words longer than 3 characters
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });

    // Convert to word cloud format
    return Object.entries(frequency)
      .map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 50); // Keep top 50 words
  };

  const sentimentData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [{
      data: [
        analytics.sentimentStats.positive_feedback,
        analytics.sentimentStats.neutral_feedback,
        analytics.sentimentStats.negative_feedback
      ],
      backgroundColor: ['#4CAF50', '#FFC107', '#FF5252'],
      borderWidth: 0
    }]
  };

  return (
    <div className="feedback-analytics-container">
      {error && <div className="error-banner">{error}</div>}
      
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
          <h2>Feedback Sentiment Distribution</h2>
          <div>
            <Pie 
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
                  }
                }
              }} 
            />
          </div>
        </div>

        <div className="word-cloud-container">
          <h2>Common Feedback Themes</h2>
          <WordCloudWithErrorHandling
            words={selectedEvent || filterRating ? getFilteredWordCloudData() : wordCloudData}
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

      <div className="events-feedback">
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

        <div className="events-feedback-grid">
          {analytics.eventStats
            .filter(event => !selectedEvent || event.id === selectedEvent)
            .map(event => (
              <div key={event.id} className="event-feedback-card">
                <h3>{event.title}</h3>
                <p>Average Rating: {event.average_rating.toFixed(1)}</p>
                <p>Total Feedback: {event.feedback_count}</p>
                
                <div className="feedback-list">
                  {event.feedback_details
                    .filter(feedback => !filterRating || feedback.rating === filterRating)
                    .map((feedback, index) => (
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
            ))}
        </div>
      </div>
    </div>
  );
};

// Mock data function for development/testing purposes
const getMockAnalyticsData = (): FeedbackAnalytics => {
  return {
    overallStats: {
      average_rating: 4.2,
      total_feedback: 125,
      events_with_feedback: 8
    },
    wordFrequency: [
      { word: "excellent", frequency: 32 },
      { word: "informative", frequency: 28 },
      { word: "engaging", frequency: 25 },
      { word: "helpful", frequency: 20 },
      { word: "interesting", frequency: 18 }
    ],
    eventStats: [
      {
        id: 1,
        title: "Tech Conference 2023",
        average_rating: 4.5,
        feedback_count: 45,
        feedback_details: [
          {
            rating: 5,
            comment: "Excellent event with great speakers",
            created_at: "2023-06-15T10:30:00Z",
            user_name: "John Doe"
          },
          {
            rating: 4,
            comment: "Very informative sessions",
            created_at: "2023-06-15T11:45:00Z",
            user_name: "Jane Smith"
          }
        ]
      },
      {
        id: 2,
        title: "Product Launch",
        average_rating: 3.8,
        feedback_count: 32,
        feedback_details: [
          {
            rating: 4,
            comment: "Great product demonstration",
            created_at: "2023-07-05T14:20:00Z",
            user_name: "Mike Johnson"
          },
          {
            rating: 3,
            comment: "Good event but could use better organization",
            created_at: "2023-07-05T15:10:00Z",
            user_name: "Sarah Wilson"
          }
        ]
      }
    ],
    sentimentStats: {
      positive_feedback: 87,
      neutral_feedback: 25,
      negative_feedback: 13
    }
  };
};

export default EventFeedbackAnalytics;
