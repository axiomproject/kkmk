import React, { useState, useEffect, useRef } from 'react';
import api from '../../config/axios'; // Replace axios import
import { Chart as ChartJS } from 'chart.js/auto';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { FaPoll, FaPrint, FaDownload, FaChartBar, FaChartPie, FaFilter, FaCalendarAlt } from 'react-icons/fa';
import '../../styles/ForumAnalytics.css';
import { CircularProgress, Typography } from '@mui/material';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from 'react-toastify'; // Add toast for feedback

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

  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // Add refs for charts to capture them during export
  const barChartRef = useRef<any>(null);
  const doughnutChartRef = useRef<any>(null);
  const lineChartRef = useRef<any>(null);

  useEffect(() => {
    fetchPollData();
  }, [startDate, endDate, isFilterApplied]);

  const fetchPollData = async () => {
    try {
      setLoading(true);
      setFilterError(null);
      
      console.log('Fetching with filters:', { 
        isFilterApplied, 
        startDate: startDate.toISOString().split('T')[0], 
        endDate: endDate.toISOString().split('T')[0] 
      });
      
      let url = '/forum/polls/analytics';
      if (isFilterApplied) {
        url += `?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      }
      const response = await api.get(url);
      console.log('Response data:', response.data);
      setPollData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching poll data:', error);
      setFilterError('Failed to fetch data with selected date range');
      setLoading(false);
    }
  };

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

  const applyDateFilter = () => {
    if (startDate > endDate) {
      setFilterError("Start date cannot be after end date");
      return;
    }
    
    console.log('Applying date filter:', { startDate, endDate });
    setIsFilterApplied(true);
    setShowDateFilter(false);
  };

  const resetDateFilter = () => {
    setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)));
    setEndDate(new Date());
    setIsFilterApplied(false);
  };

  const handleExportForum = () => {
    try {
      toast.info("Preparing export...");
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up blocked. Please allow pop-ups for this site.");
        return;
      }
      
      // Prepare chart images if they're available
      let barChartImg = '';
      let doughnutChartImg = '';
      let lineChartImg = '';
      
      if (barChartRef.current) {
        barChartImg = barChartRef.current.toBase64Image();
      }
      if (doughnutChartRef.current) {
        doughnutChartImg = doughnutChartRef.current.toBase64Image();
      }
      if (lineChartRef.current) {
        lineChartImg = lineChartRef.current.toBase64Image();
      }
      
      // Prepare the HTML content for the new window
      const htmlContent = `
        <html>
          <head>
            <title>Forum Analytics Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h2, h3 { color: #FF3D00; }
              .chart-container { margin-bottom: 20px; }
              .poll-details { margin-bottom: 20px; }
              .poll-item { margin-bottom: 10px; }
              .poll-options { margin-left: 20px; }
              .poll-option { margin-bottom: 5px; }
              .option-bar { height: 10px; background-color: #f0f0f0; }
              .option-progress { height: 100%; }
            </style>
          </head>
          <body>
            <h2>Forum Poll Analytics</h2>
            <div class="poll-details">
              ${pollData.map(poll => `
                <div class="poll-item">
                  <h3>${poll.title}</h3>
                  <div class="poll-options">
                    ${poll.options.map(option => `
                      <div class="poll-option">
                        <div class="option-info">
                          <span class="option-text">${option.text}</span>
                          <span class="option-votes">${option.votes} votes (${((option.votes / poll.totalVotes) * 100).toFixed(1)}%)</span>
                        </div>
                        <div class="option-bar">
                          <div class="option-progress" style="width: ${(option.votes / poll.totalVotes) * 100}%; background-color: ${redPalette.shades[poll.options.indexOf(option) % redPalette.shades.length]};"></div>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                  <div class="poll-meta">
                    <div>Total Votes: ${poll.totalVotes}</div>
                    <div>Category: ${poll.category}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div class="chart-container">
              <h3>Votes by Category</h3>
              <img src="${barChartImg}" alt="Bar Chart" />
            </div>
            <div class="chart-container">
              <h3>Poll Distribution</h3>
              <img src="${doughnutChartImg}" alt="Doughnut Chart" />
            </div>
            <div class="chart-container">
              <h3>Engagement Timeline</h3>
              <img src="${lineChartImg}" alt="Line Chart" />
            </div>
          </body>
        </html>
      `;
      
      // Write the HTML content to the new window and print
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
      
      toast.success("Export completed successfully!");
    } catch (error) {
      console.error("Error during export:", error);
      toast.error("Failed to export data. Please try again.");
    }
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
        
        {/* Move filter to header right section */}
        <div className="header-right-section">
          {/* Filter component */}
          <div className="forum-filter-container">
            {filterError && (
              <div className="forum-error-message">
                {filterError}
              </div>
            )}
            
            <div className="forum-date-filter-button" onClick={() => setShowDateFilter(!showDateFilter)}>
              <FaFilter size={14} color="#FF3D00" />
              <span>
                {isFilterApplied 
                  ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
                  : "Filter by Date"}
              </span>
            </div>
            
            {isFilterApplied && (
              <button 
                className="forum-date-reset-button" 
                onClick={resetDateFilter}>
                Reset
              </button>
            )}
            
            {showDateFilter && (
              <div className="forum-date-filter-dropdown">
                <div className="forum-date-filter-inputs">
                  <div className="forum-date-input-group">
                    <label>From:</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => date && setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      maxDate={new Date()}
                      className="forum-date-picker"
                    />
                  </div>
                  <div className="forum-date-input-group">
                    <label>To:</label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => date && setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      maxDate={new Date()}
                      className="forum-date-picker"
                    />
                  </div>
                </div>
                <div className="forum-date-filter-actions">
                  <button className="forum-apply-filter-button" onClick={applyDateFilter}>Apply Filter</button>
                  <button className="forum-cancel-filter-button" onClick={() => setShowDateFilter(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="header-actions">
            <button className="action-button print" onClick={(e) => handleExportForum()}>
              <FaPrint /> Export Report
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
      </div>

      {isFilterApplied && (
        <div className="forum-filter-active-bar">
          <FaCalendarAlt size={16} color="#FF3D00" />
          <span>Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}</span>
        </div>
      )}

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
            <Bar ref={barChartRef} data={getBarChartData()} options={{
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
              <Doughnut ref={doughnutChartRef} data={getDoughnutData()} options={{
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
              <Line ref={lineChartRef} data={getLineChartData()} options={{
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

