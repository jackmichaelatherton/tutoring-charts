import { Bar } from 'react-chartjs-2';
import { createBarOptions, getColor } from '../../utils/chartUtils';
import { parse, format } from 'date-fns';

export default function CommissionChart({ totalCommissionData, isMonthInRange, startIdx, endIdx, selectedStatuses }) {
  
  if (!totalCommissionData?.rawMonths || !Array.isArray(totalCommissionData.statuses)) {
    return <p className="text-center text-gray-400">Loading commission data...</p>;
  }

  const labels = totalCommissionData.rawMonths
    .filter(isMonthInRange)
    .map((m) => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy'));

  const datasets = totalCommissionData.statuses
    .filter(({ status }) => selectedStatuses.includes(status))
    .map(({ status, data }) => ({
      label: `Total Commission – ${status}`,
      data: data.slice(startIdx, endIdx + 1),
      backgroundColor: getColor(status),
      barPercentage: 0.8,
      categoryPercentage: 0.7,
      stack: 'commission',
    }));

  return (
    <section id="commission">
      <h2 className="text-lg font-semibold mb-2">
        Commission
      </h2>
      <Bar
        data={{ labels, datasets }}
        options={createBarOptions('Total Commission (£)', (val) => `£${val.toFixed(2)}`, true)}
      />
    </section>
  );
}
