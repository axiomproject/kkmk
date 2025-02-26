import React, { useEffect, useRef } from 'react';
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
import { Bar, Doughnut, Line } from "react-chartjs-2";

// Register components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ChartComponentProps {
  data: any;
  options: any;
  height?: number;
  onError?: () => void;
  type: 'bar' | 'line' | 'doughnut';
}

const ChartComponent: React.FC<ChartComponentProps> = ({ 
  data, 
  options, 
  height = 200,
  onError,
  type
}) => {
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    try {
      // Any initialization logic if needed
    } catch (error) {
      console.error('Chart initialization error:', error);
      if (onError) onError();
    }

    return () => {
      // Cleanup logic
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const renderChart = () => {
    try {
      switch (type) {
        case 'bar':
          return <Bar data={data} options={options} height={height} />;
        case 'line':
          return <Line data={data} options={options} height={height} />;
        case 'doughnut':
          return <Doughnut data={data} options={options} />;
        default:
          return <div>Unknown chart type</div>;
      }
    } catch (error) {
      console.error('Chart rendering error:', error);
      if (onError) onError();
      return <div>Chart rendering failed</div>;
    }
  };

  return (
    <div className="chart-wrapper">
      {renderChart()}
    </div>
  );
};

export default ChartComponent;
