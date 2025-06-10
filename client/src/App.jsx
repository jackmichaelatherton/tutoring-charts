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
  import AvgLessonHoursChart from './components/charts/AvgLessonHoursChart';

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
  const [allStatuses, setAllStatuses] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState(['complete']);
  const [months, setMonths] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [commissionRateData, setCommissionRateData] = useState(null);
  const [adHocData, setAdHocData] = useState(null);
  const [commissionData, setCommissionData] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);
  const [totalCommissionData, setTotalCommissionData] = useState(null);
  // const [commissionByJobData, setCommissionByJobData] = useState([]);
  const [uniqueStudentsData, setUniqueStudentsData] = useState({ months: [], data: [] });
  const [avgLessonHoursData, setAvgLessonHoursData] = useState({ months: [], data: [] });
  const [lessonHoursPerMonthRaw, setLessonHoursPerMonthRaw] = useState([]);
  const [studentMapPerMonthRaw, setStudentMapPerMonthRaw] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const today = new Date();
  const defaultEnd = format(today, 'yyyy-MM');
  const defaultStart = format(subMonths(today, 12), 'yyyy-MM');

  const [dateRange, setDateRange] = useState({
    start: defaultStart,
    end: defaultEnd
  });

  useEffect(() => {
    const increment = () => {
      setLoadingProgress((prev) => Math.min(prev + Math.random() * 10, 90));
    };

    const progressInterval = setInterval(increment, 200);

    Promise.all([
      axios.get('/api/appointments/by-month'),
      axios.get('/api/appointments/total-commission-by-month'),
      axios.get('/api/appointments/avg-commission-by-month'),
      axios.get('/api/adhoc/adhoc-revenue-by-month'),
      axios.get('/api/appointments/complete-commission-by-month'),
      axios.get('/api/appointments/commission-by-job'),
      axios.get('/api/last-synced')
    ])
      .then(([byMonthRes, totalCommRes, avgCommRes, adHocRes, completeCommRes, , syncRes]) => { //add jobRes back in here if re-adding the adhoc charges chart
        const byMonthData = byMonthRes.data;

        setMonths(byMonthData.months);
        setRawData(byMonthData.statuses);
        setAllStatuses(byMonthData.statuses.map(s => s.status));
        setLessonHoursPerMonthRaw(byMonthData.lessonHoursPerMonthRaw);
        setStudentMapPerMonthRaw(byMonthData.studentMapPerMonthRaw);

        setTotalCommissionData({
          rawMonths: totalCommRes.data.months,
          statuses: totalCommRes.data.statuses
        });

        setCommissionRateData({
          rawMonths: avgCommRes.data.months,
          statuses: avgCommRes.data.statuses
        });

        setAdHocData(adHocRes.data);
        setCommissionData(completeCommRes.data);
        // setCommissionByJobData(jobRes.data);
        setLastSynced(syncRes.data.lastSynced);
      })
      .catch((err) => {
        console.error('❌ Error loading dashboard data:', err);
      })
      .finally(() => {
        clearInterval(progressInterval);
        setLoadingProgress(100);
        setTimeout(() => setIsLoading(false), 300);
      });
  }, []);

  useEffect(() => {
    if (!lessonHoursPerMonthRaw.length || !studentMapPerMonthRaw.length) return;

    const updatedUniqueStudents = studentMapPerMonthRaw.map(entry => {
      const allStudents = selectedStatuses.flatMap(status => entry[status] || []);
      return new Set(allStudents).size;
    });

    const updatedAvgLessonHours = lessonHoursPerMonthRaw.map((entry, idx) => {
      const totalHours = selectedStatuses.reduce(
        (sum, status) => sum + (entry[status] || 0),
        0
      );

      const allStudents = selectedStatuses.flatMap(
        status => studentMapPerMonthRaw[idx][status] || []
      );

      const uniqueStudentCount = new Set(allStudents).size;

      return uniqueStudentCount > 0 ? totalHours / uniqueStudentCount : 0;
    });


    setUniqueStudentsData({ months, data: updatedUniqueStudents });
    setAvgLessonHoursData({ months, data: updatedAvgLessonHours });
  }, [lessonHoursPerMonthRaw, studentMapPerMonthRaw, selectedStatuses, months]);

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
      datasets: selectedStatuses.map(status => ({
        label: status,
        data: lessonHoursPerMonthRaw
          .slice(startIdx, endIdx + 1)
          .map(monthObj => monthObj[status] || 0),
        backgroundColor: getColor(status),
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        stack: 'lesson-hours'
      }))
    };

    const validRange = startIdx >= 0 && endIdx >= 0 && endIdx >= startIdx;

    if (isLoading) {
      return (
        <div className="relative w-full h-screen bg-gray-100">
          <div className="fixed top-0 left-0 w-full h-1 bg-gray-200 z-50">
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">Loading dashboard…</p>
          </div>
        </div>
      );
    }

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
                { label: 'Total income', id: 'total-income' },
                { label: 'Income', id: 'income' },
                { label: 'Commission', id: 'commission' },
                { label: 'Lesson hours', id: 'lesson-hours' },
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

          {/* Bottom: Filters + Last Updated */}
          <div>
            {/* Date Pickers First */}
            <div className="space-y-4 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Dates</h3>
              </div>
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

            {/* Then Filters */}
            <div className="space-y-2 mb-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
              </div>
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

            {/* Last Updated Timestamp */}
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
              <section id="total-income">
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
              <section id="income">
                <h2 className="text-2xl font-bold mb-4">Income = Commission + ad hoc charges</h2>
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
              <section id="commission">
                <h2 className="text-2xl font-bold mb-4">Commission = Lesson hours x avg commission rate</h2>
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
                  {/* <CommissionByJobChart 
                    data={commissionByJobData} 
                    isMonthInRange={isMonthInRange}
                    startIdx={startIdx}
                    endIdx={endIdx}
                    selectedStatuses={selectedStatuses}
                  /> */}
                </div>
              </section>
            )}

            <section id="lesson-hours">
              <h2 className="text-2xl font-bold mb-4">Lesson hours = No. of students x hours per student</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <UniqueStudentsChart
                  uniqueStudentsData={uniqueStudentsData}
                  filteredMonths={filteredMonths}
                />
                <AvgLessonHoursChart
                  months={avgLessonHoursData.months}
                  data={avgLessonHoursData.data}
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
