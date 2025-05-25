import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { parse, format, isAfter, isBefore, subMonths } from 'date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const generateMonthRange = (start, end) => {
  const result = [];
  const startDate = new Date(`${start}-01`);
  const endDate = new Date(`${end}-01`);

  while (startDate <= endDate) {
    result.push(format(startDate, 'yyyy-MM'));
    startDate.setMonth(startDate.getMonth() + 1);
  }
  return result;
};

const getColor = (status) => {
  const palette = {
    planned: '#60A5FA',
    complete: '#34D399',
    cancelled: '#F87171',
    'cancelled-chargeable': '#E5E7EB',
    'awaiting-report': '#D1D5DB',
    unknown: '#9CA3AF',
  };
  return palette[status] || '#D1D5DB';
};

const createBarOptions = (title, valueFormatter = (val) => val, stacked = false) => ({
  responsive: true,
  plugins: {
    legend: stacked
      ? {
          position: 'top',
          labels: {
            color: '#374151',
            font: { size: 13 }
          }
        }
      : { display: false },
    tooltip: {
      callbacks: {
        label: (context) => valueFormatter(context.raw)
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: '#4B5563',
        callback: (val) => valueFormatter(val)
      },
      title: {
        display: true,
        text: title,
        color: '#374151',
        font: { size: 14 }
      },
      grid: { color: '#E5E7EB' }
    },
    x: {
      stacked: true,
      ticks: { color: '#4B5563' },
      grid: { color: '#F3F4F6' }
    }
  }
});

function App() {
  const [allStatuses, setAllStatuses] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(['complete']);
  const [months, setMonths] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [commissionRateData, setCommissionRateData] = useState(null);
  const [totalCommissionData, setTotalCommissionData] = useState(null);
  const [adHocData, setAdHocData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const today = new Date();
  const defaultEnd = format(today, 'yyyy-MM');
  const defaultStart = format(subMonths(today, 12), 'yyyy-MM');

  const [dateRange, setDateRange] = useState({
    start: defaultStart,
    end: defaultEnd
  });

  useEffect(() => {
    axios.get('/api/appointments/by-month')
      .then(res => {
        setMonths(res.data.months);
        setRawData(res.data.statuses);
        setAllStatuses(res.data.statuses.map(s => s.status));
      });
  }, []);

  useEffect(() => {
    axios.get('/api/appointments/total-commission-by-month')
      .then(res => {
        const { months, statuses } = res.data;
        setTotalCommissionData({ rawMonths: months, statuses });
      });
  }, []);

  useEffect(() => {
    axios.get('/api/appointments/avg-commission-by-month')
      .then(res => {
        const { months, statuses } = res.data;
        setCommissionRateData({ rawMonths: months, statuses });
      });
  }, []);

  useEffect(() => {
    axios.get('/api/adhoc/adhoc-revenue-by-month')
      .then(res => {
        setAdHocData(res.data);
      });
  }, []);

  useEffect(() => {
    axios.get('/api/appointments/complete-commission-by-month')
      .then(res => {
        setCommissionData(res.data); // { months, data }
      });
  }, []);

  useEffect(() => {
    axios.get('/api/last-synced')
      .then(res => setLastSynced(res.data.lastSynced));
  }, []);

  const toggleStatus = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const isMonthInRange = (monthStr) => {
    return (
      (!dateRange.start || !isBefore(parse(monthStr, 'yyyy-MM', new Date()), parse(dateRange.start, 'yyyy-MM', new Date()))) &&
      (!dateRange.end || !isAfter(parse(monthStr, 'yyyy-MM', new Date()), parse(dateRange.end, 'yyyy-MM', new Date())))
    );
  };

  const filteredMonths = generateMonthRange(dateRange.start, dateRange.end);
  const formattedLabels = filteredMonths.map(m => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy'));

  const startIdx = months.findIndex(m => m === dateRange.start);
  const endIdx = months.findIndex(m => m === dateRange.end);

  const filteredAppointmentData = {
    labels: formattedLabels,
    datasets: rawData
      .filter(d => selectedStatuses.includes(d.status))
      .map(d => ({
        label: d.status,
        data: d.data.slice(startIdx, endIdx + 1),
        backgroundColor: getColor(d.status),
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        stack: 'lesson-hours'
      }))
  };

  const validRange = startIdx >= 0 && endIdx >= 0 && endIdx >= startIdx;

  // const paddedAdHocData = filteredMonths.map(m => {
  //   const index = adHocData?.months?.indexOf(m);
  //   return index >= 0 ? adHocData.data[index] : 0;
  // });

  return (
    <div className="flex">
      <aside className="w-64 p-4 bg-white shadow-lg fixed right-0 top-0 h-screen border-l border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="space-y-2 mb-6">
          {allStatuses.map(status => (
            <label key={status} className="block text-sm text-gray-700">
              <input
                type="checkbox"
                className="mr-2 accent-blue-600"
                checked={selectedStatuses.includes(status)}
                onChange={() => toggleStatus(status)}
              />
              <span className="capitalize">{status}</span>
            </label>
          ))}
        </div>

        <div className="space-y-4">
          <label className="block text-sm text-gray-700">
            Start Month:
            <input
              type="month"
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
          <label className="block text-sm text-gray-700">
            End Month:
            <input
              type="month"
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
              className="mt-1 w-full border rounded px-2 py-1"
            />
          </label>
        </div>
        {lastSynced && (
          <p className="text-xs text-gray-400 mt-8">
            Last updated: {format(new Date(lastSynced), 'PPPp')}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-8">
          {lastSynced
            ? `Last updated (test): ${format(new Date(lastSynced), 'PPPp')}`
            : 'Last updated: —'}
        </p>
      </aside>

      <main className="flex-1 p-6 pr-72 bg-gray-100 font-sans">
        <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-xl p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
          {commissionData?.data && adHocData?.data && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Total income
              </h2>
              <Bar
                data={{
                  labels: formattedLabels,
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
                }}
                options={createBarOptions('Total Income (£)', (val) => `£${val.toFixed(2)}`, true)}
              />
            </section>
          )}

          {validRange && totalCommissionData && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Commission
              </h2>
              <Bar
                data={{
                  labels: totalCommissionData.rawMonths
                    .filter(isMonthInRange)
                    .map((m) => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')),
                  datasets: totalCommissionData.statuses
                    .filter(({ status }) => selectedStatuses.includes(status))
                    .map(({ status, data }) => ({
                      label: `Total Commission – ${status}`,
                      data: data.slice(startIdx, endIdx + 1),
                      backgroundColor: getColor(status),
                      barPercentage: 0.8,
                      categoryPercentage: 0.7,
                      stack: 'commission',
                    })),
                }}
                options={createBarOptions('Total Commission (£)', (val) => `£${val.toFixed(2)}`, true)}
              />
            </section>
          )}

          {validRange && adHocData && Array.isArray(adHocData.data) && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Net ad hoc charges
              </h2>
              <Bar
                data={{
                  labels: formattedLabels,
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
                }}
                options={createBarOptions('Ad Hoc Revenue (£)', (val) => `£${val.toFixed(2)}`)}
              />
            </section>
          )}

          {validRange && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Lesson hours
              </h2>
              {filteredAppointmentData.datasets.length > 0 ? (
                <Bar data={filteredAppointmentData} options={createBarOptions('', (val) => val, true)} />
              ) : (
                <p className="text-center text-gray-500">No data to display.</p>
              )}
            </section>
          )}

          {validRange && commissionRateData && (
            <section>
              <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
                Average commission rate
              </h2>
              <Line
                data={{
                  labels: commissionRateData.rawMonths
                    .filter(isMonthInRange)
                    .map((m) => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')),
                  datasets: commissionRateData.statuses
                    .filter(({ status }) => selectedStatuses.includes(status))
                    .map(({ status, data }) => ({
                      label: `Avg Commission – ${status}`,
                      data: data
                        .map((entry) =>
                          entry?.totalHours > 0 ? +(entry.totalCommission / entry.totalHours).toFixed(2) : null
                        )
                        .slice(startIdx, endIdx + 1),
                      borderColor: getColor(status),
                      backgroundColor: getColor(status),
                      tension: 0.3,
                      fill: false,
                      pointRadius: 3,
                    })),
                }}
                options={createBarOptions('Average Commission Rate (£/hr)', (val) => `£${val.toFixed(2)}`)}
              />
            </section>
          )}
        </div>
      </main>
    </div>
  );


}

export default App;
