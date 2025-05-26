import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function AdHocChart({ adHocData, filteredMonths }) {
  const dataset = {
    labels: filteredMonths,
    datasets: [
      {
        label: 'Ad Hoc Charges',
        data: filteredMonths.map((m) => {
          const idx = adHocData.months.indexOf(m);
          return idx >= 0 ? adHocData.data[idx] : 0;
        }),
        backgroundColor: '#818CF8',
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  };

  return (
    <section id="adhoc-revenue">
      <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
        Net ad hoc charges
      </h2>
      <Bar data={dataset} options={createBarOptions('Ad Hoc Revenue (£)', (val) => `£${val.toFixed(2)}`)} />
    </section>
  );
}
