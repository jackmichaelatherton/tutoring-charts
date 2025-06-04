import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';
import { parse, format } from 'date-fns';

export default function TotalIncomeChart({ commissionData, adHocData, filteredMonths }) {
  const labels = filteredMonths.map(m =>
    format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')
  );

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Commission (Complete)',
        data: filteredMonths.map((m) => {
          const idx = commissionData.months.indexOf(m);
          return idx >= 0 ? commissionData.data[idx] : 0;
        }),
        backgroundColor: '#34D399',
        stack: 'income',
      },
      {
        label: 'Net Ad Hoc Revenue',
        data: filteredMonths.map((m) => {
          const idx = adHocData.months.indexOf(m);
          return idx >= 0 ? adHocData.data[idx] : 0;
        }),
        backgroundColor: '#818CF8',
        stack: 'income',
      },
    ],
  };

  return (
    <section id="total-income">
      <h2 className="text-lg font-semibold mb-2">Total income</h2>
      <Bar
        data={chartData}
        options={createBarOptions('Total Income (£)', (val) => `£${val.toFixed(2)}`, true)}
      />
    </section>
  );
}
