import { Line } from 'react-chartjs-2';
import { createBarOptions, getColor } from '../../utils/chartUtils';
import { parse, format } from 'date-fns';

export default function AvgCommissionRateChart({ commissionRateData, selectedStatuses }) {
  if (
    !commissionRateData?.rawMonths ||
    !Array.isArray(commissionRateData.statuses) ||
    commissionRateData.rawMonths.length === 0
  ) {
    return <p className="text-center text-gray-400">Loading commission rate data...</p>;
  }

  const labels = commissionRateData.rawMonths.map(m =>
    format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')
  );

  const datasets = commissionRateData.statuses
    .filter(({ status }) => selectedStatuses.includes(status))
    .map(({ status, data }) => ({
      label: `Avg Commission – ${status}`,
      data: data.map(entry =>
        entry && entry.totalHours > 0
          ? +(entry.totalCommission / entry.totalHours).toFixed(2)
          : null
      ),
      borderColor: getColor(status),
      backgroundColor: getColor(status),
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    }));

  return (
    <section id="avg-commission">
      <h2 className="text-lg font-semibold mb-2">
        Average commission rate
      </h2>
      <Line
        data={{ labels, datasets }}
        options={createBarOptions('Average Commission Rate (£/hr)', (val) => `£${val.toFixed(2)}`)}
      />
    </section>
  );
}
