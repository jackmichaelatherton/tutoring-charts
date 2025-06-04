import { Bar } from 'react-chartjs-2';
import { format, parse } from 'date-fns';

const AvgLessonHoursChart = ({ months, data, filteredMonths }) => {
  const labels = filteredMonths.map((m) =>
    format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')
  );

  // Match filteredMonths to actual data indices
  const filteredData = filteredMonths.map((month) => {
    const index = months.indexOf(month);
    return index !== -1 ? data[index] : 0;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Avg hours per student',
        data: filteredData,
        backgroundColor: '#c9cad6',
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw.toFixed(2)} hrs`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Hours',
        },
        ticks: {
          callback: (value) => `${value}h`,
        },
        grid: {
          color: '#E5E7EB',
        },
      },
      x: {
        ticks: {
          color: '#4B5563',
        },
        grid: {
          color: '#F3F4F6',
        },
      },
    },
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Hours per student</h3>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default AvgLessonHoursChart;
