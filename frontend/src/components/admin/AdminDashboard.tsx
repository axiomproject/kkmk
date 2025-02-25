import React, { useEffect, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
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
import api from '../../config/axios'; // Replace axios import

// Register the necessary Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);
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
  FaGraduationCap, // Add this import
  FaArrowDown, FaArrowRight, FaArrowUp // Add this import
} from 'react-icons/fa';

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

// Add new interface for items distributed data
interface ItemsDistributedData {
  labels: string[];
  data: number[];
  total: number;
  percentage_change: string;
}

const Analytics: React.FC = () => {
  const [scholarCount, setScholarCount] = useState<number>(0);
  const [itemsDistributed, setItemsDistributed] = useState<number>(0);
  const [newUsersCount, setNewUsersCount] = useState<number>(0);
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
  const [scholarReportStatus, setScholarReportStatus] = useState<{
    count: number;
    verificationStep: number;
  }>({ count: 0, verificationStep: 1 });

  const [itemsStats, setItemsStats] = useState<ItemsDistributedData>({
    labels: [],
    data: [],
    total: 0,
    percentage_change: '0'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch scholar count
        const scholarResponse = await api.get('/admin/scholar-count');
        setScholarCount(scholarResponse.data.count);

        // Fetch items distributed
        const itemsResponse = await api.get('/admin/items-distributed');
        setItemsDistributed(itemsResponse.data.count);

        // Fetch new users count
        const newUsersResponse = await api.get('/admin/new-users-count');
        setNewUsersCount(newUsersResponse.data.count);

        // Fetch events count
        const eventsResponse = await api.get('/admin/events-count');
        setEventsCount(eventsResponse.data.count);

        // Fetch generous donors
        const donorsResponse = await api.get('/admin/generous-donors');
        setGenerousDonors(donorsResponse.data);

        // Fetch donations summary
        const donationsResponse = await api.get('/admin/donations-summary');
        setDonationSummary(donationsResponse.data);

        // Fetch donation time statistics
        const timeResponse = await api.get('/admin/donation-time-stats');
        setTimeStats(timeResponse.data);

        // Fetch donation trends
        const trendsResponse = await api.get('/admin/donation-trends');
        setTrendStats(trendsResponse.data);

        // Fetch daily traffic
        const trafficResponse = await api.get('/admin/daily-traffic');
        setDailyTraffic(trafficResponse.data);

        // Fetch scholar reports
        const scholarReportsResponse = await api.get('/admin/scholar-reports');
        setScholarReportStatus(scholarReportsResponse.data);

        // Add new fetch for items distributed stats
        const itemsStatsResponse = await api.get('/admin/items-distributed-stats');
        setItemsStats(itemsStatsResponse.data);

      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 300000);
    return () => clearInterval(interval);
  }, []);

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

   // Updated bar chart data
   const barData = {
    labels: itemsStats.labels,
    datasets: [{
      data: itemsStats.data,
      backgroundColor: '#FF3D00',
      borderRadius: 2,
      maxBarThickness: 4,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#622226',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        titleFont: {
          family: 'Poppins',
          size: 12
        },
        bodyFont: {
          family: 'Poppins',
          size: 12
        },
        padding: 12,
        displayColors: false,
        borderColor: '#EEEEEE',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => `${context.parsed.y} items`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#999999',
          font: {
            family: 'Poppins',
            size: 12
          },
          maxRotation: 0
        },
        border: { display: false }
      },
      y: {
        grid: {
          display: true,
          color: '#EEEEEE',
          drawBorder: false
        },
        ticks: {
          display: true,
          color: '#999999',
          font: {
            family: 'Poppins',
            size: 12
          },
          maxTicksLimit: 5
        },
        border: { display: false }
      }
    },
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    }
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

  // Updated line chart data
const lineData = React.useMemo(
  () => ({
    labels: ["SEP", "OCT", "NOV", "DEC", "JAN", "FEB"],
    datasets: [
      {
        label: "Current Period",
        data: [65000, 75000, 90000, 85000, 82000, 88000],
        borderColor: "#FF3D00",
        borderWidth: 2,
        pointBackgroundColor: "#FF3D00",
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      },
      {
        label: "Previous Period",
        data: [60000, 70000, 85000, 80000, 78000, 83000],
        borderColor: "#FFB800",
        borderWidth: 2,
        pointBackgroundColor: "#FFB800",
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      },
    ],
  }),
  [] // Ensure data doesn't change unless dependencies change
);

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

  // Helper function to get status text and arrow
  const getStatusInfo = (step: number) => {
    switch (step) {
      case 1:
        return { text: 'Pending', arrow: <FaArrowDown className="sta-status-arrow pending" /> };
      case 2:
        return { text: 'In Review', arrow: <FaArrowRight className="sta-status-arrow in-review" /> };
      case 3:
        return { text: 'Verified', arrow: <FaArrowUp className="sta-status-arrow verified" /> };
      default:
        return { text: 'Pending', arrow: <FaArrowDown className="sta-status-arrow pending" /> };
    }
  };

  // Add this function to handle status changes
  const handleStatusChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStep = parseInt(event.target.value);
    try {
      const response = await api.put('/admin/scholar-reports/status', {
        verificationStep: newStep
      });
      
      setScholarReportStatus(prev => ({
        ...prev,
        verificationStep: newStep
      }));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  return (
    <>
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
         <FaUsers size={24} color="#FF3D00" />
       </div>
       <div className="sta-task-content">
         <p className="sta-task-admin-p">New Users</p>
         <div className="sta-task-total">{newUsersCount}</div>
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

     {/* Scholar Report Card */}
     <div className="sta-total-admin">
       <div className="sta-scholar-icon-wrapper">
         <FaGraduationCap size={24} color="#FF3D00" />
       </div>
       <div className="sta-scholar-content">
         <p className="sta-balance-admin-p">Scholar Reports</p>
         <div className="sta-balance-amount">{scholarReportStatus.count}</div>
       </div>
     </div>

     </div>


<div className="sta-Bar-donut-chart-container">
  {/* Parent container for both charts */}
  <div className="sta-charts-container">
    
    {/* Bar Chart Section */}
    <div className="sta-chart-bar-container">
      <div className="sta-header-row">
        <div className="sta-calendar-wrapper">
          <FaCalendarAlt size={16} color="#9e9ea1" />
          <span className="sta-calendar-text">{getCurrentMonth()}</span>
        </div>
      </div>
      <div className="sta-chart-header">
        <div className="sta-chart-text-left">
          <p className="sta-p-text-view-report-no">{itemsStats.total}</p>
          <div className="sta-metrics-container">
            <div className="sta-metrics-row">
              <p className="sta-p-text">Items Distributed</p>
              <div className="sta-percentage-wrapper">
                <span className="sta-arrow-up">
                  {parseFloat(itemsStats.percentage_change) > 0 ? '↑' : '↓'}
                </span>
                <span className="sta-p-text-view-report-percent">
                  {Math.abs(parseFloat(itemsStats.percentage_change))}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="sta-chart-container">
        <Bar data={barData} options={barOptions} height={200} />
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
            </div>
            <Bar data={trafficChartData} options={trafficChartOptions} height={180} />
          </div>
    
        </div>

    {/* Add Modal */}
    {showDonationModal && (
      <div className="sta-modal-overlay" onClick={() => setShowDonationModal(false)}>
        <div className="sta-modal-content" onClick={e => e.stopPropagation()}>
          <div className="sta-modal-header">
            <h2>{modalContent.title}</h2>
            <button className="sta-modal-close" onClick={() => setShowDonationModal(false)}>×</button>
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
      </div>
    )}
    </>
  

  );
};

export default Analytics;
