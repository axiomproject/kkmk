import React, { useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import axios from 'axios';
import { toast } from 'react-toastify';

// Add xlsx library for Excel export
import * as XLSX from 'xlsx';

// Add date picker imports
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Register the necessary Chart.js components
import { Chart, registerables } from 'chart.js'; Chart.register(...registerables);
import "../../styles/admin/AdminAnalytics.css";
import { 
  FaMoneyBillWave, // for earnings
  FaChild, // for spending
  FaHandHoldingHeart, // for donations
  FaGift, // for flag
  FaUsers, // for tasks
  FaChartLine, // for total
  FaUserCircle, // for donor avatar
  FaCalendarAlt,  // Add this import
  FaChartBar,  // Add this import
  FaCheck, // Add this import
  FaCalendarPlus,
  FaFilter, // Add this for filter icon
  FaDownload // Add this for download icon
} from 'react-icons/fa';
import EventFeedbackAnalytics from '../../components/EventFeedbackAnalytics';
import ForumAnalytics from '../../components/analytics/ForumAnalytics';


interface Donor {
  id: number;
  name: string;
  profile_photo: string | null;
  total_donations: string;
}

interface DonationTimeStats {
  data: number[];
  period: string;
  donations: {
    morning: number;
    afternoon: number;
    evening: number;
  };
  total: number;
}

interface DonationTrends {
  labels: string[];
  data: number[];
  current_total: string;
  percentage_change: string;
}

interface DailyTraffic {
  hourlyData: number[];
  total: number;
  percentageChange: string;
}

  const baseURL = axios.defaults.baseURL || 'http://localhost:5175';

const Analytics: React.FC = () => {
  const [scholarCount, setScholarCount] = useState<number>(0);
  const [itemsDistributed, setItemsDistributed] = useState<number>(0);
  const [newSponsorsCount, setNewSponsorsCount] = useState<number>(0);
  const [newVolunteersCount, setNewVolunteersCount] = useState<number>(0);
  const [eventsCount, setEventsCount] = useState<number>(0);
  const [generousDonors, setGenerousDonors] = useState<Donor[]>([]);
  const [donationSummary, setDonationSummary] = useState<{
    current_total: string;
    percentage_change: string;
  }>({ current_total: '₱0.00', percentage_change: '0.00' });
  const [timeStats, setTimeStats] = useState<DonationTimeStats>({
    data: [0, 0, 0],
    period: '',
    donations: { morning: 0, afternoon: 0, evening: 0 },
    total: 0
  });
  const [trendStats, setTrendStats] = useState<DonationTrends>({
    labels: [],
    data: [],
    current_total: '₱0.00',
    percentage_change: '0.00'
  });
  const [dailyTraffic, setDailyTraffic] = useState<DailyTraffic>({
    hourlyData: [],
    total: 0,
    percentageChange: '0'
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Add date filter state variables
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isFilterApplied, setIsFilterApplied] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get authentication token
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Authentication required. Please log in.');
          setIsLoading(false);
          return;
        }
        
        // Common request options with auth header
        const requestOptions = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          },
          params: isFilterApplied ? {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          } : {}
        };
        
        // Helper function to fetch data with error handling
        const fetchEndpoint = async (endpoint: string) => {
          try {
            console.log(`Fetching from ${endpoint}...`, requestOptions);
            const response = await axios.get(endpoint, requestOptions);
            return response.data;
          } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            throw error;
          }
        };

        // Fetch scholar count
        const scholarData = await fetchEndpoint('/api/admin/scholar-count');
        setScholarCount(scholarData.count);

        // Fetch items distributed
        const itemsData = await fetchEndpoint('/api/admin/items-distributed');
        setItemsDistributed(itemsData.count);

        // Fetch new sponsors count
        const sponsorsData = await fetchEndpoint('/api/admin/new-sponsors-count');
        setNewSponsorsCount(sponsorsData.count);

        // Fetch new volunteers count
        const volunteersData = await fetchEndpoint('/api/admin/new-volunteers-count');
        setNewVolunteersCount(volunteersData.count);

        // Fetch events count
        const eventsData = await fetchEndpoint('/api/admin/events-count');
        setEventsCount(eventsData.count);

        // Fetch generous donors
        const donorsData = await fetchEndpoint('/api/admin/generous-donors');
        setGenerousDonors(donorsData);

        // Fetch donations summary
        const donationsData = await fetchEndpoint('/api/admin/donations-summary');
        setDonationSummary(donationsData);

        // Fetch donation time statistics
        const timeData = await fetchEndpoint('/api/admin/donation-time-stats');
        setTimeStats(timeData);

        // Fetch donation trends
        const trendsData = await fetchEndpoint('/api/admin/donation-trends');
        setTrendStats(trendsData);

        // Fetch daily traffic
        const trafficData = await fetchEndpoint('/api/admin/daily-traffic');
        setDailyTraffic(trafficData);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        
        // Handle different error types
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 401) {
            setError('Authentication error: Please log in again');
            toast.error("Authentication failed. Please log in again.");
          } else {
            setError(`API error: ${error.response?.data?.error || error.message}`);
            toast.error("Failed to load analytics data");
          }
        } else {
          setError('An unexpected error occurred');
          toast.error("An unexpected error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    // Refresh every 5 minutes, but also when date filters change
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, [startDate, endDate, isFilterApplied]); // Add dependencies to re-fetch when dates change

  // Add modal state
  const [showDonationModal, setShowDonationModal] = React.useState(false);
  const [modalContent, setModalContent] = React.useState({
    title: '',
    data: {} as Record<string, string | number>
  });

  const getTrendClass = (value: string | number): string => {
    if (typeof value === 'string') {
      if (value.includes('+')) return 'positive';
      if (value.includes('-')) return 'negative';
    }
    return '';
  };

  // Add function to get current month name
  const getCurrentMonth = () => {
    return new Date().toLocaleString('en-US', { month: 'long' });
  };

  // Add function to apply date filter
  const applyDateFilter = () => {
    if (startDate > endDate) {
      toast.error("Start date cannot be after end date");
      return;
    }
    
    setIsFilterApplied(true);
    setShowDateFilter(false);
    toast.info("Applying date filter...");
  };

  // Add function to reset date filter
  const resetDateFilter = () => {
    setStartDate(new Date(new Date().setDate(new Date().getDate() - 30)));
    setEndDate(new Date());
    setIsFilterApplied(false);
    toast.info("Filter reset to default (last 30 days)");
  };

  // Add function to handle exporting analytics data
  const handleExportAnalytics = () => {
    try {
      // Create a new workbook
      const wb = XLSX.utils.book_new();
      
      // Format the date for the filename
      const dateRange = isFilterApplied 
        ? `${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}`
        : 'last_30_days';
        
      // Convert simple metrics to a worksheet
      const metricsData = [
        ['Analytics Report', `${isFilterApplied ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}` : 'Last 30 Days'}`],
        [''], // Empty row for spacing
        ['Metric', 'Value', 'Change %'],
        ['Total Scholars', scholarCount, ''],
        ['Donations', donationSummary.current_total, `${donationSummary.percentage_change}%`],
        ['Items Distributed', itemsDistributed, ''],
        ['New Sponsors', newSponsorsCount, ''],
        ['New Volunteers', newVolunteersCount, ''],
        ['Total Events', eventsCount, '']
      ];
      
      const metricsWS = XLSX.utils.aoa_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(wb, metricsWS, 'Overview');
      
      // Add donation trends data
      const trendsData = [
        ['Donation Trends'],
        ['Period', 'Amount'],
        ...trendStats.labels.map((label, index) => [
          label, 
          trendStats.data[index]
        ])
      ];
      const trendsWS = XLSX.utils.aoa_to_sheet(trendsData);
      XLSX.utils.book_append_sheet(wb, trendsWS, 'Donation Trends');
      
      // Add donation time distribution data
      const timeData = [
        ['Donation Time Distribution', timeStats.period],
        ['Time Period', 'Donations', 'Percentage'],
        ['Morning (5AM-12PM)', timeStats.donations.morning, 
          `${((timeStats.donations.morning / timeStats.total) * 100).toFixed(1)}%`],
        ['Afternoon (12PM-4PM)', timeStats.donations.afternoon, 
          `${((timeStats.donations.afternoon / timeStats.total) * 100).toFixed(1)}%`],
        ['Evening (4PM-9PM)', timeStats.donations.evening, 
          `${((timeStats.donations.evening / timeStats.total) * 100).toFixed(1)}%`],
        ['Total', timeStats.total, '100%']
      ];
      const timeWS = XLSX.utils.aoa_to_sheet(timeData);
      XLSX.utils.book_append_sheet(wb, timeWS, 'Donation Time Analysis');
      
      // Add daily traffic data
      const trafficData = [
        ['Daily Traffic'],
        ['Time Slot', 'Visitors'],
        ['00-04', dailyTraffic.hourlyData[0] || 0],
        ['04-08', dailyTraffic.hourlyData[1] || 0],
        ['08-12', dailyTraffic.hourlyData[2] || 0],
        ['12-16', dailyTraffic.hourlyData[3] || 0],
        ['16-20', dailyTraffic.hourlyData[4] || 0],
        ['20-24', dailyTraffic.hourlyData[5] || 0],
        ['', ''],
        ['Total', dailyTraffic.total],
        ['Change', `${dailyTraffic.percentageChange}%`]
      ];
      const trafficWS = XLSX.utils.aoa_to_sheet(trafficData);
      XLSX.utils.book_append_sheet(wb, trafficWS, 'Daily Traffic');
      
      // Add generous donors data
      const donorsData = [
        ['Most Generous Donors'],
        ['Name', 'Total Donations'],
        ...generousDonors.map(donor => [
          donor.name,
          donor.total_donations
        ])
      ];
      const donorsWS = XLSX.utils.aoa_to_sheet(donorsData);
      XLSX.utils.book_append_sheet(wb, donorsWS, 'Top Donors');

      // Generate & download Excel file
      XLSX.writeFile(wb, `analytics_report_${dateRange}.xlsx`);
      
      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting analytics data:', error);
      toast.error('Failed to export analytics data');
    }
  };

  // Updated bar chart data
  const barData = {
    labels: ["00-04", "04-08", "08-12", "12-16", "16-20", "20-24"],
    datasets: [{
      data: dailyTraffic.hourlyData,
      backgroundColor: function(context: any) {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return;
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, '#FFE6E6');
        gradient.addColorStop(1, '#FF3D00');
        return gradient;
      },
      borderRadius: 6,
      borderSkipped: false,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#622226', // Changed from #1E293B to #622226
        padding: 12,
        titleFont: { 
          size: 12, 
          weight: 'normal' as const
        },
        bodyFont: { size: 12 },
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} visitors`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#718096',
          font: { size: 11 },
          display: true, // Ensure numbers are visible
          align: 'center' as const,
        },
        offset: true // This ensures labels are centered under bars
      },
      y: {
        display: false, // Changed from true to false to hide y-axis
        grid: {
          display: false // Hide grid lines as well
        },
        ticks: {
          display: false // Ensure ticks are hidden
        }
      }
    },
    barThickness: 12,
    // Add this to ensure bars are evenly spaced
    categoryPercentage: 0.8,
    barPercentage: 0.9
  } as const;

  // Updated donut chart data
  const donutData = {
    labels: ["Morning (5AM-12PM)", "Afternoon (12PM-4PM)", "Evening (4PM-9PM)"],
    datasets: [{
      data: timeStats.data,
      backgroundColor: ["#FFDCD7", "#EE3F24", "#BF4D3B"],
      hoverBackgroundColor: ["#FFDCD7", "#EE3F24", "#BF4D3B"],
      borderWidth: 2,
    }],
  };
  
  const donutOptions = {
    responsive: true,
    cutout: "70%",
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        align: "center" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 15,
          font: { size: 10 }
        },
      },
      tooltip: {
        backgroundColor: "#622226",
        padding: 15,
        bodyFont: {
          size: 12,
          weight: 'normal' as const,
        },
        titleFont: {
          size: 14,
          weight: 'bold' as const,
        },
        titleAlign: 'left' as const,
        bodyAlign: 'left' as const,
        callbacks: {
          label: (tooltipItem: { dataset: { data: number[] }; dataIndex: number }) => {
            const dataset = tooltipItem.dataset;
            const index = tooltipItem.dataIndex;
            const value = dataset.data[index];
            const total = dataset.data.reduce((acc: number, val: number) => acc + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const timeRanges = ["5am - 12pm", "12pm - 4pm", "4pm - 9pm"];
            const donations = [120, 85, 45];

            return [
              `Time: ${timeRanges[index]}`,
              `Donations: ${donations[index]}`,
              `${percentage}%`
            ];
          },
          title: (tooltipItems: any[]) => {
            return tooltipItems[0].label;
          }
        },
      },
    },
  };
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,  // Hide legend
      },
      tooltip: {
        backgroundColor: "#EE3F24",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: "#EE3F24",
        borderWidth: 1,
        padding: 10,
        boxPadding: 5,
        usePointStyle: true,
        callbacks: {
          label: (context: any) => {
            return `₱${(context.raw / 1000).toFixed(1)}K`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true, // Show x-axis
        grid: {
          display: false, // Hide grid lines
        },
        ticks: {
          color: '#718096',
          font: {
            family: 'Poppins',
            size: 12
          }
        }
      },
      y: {
        display: false, // Hide y-axis
        grid: {
          display: false
        }
      },
    },
  } as const;
  
  // Add new constant for traffic chart data and options
  const trafficChartData = {
    labels: ['5-8 AM', '9-12 PM', '1-4 PM', '5-8 PM', '9-12 AM'],
    datasets: [{
      data: dailyTraffic.hourlyData,
      backgroundColor: function(context: any) {
        const chart = context.chart;
        const {ctx, chartArea} = chart;
        if (!chartArea) return;
        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
        gradient.addColorStop(0, '#FFE6E6');
        gradient.addColorStop(1, '#FF3D00');
        return gradient;
      },
      borderRadius: 6,
      borderSkipped: false,
    }]
  };
  
  const trafficChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#622226',
        padding: 12,
        titleFont: {
          family: 'Poppins',
          size: 12
        },
        bodyFont: {
          family: 'Poppins',
          size: 12
        },
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.parsed.y} visitors`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#718096',
          font: { size: 11 },
          display: true,
          align: 'center' as const,
        },
        offset: true
      },
      y: {
        display: false,
        grid: {
          display: false
        },
        ticks: {
          display: false
        }
      }
    },
    barThickness: 12,
    categoryPercentage: 0.8,
    barPercentage: 0.9
  } as const;


  const handleDonationTimeReport = () => {
    // Store current scroll position before opening modal
    const scrollY = window.scrollY;
    document.documentElement.style.setProperty('--scroll-y', `${scrollY}px`);

    const morning = (timeStats.donations.morning / timeStats.total * 100).toFixed(1);
    const afternoon = (timeStats.donations.afternoon / timeStats.total * 100).toFixed(1);
    const evening = (timeStats.donations.evening / timeStats.total * 100).toFixed(1);

    setModalContent({
      title: 'Donation Time Analysis',
      data: {
        'Period': timeStats.period,
        'Morning (5AM-12PM)': `${morning}% (${timeStats.donations.morning} donations)`,
        'Afternoon (12PM-4PM)': `${afternoon}% (${timeStats.donations.afternoon} donations)`,
        'Evening (4PM-9PM)': `${evening}% (${timeStats.donations.evening} donations)`,
        'Total Donations': `${timeStats.total} donations`,
        'Most Active Time': timeStats.donations.morning > timeStats.donations.afternoon && 
                          timeStats.donations.morning > timeStats.donations.evening ? "Morning" :
                          timeStats.donations.afternoon > timeStats.donations.evening ? "Afternoon" : "Evening"
      }
    });
    setShowDonationModal(true);
  };

  const closeModal = () => {
    setShowDonationModal(false);
    setModalContent({
      title: '',
      data: {}
    });
  };

  return (
    <>
      {isLoading ? (
        <div className="analytics-loading">
          <div className="spinner"></div>
          <p>Loading analytics data...</p>
        </div>
      ) : error ? (
        <div className="analytics-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Add Date Filter UI */}
          <div className="sta-date-filter-container">
            <div className="sta-date-filter-button" onClick={() => setShowDateFilter(!showDateFilter)}>
              <FaFilter size={14} color="#FF3D00" />
              <span>
                {isFilterApplied 
                  ? `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`
                  : "Filter by Date"}
              </span>
            </div>
            
            {isFilterApplied && (
              <button 
                className="sta-date-reset-button" 
                onClick={resetDateFilter}>
                Reset
              </button>
            )}
            
            {/* Add Export Button */}
            <button 
              className="sta-export-button" 
              onClick={handleExportAnalytics}
              title="Export analytics data">
              <FaDownload size={14} />
              <span>Export</span>
            </button>
            
            {showDateFilter && (
              <div className="sta-date-filter-dropdown">
                <div className="sta-date-filter-inputs">
                  <div className="sta-date-input-group">
                    <label>From:</label>
                    <DatePicker
                      selected={startDate}
                      onChange={(date: Date | null) => date && setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      maxDate={new Date()}
                      className="sta-date-picker"
                    />
                  </div>
                  <div className="sta-date-input-group">
                    <label>To:</label>
                    <DatePicker
                      selected={endDate}
                      onChange={(date: Date | null) => date && setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      maxDate={new Date()}
                      className="sta-date-picker"
                    />
                  </div>
                </div>
                <div className="sta-date-filter-actions">
                  <button className="sta-apply-filter-button" onClick={applyDateFilter}>Apply Filter</button>
                  <button className="sta-cancel-filter-button" onClick={() => setShowDateFilter(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Filter indication bar */}
          {isFilterApplied && (
            <div className="sta-filter-active-bar">
              <FaCalendarAlt size={16} color="#FF3D00" />
              <span>Showing data from {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()}</span>
            </div>
          )}

          {/* Existing JSX */}
          <div className="sta-container-total">
             <div className="sta-earning-admin">
               <div className="sta-pic-earning">
                  <FaChild size={24} color="#FF3D00" />
               </div>
               <div className="sta-earnings-text">
                 <p className="sta-earnings-text">Total Scholars</p>
                 <div className="sta-earnings-total">
                  {scholarCount}
                 </div>
               </div>
             </div>
     
     
         <div className="sta-donations-admin">
       <div className="sta-pic-donation">
         <FaHandHoldingHeart size={24} color="#FF3D00" />
       </div>
       <div className="sta-donations-admin-text">
         <p className="sta-donations-admin-p">Donation</p>
         <div className="sta-donations-total">
           {donationSummary.current_total}
         </div>
         <p className="sta-percent-display">
           <span className="sta-plus-sign">
             {parseFloat(donationSummary.percentage_change) > 0 ? '+' : ''}
           </span>
           <span className="sta-percent-rate">
             {donationSummary.percentage_change}%
           </span>
           {' '}since last month
         </p>
       </div>
     </div>
     
             <div className="sta-balance-admin">
             <div className="sta-icon-wrapper">
         <FaGift size={24} color="#FF3D00" />
                    
       </div>
       <div className="sta-balance-admin-text">
         <p className="sta-balance-admin-p">Items Distributed</p>
         <div className="sta-balance-amount">
         {itemsDistributed.toLocaleString()}
         </div>
       </div>
    
     </div>
     
     
     {/* Task Card with icon on the left */}
     <div className="sta-task-admin">
       <div className="sta-taskicon-wrapper">
         <FaHandHoldingHeart size={24} color="#FF3D00" />
       </div>
       <div className="sta-task-content">
         <p className="sta-task-admin-p">New Sponsors</p>
         <div className="sta-task-total">{newSponsorsCount}</div>
       </div>
     </div>

     <div className="sta-task-admin">
       <div className="sta-taskicon-wrapper">
         <FaUsers size={24} color="#FF3D00" />
       </div>
       <div className="sta-task-content">
         <p className="sta-balance-admin-p">New Volunteers</p>
         <div className="sta-balance-amount">{newVolunteersCount}</div>
       </div>
     </div>
     
     {/* Total Projects Card with icon on the left */}
     <div className="sta-total-admin">
       <div className="sta-total-icon-wrapper">
         <FaCalendarPlus size={24} color="#FF3D00" />
       </div>
       <div className="sta-total-content">
         <p className="sta-total-admin-p">Total Events</p>
         <div className="sta-total-total">{eventsCount}</div>
       </div>
     </div>

     </div>


<div className="sta-Bar-donut-chart-container">
  {/* Parent container for both charts */}
  <div className="sta-charts-container">
    
    {/* Bar Chart Section */}
    <div className="sta-chart-bar-container">
      <div className="sta-chart-container">
        <div className="sta-header-row">
          <div className="sta-calendar-wrapper">
            <FaCalendarAlt size={16} color="#9e9ea1" />
            <span className="sta-calendar-text">{getCurrentMonth()}</span>
          </div>
     
        </div>
        <div className="sta-chart-header">
          <div className="sta-chart-text-left">
            <p className="sta-p-text-view-report-no">{trendStats.current_total}</p>
            <div className="sta-metrics-container">
              <div className="sta-metrics-row">
                <p className="sta-p-text">Total Donations</p>
                <div className="sta-percentage-wrapper">
                  <span className="sta-arrow-up">
                    {parseFloat(trendStats.percentage_change) > 0 ? '↑' : '↓'}
                  </span>
                  <span className="sta-p-text-view-report-percent">
                    {Math.abs(parseFloat(trendStats.percentage_change))}%
                  </span>
                </div>
              </div>
              <div className="sta-status-wrapper">
                <span className="sta-status-icon">
                  <FaCheck size={10} />
                </span>
                <span className="sta-status-text">On track</span>
              </div>
            </div>
          </div>
        </div>

        {/* Update Line chart data */}
        <div className="sta-Revenue-container" style={{ height: '300px' }}>
          <Line 
            data={{
              labels: trendStats.labels,
              datasets: [{
                label: "Donations",
                data: trendStats.data,
                borderColor: "#FF3D00",
                borderWidth: 2,
                pointBackgroundColor: "#FF3D00",
                pointRadius: 4,
                tension: 0.4,
                fill: false,
              }]
            }} 
            options={{
              ...lineOptions,
              maintainAspectRatio: true,
              aspectRatio: 2,
            }} 
          />
        </div>
      </div>
    </div>

    {/* Donut Chart Section */}
    <div className="sta-chart-donut-container">
      <div className="sta-donut-chart-container">
        <div className="sta-donut-chart-header">
          <div className="sta-donut-chart-text-left">
            <p className="sta-donut-p-text">Donation Time</p>
            <p className="sta-donut-p-text-period">{timeStats.period}</p>
          </div>
          <div className="sta-donut-chart-text-right">
            <button className="sta-donut-view-report-button" onClick={handleDonationTimeReport}>
              View Report
            </button>
          </div>
        </div>
        <div className="sta-donut-chart-section">
          <div className="sta-donut-chart-container">
            <Doughnut 
              data={donutData} 
              options={donutOptions}
              plugins={[
                {
                  id: 'customCanvasBackgroundColor',
                  beforeDraw: (chart: any) => {
                    const { ctx } = chart;
                    ctx.save();
                    ctx.globalCompositeOperation = 'destination-over';
                    ctx.fillStyle = 'white';
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                  },
                }
              ]} 
            />
          </div>
        </div>
      </div>
    </div>

  </div>
</div>


{/* Horizontal Layout for Circles, Donors, and Feature */}
<div className="sta-rating-donors-donation-container">
{/* circles) */}

    

    {/* Replace the existing generous donors section with this new table layout */}
    <div className="sta-generous-donors-container">
      <div className="sta-generous-donor-text">
        <p className="sta-generous-donor-text-p">Most Generous Donors</p>
        <p className="sta-generous-donor-text-p1">Top sponsors this month</p>
      </div>
      <table className="sta-donors-table">
        <tbody>
          {generousDonors.map((donor, index) => (
            <tr key={`donor-${donor.id}-${index}`}>
              <td>
                <div className="sta-donor-info">
                  {donor.profile_photo ? (
                    <img
                      src={donor.profile_photo}
                      alt={donor.name}
                      className="sta-donor-avatar"
                    />
                  ) : (
                    <FaUserCircle size={40} color="#FF3D00" className="sta-donor-icon" />
                  )}
                  <span className="sta-donor-name">{donor.name}</span>
                </div>
              </td>
              <td className="sta-donor-amount">{donor.total_donations}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    
    
      
      {/* Bar Chart */}
     {/* Bar Chart */}
              <div className="sta-donations-chart-line-container">
                <div className="sta-bar-chart-header">
                  <div>
                    <div className="sta-bar-chart-title">Daily Traffic</div>
                    <div className="sta-bar-metrics">
                      <span className="sta-bar-value">{dailyTraffic.total}</span>&nbsp;
                      <span className="sta-bar-label">donations</span>
                    </div>
                  </div>
                  <div className="sta-bar-change">
                    <span className="sta-bar-arrow">
                      {parseFloat(dailyTraffic.percentageChange) > 0 ? '↑' : '↓'}
                    </span>
                    <span className="sta-bar-percentage">
                      {Math.abs(parseFloat(dailyTraffic.percentageChange))}%
                   
                    </span>
                    
                  </div>
                  <Bar data={trafficChartData} options={trafficChartOptions} />
                </div>

              </div>
        
            </div>
          </>
        )}
        
        {/* Add Modal */}
        {showDonationModal && (
          <>
            <div className="sta-modal-overlay" onClick={closeModal}></div>
            <div className="sta-modal-content" onClick={e => e.stopPropagation()}>
              <div className="sta-modal-header">
                <h2>{modalContent.title}</h2>
                <button className="sta-modal-close" onClick={closeModal}>×</button>
              </div>
              <div className="sta-modal-body">
                {Object.entries(modalContent.data).map(([key, value]) => (
                  <div key={key} className="sta-modal-item">
                    <span className="sta-modal-label">{key}</span>
                    <span 
                      className="sta-modal-value"
                      data-trend={getTrendClass(value)}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </>
    );
};

export default Analytics;
