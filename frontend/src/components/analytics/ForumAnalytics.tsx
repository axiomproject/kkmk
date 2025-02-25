import React, { useState, useEffect, useRef } from 'react';
import { Chart as ChartJS } from 'chart.js/auto';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FaPoll, FaPrint, FaDownload, FaChartBar, FaChartPie } from 'react-icons/fa';
import '../../styles/ForumAnalytics.css';
import { CircularProgress, Typography } from '@mui/material';
import { useReactToPrint } from 'react-to-print';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5175';

const redPalette = {
  primary: '#FF3D00',
  shades: [
    '#FFE6E6', // lightest
    '#FFCCCC',
    '#FF9999',
    '#FF6666',
    '#FF3333',
    '#FF0000',
    '#CC0000',
    '#990000'  // darkest
  ]
};

interface PollData {
  title: string;
  totalVotes: number;
  options: {
    text: string;
    votes: number;
  }[];
  category: string;
  created_at: string;
}

const ForumAnalytics: React.FC = () => {
  const [pollData, setPollData] = useState<PollData[]>([]);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef(null);

  useEffect(() => {
    fetchPollData();
  }, []);

  const fetchPollData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/forum/polls/analytics`);
      const data = await response.json();
      setPollData(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching poll data:', error);
      setLoading(false);
    }
  };

  const handlePrint = useReactToPrint({
    documentTitle: 'Forum Analytics Report',
    contentRef: componentRef,
    pageStyle: `
      @page {
        size: A4;
        margin: 20mm;
      }
      @media print {
        html, body {
          height: initial !important;
          overflow: initial !important;
          -webkit-print-color-adjust: exact;
        }
        .header-actions, .print-hide {
          display: none !important;
        }
        .analytics-grid {
          transform: scale(0.9);
          transform-origin: top left;
        }
        .chart-container {
          page-break-inside: avoid;
          break-inside: avoid;
        }
      }
    `
  });

  const getBarChartData = () => {
    const pollsByCategory = pollData.reduce((acc: { [key: string]: number }, poll) => {
      acc[poll.category] = (acc[poll.category] || 0) + poll.totalVotes;
      return acc;
    }, {});

    return {
      labels: Object.keys(pollsByCategory),
      datasets: [{
        label: 'Total Votes',
        data: Object.values(pollsByCategory),
        backgroundColor: redPalette.shades[3], // Use a mid-tone red
        borderWidth: 1,
        borderColor: redPalette.primary
      }]
    };
  };

  const getDoughnutData = () => {
    const totalVotesByPoll = pollData.map(poll => ({
      name: poll.title,
      votes: poll.totalVotes
    }));

    return {
      labels: totalVotesByPoll.map(p => p.name),
      datasets: [{
        data: totalVotesByPoll.map(p => p.votes),
        backgroundColor: redPalette.shades,
        borderColor: redPalette.primary,
        borderWidth: 1
      }]
    };
  };

  const getLineChartData = () => {
    const sortedPolls = [...pollData].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      labels: sortedPolls.map(poll => new Date(poll.created_at).toLocaleDateString()),
      datasets: [{
        label: 'Engagement Over Time',
        data: sortedPolls.map(poll => poll.totalVotes),
        borderColor: redPalette.primary,
        backgroundColor: `${redPalette.primary}20`, // 20 is hex for 12% opacity
        tension: 0.4,
        fill: true,
        pointBackgroundColor: redPalette.primary,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: redPalette.primary
      }]
    };
  };

  if (loading) {
    return (
      <div className="forum-analytics-loading">
        <CircularProgress />
        <Typography>Loading analytics data...</Typography>
      </div>
    );
  }

  return (
    <div className="analytics-section forum-analytics" ref={componentRef}>
      <div className="analytics-header">
        <div className="header-lefts">
          <FaPoll className="header-icon" />
          <h2>Forum Poll</h2>
        </div>
        <div className="header-actions">
          <button className="action-button print" onClick={(e) => handlePrint()}>
            <FaPrint /> Print Report
          </button>
          <button 
            className="action-button export"
            onClick={() => {
              const jsonStr = JSON.stringify(pollData, null, 2);
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = 'forum-analytics.json';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }}
          >
            <FaDownload /> Export Data
          </button>
        </div>
      </div>

      <div className="analytics-grid">
        {/* Detailed Poll Results card - moved to top */}
        <div className="analytics-card full-width">
          <div className="card-header">
            <FaPoll className="card-icon" />
            <h3>Detailed Poll Results</h3>
          </div>
          <div className="poll-details">
            {pollData.map((poll, index) => (
              <div key={index} className="poll-item">
                <h4>{poll.title}</h4>
                <div className="poll-options">
                  {poll.options.map((option, optIndex) => (
                    <div key={optIndex} className="poll-option">
                      <div className="option-info">
                        <span className="option-text">{option.text}</span>
                        <span className="option-votes">
                          {option.votes} votes {poll.totalVotes > 0 && 
                            `(${((option.votes / poll.totalVotes) * 100).toFixed(1)}%)`}
                        </span>
                      </div>
                      <div className="option-bar">
                        <div 
                          className="option-progress"
                          style={{ 
                            width: poll.totalVotes > 0 ? `${(option.votes / poll.totalVotes) * 100}%` : '0%',
                            backgroundColor: redPalette.shades[optIndex % redPalette.shades.length]
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="poll-meta">
                  <div>Total Votes: {poll.totalVotes}</div>
                  <div>Category: {poll.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Votes by Category card */}
        <div className="analytics-card full-width">
          <div className="card-header">
            <FaChartBar className="card-icon" />
            <h3>Votes by Category</h3>
          </div>
          <div className="chart-container">
            <Bar data={getBarChartData()} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false // Hide legend since we're showing category names on x-axis
                }
              },
              scales: {
                x: {
                  ticks: {
                    callback: function(value) {
                      // Split long category names
                      const label = this.getLabelForValue(value as number);
                      const maxLength = 15;
                      if (typeof label === 'string') {
                        if (label.length > maxLength) {
                          return label.slice(0, maxLength) + '...';
                        }
                        return label;
                      }
                    },
                    autoSkip: true,
                    maxRotation: 0, // Prevent rotation
                    minRotation: 0, // Prevent rotation
                    font: {
                      size: 10, // Smaller font size
                      family: "'Poppins', sans-serif"
                    }
                  }
                },
                y: {
                  beginAtZero: true,
                  grid: {
                    display: false
                  },
                  ticks: {
                    font: {
                      size: 10, // Smaller font size
                      family: "'Poppins', sans-serif"
                    }
                  }
                }
              },
              layout: {
                padding: {
                  left: 5,
                  right: 5,
                  top: 5,
                  bottom: 15 // Add more bottom padding for labels
                }
              }
            }} />
          </div>
        </div>

        {/* Chart pair container */}
        <div className="chart-pair-container">
          <div className="analytics-card">
            <div className="card-header">
              <FaChartPie className="card-icon" />
              <h3>Poll Distribution</h3>
            </div>
            <div className="chart-container">
              <Doughnut data={getDoughnutData()} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} />
            </div>
          </div>

          <div className="analytics-card">
            <div className="card-header">
              <FaChartBar className="card-icon" />
              <h3>Engagement Timeline</h3>
            </div>
            <div className="chart-container">
              <Line data={getLineChartData()} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumAnalytics;

