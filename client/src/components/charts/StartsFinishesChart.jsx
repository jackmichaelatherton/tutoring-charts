import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function StartsFinishesChart({ chartData }) {
  const hasData =
    chartData &&
    Array.isArray(chartData.datasets) &&
    chartData.datasets.length > 0 &&
    chartData.datasets.some(ds => Array.isArray(ds.data) && ds.data.length > 0);

  const options = {
    ...createBarOptions('', (val) => val, false),
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { stacked: false },
      y: {
        stacked: false,
        ticks: {
          callback: function(value) {
            return value;
          }
        }
      }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            let value = context.parsed.y !== undefined ? context.parsed.y : context.parsed;
            // Show positive value for finishes in tooltip
            if (label.toLowerCase().includes('finish')) {
              value = Math.abs(value);
            }
            return `${label.charAt(0).toUpperCase() + label.slice(1)}: ${value}`;
          }
        }
      }
    }
  };

  return (
    <section id="starts-finishes">
      <h2 className="text-lg font-semibold mb-2">
        Student Starts & Finishes per Month
      </h2>
      <h4 className="text-sm text-gray-500 mb-6">
        Start = First completed lesson; Finish = No completed lesson in 4 wks (date is last lesson date)
      </h4>
      {hasData ? (
        <Bar
          data={chartData}
          options={options}
        />
      ) : (
        <p className="text-center text-gray-500">No data to display.</p>
      )}
    </section>
  );
}