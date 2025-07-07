import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function ConversionChart({ conversionData }) {
  const hasData =
    Array.isArray(conversionData) &&
    conversionData.length > 0 &&
    conversionData.every(item => typeof item.conversionRate === 'number');

  const data = {
    labels: conversionData.map(item => item.month),
    datasets: [
      {
        label: 'Conversion Rate (%)',
        data: conversionData.map(item => item.conversionRate),
        backgroundColor: '#34D399', 
        borderRadius: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      }
    ]
  };

  return (
    <section id="conversion-chart">
      <h2 className="text-lg font-semibold mb-2">
        Enquiry Conversion Rate by Month
      </h2>
      {hasData ? (
        <Bar
          data={data}
          options={createBarOptions(
            'Conversion Rate (%)',
            (val) => `${val}%`,
            false,
            {
              min: 0,
              max: 100,
              ticks: {
                stepSize: 20,
                callback: (val) => `${val}%`,
                color: '#4B5563'
              },
              grid: {
                color: '#E5E7EB'
              }
            }
          )}
        />
      ) : (
        <p className="text-center text-gray-500">No data to display.</p>
      )}
    </section>
  );
}
