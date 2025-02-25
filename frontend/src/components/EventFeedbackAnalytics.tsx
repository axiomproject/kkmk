import React, { useEffect, useState } from 'react';
import api from '../config/axios'; // Replace axios import
import ReactWordcloud from 'react-wordcloud';
import { Line, Pie } from 'react-chartjs-2';
import '../styles/EventFeedbackAnalytics.css';

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

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data } = await api.get<FeedbackAnalytics>('/admin/feedback-analytics');
        setAnalytics(data);
      } catch (error) {
        console.error('Error fetching feedback analytics:', error);
      }
    };

    fetchAnalytics();
    // Refresh every 5 minutes
    const interval = setInterval(fetchAnalytics, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!analytics) return <div>Loading analytics...</div>;

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
          <ReactWordcloud 
            words={selectedEvent || filterRating ? getFilteredWordCloudData() : wordCloudData}
            options={{
              colors: ['#FF3D00', '#FF6E40', '#FF9E80'],
              fontFamily: 'Inter',
              fontSizes: [20, 60],
              rotations: 0,
              rotationAngles: [0, 0],
              deterministic: true, // Add this to make layout consistent
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

export default EventFeedbackAnalytics;
