import { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function CommissionByJobChart({
  data = [],
  isMonthInRange,
}) {
  const [valueType, setValueType] = useState('total'); // 'rate' or 'total'
  const [metric, setMetric] = useState('commission'); // 'client', 'tutor', 'commission'

  const valueKey = {
    rate: {
      client: 'clientRate',
      tutor: 'tutorRate',
      commission: 'commissionRate',
    },
    total: {
      client: 'totalClient',
      tutor: 'totalTutor',
      commission: 'totalCommission',
    },
  }[valueType][metric];

  // Filter and group by service (aggregated over filtered months)
  const grouped = {};

  data
    .filter(d => isMonthInRange(d.month))
    .forEach(d => {
      if (!grouped[d.service]) {
        grouped[d.service] = { total: 0, count: 0 };
      }
      grouped[d.service].total += d[valueKey];
      grouped[d.service].count += 1;
    });

  const entries = Object.entries(grouped)
    .map(([service, { total, count }]) => ({
      service,
      value: valueType === 'rate' ? total / count : total,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15); // top 15 services

  const labels = entries.map(e => e.service);
  const values = entries.map(e => +(e.value.toFixed(2)));

  return (
    <section id="commission-by-job">
      <h2 className="text-lg font-semibold mb-2">
        Commission by job
      </h2>

      <div className="flex justify-center gap-4 mb-6">
        <select
          className="border rounded px-2 py-1"
          value={valueType}
          onChange={(e) => setValueType(e.target.value)}
        >
          <option value="total">Total</option>
          <option value="rate">Rate</option>
        </select>
        <select
          className="border rounded px-2 py-1"
          value={metric}
          onChange={(e) => setMetric(e.target.value)}
        >
          <option value="client">Client</option>
          <option value="tutor">Tutor</option>
          <option value="commission">Commission</option>
        </select>
      </div>

      <Bar
        data={{
          labels,
          datasets: [
            {
              label: `${valueType === 'rate' ? 'Avg Rate (£)' : 'Total (£)'}`,
              data: values,
              backgroundColor: '#60A5FA',
            },
          ],
        }}
        options={createBarOptions(
          `${valueType === 'rate' ? 'Average' : 'Total'} ${metric} (£)`,
          (val) => `£${val.toFixed(2)}`
        )}
      />
    </section>
  );
}
