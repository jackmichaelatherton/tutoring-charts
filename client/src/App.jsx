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

  import { parse, format, isAfter, isBefore, subMonths } from 'date-fns';

  import TotalIncomeChart from './components/charts/TotalIncomeChart';
  import CommissionChart from './components/charts/CommissionChart';
  import AdHocChart from './components/charts/AdHocChart';
  import LessonHoursChart from './components/charts/LessonHoursChart';
  import AvgCommissionRateChart from './components/charts/AvgCommissionRateChart';
  import CommissionByJobChart from './components/charts/CommissionByJobChart';
  import UniqueStudentsChart from './components/charts/UniqueStudentsChart';

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

  // const createBarOptions = (title, valueFormatter = (val) => val, stacked = false) => ({
  //   responsive: true,
  //   plugins: {
  //     legend: stacked
  //       ? {
  //           position: 'top',
  //           labels: {
  //             color: '#374151',
  //             font: { size: 13 }
  //           }
  //         }
  //       : { display: false },
  //     tooltip: {
  //       callbacks: {
  //         label: (context) => valueFormatter(context.raw)
  //       }
  //     }
  //   },
  //   scales: {
  //     y: {
  //       beginAtZero: true,
  //       ticks: {
  //         color: '#4B5563',
  //         callback: (val) => valueFormatter(val)
  //       },
  //       title: {
  //         display: true,
  //         text: title,
  //         color: '#374151',
  //         font: { size: 14 }
  //       },
  //       grid: { color: '#E5E7EB' }
  //     },
  //     x: {
  //       stacked: true,
  //       ticks: { color: '#4B5563' },
  //       grid: { color: '#F3F4F6' }
  //     }
  //   }
  // });

  function App() {
    
    // const [panelView, setPanelView] = useState('filters');
    const [allStatuses, setAllStatuses] = useState([]);
    const [selectedStatuses, setSelectedStatuses] = useState(['complete']);
    const [months, setMonths] = useState([]);
    const [rawData, setRawData] = useState([]);
    const [commissionRateData, setCommissionRateData] = useState(null);
    const [adHocData, setAdHocData] = useState(null);
    const [commissionData, setCommissionData] = useState(null);
    const [lastSynced, setLastSynced] = useState(null);
    const [totalCommissionData, setTotalCommissionData] = useState(null);
    const [commissionByJobData, setCommissionByJobData] = useState([]);
    const [uniqueStudentsData, setUniqueStudentsData] = useState({ months: [], data: [] });


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
          setUniqueStudentsData({
            months: res.data.months,
            data: res.data.uniqueStudents
          });
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
      axios.get('/api/appointments/commission-by-job')
        .then(res => setCommissionByJobData(res.data))
        .catch(err => console.error('Failed to load commission by job:', err));
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


    return (
      <div className="flex">

        {/* Right Sidebar */}
        <aside className="w-64 p-4 bg-white shadow-lg fixed top-0 right-0 h-screen border-l border-gray-200 flex flex-col justify-between">
          {/* Top: Section Selector */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Section</h3>
            </div>
            <nav className="space-y-2">
              {[
                { label: 'Income', id: 'income' },
                { label: 'Income Breakdown', id: 'income-breakdown' },
                { label: 'Commission Breakdown', id: 'commission-breakdown' },
              ].map(({ label, id }) => (
                <button
                  key={id}
                  onClick={() => {
                    const el = document.getElementById(id);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-left w-full text-blue-600 hover:underline text-sm"
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom: Filters */}
          <div>
            <div className="space-y-2 mb-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Filters</h3>
            </div>
            <nav className="space-y-2"></nav>
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
              <p className="text-xs text-gray-400 mt-4">
                Last updated: {format(new Date(lastSynced), 'PPPp')}
              </p>
            )}
          </div>
        </aside>

        {/* Main Dashboard Content */}
        <main className="flex-1 p-6 pr-[18rem] pl-6 bg-gray-100 font-sans">
          <div className="max-w-7xl mx-auto space-y-16 bg-white shadow-xl rounded-xl p-8">

            {commissionData?.data && adHocData?.data && totalCommissionData && (
              <section id="income">
                <h2 className="text-2xl font-bold mb-4">Income</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <TotalIncomeChart
                    commissionData={commissionData}
                    adHocData={adHocData}
                    filteredMonths={filteredMonths}
                  />
                </div>
              </section>
            )}

            {commissionData?.data && adHocData?.data && totalCommissionData && (
              <section id="income-breakdown">
                <h2 className="text-2xl font-bold mb-4">Income breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <CommissionChart
                    totalCommissionData={totalCommissionData}
                    isMonthInRange={isMonthInRange}
                    startIdx={startIdx}
                    endIdx={endIdx}
                    selectedStatuses={selectedStatuses}
                  />
                  <AdHocChart
                    adHocData={adHocData}
                    filteredMonths={filteredMonths}
                  />
                </div>
              </section>
            )}

            {validRange && commissionData?.data && (
              <section id="commission-breakdown">
                <h2 className="text-2xl font-bold mb-4">Commission breakdown</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  {/* <CommissionChart
                    totalCommissionData={totalCommissionData}
                    isMonthInRange={isMonthInRange}
                    startIdx={startIdx}
                    endIdx={endIdx}
                    selectedStatuses={selectedStatuses}
                  /> */}
                  <LessonHoursChart
                    filteredAppointmentData={filteredAppointmentData}
                  />
                  <AvgCommissionRateChart
                    commissionRateData={commissionRateData}
                    isMonthInRange={isMonthInRange}
                    startIdx={startIdx}
                    endIdx={endIdx}
                    selectedStatuses={selectedStatuses}
                  />
                  <CommissionByJobChart 
                    data={commissionByJobData} 
                    isMonthInRange={isMonthInRange}
                    startIdx={startIdx}
                    endIdx={endIdx}
                    selectedStatuses={selectedStatuses}
                  />
                </div>
              </section>
            )}

            <section id="students">
              <h2 className="text-2xl font-bold mb-4">Student Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <UniqueStudentsChart
                  uniqueStudentsData={uniqueStudentsData}
                  filteredMonths={filteredMonths}
                />
              </div>
            </section>

          </div>
        </main>
      </div>
    );




  }

  export default App;
