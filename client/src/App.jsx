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
import EnquiriesChart from './components/charts/EnquiriesChart';
import StartsFinishesChart from './components/charts/StartsFinishesChart';

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
  const [uniqueStudentsData, setUniqueStudentsData] = useState({ months: [], data: [] });
  const [avgLessonHoursData, setAvgLessonHoursData] = useState({ months: [], data: [] });
  const [lessonHoursPerMonthRaw, setLessonHoursPerMonthRaw] = useState([]);
  const [studentMapPerMonthRaw, setStudentMapPerMonthRaw] = useState([]);
  const [enquiriesData, setEnquiriesData] = useState({ months: [], counts: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [startsData, setStartsData] = useState({ months: [], counts: [] });
  const [finishesData, setFinishesData] = useState({ months: [], counts: [] });

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
      axios.get('/api/last-synced'),
      axios.get('/api/clients/enquiries-by-month'),
      axios.get('/api/recipients/starts-by-month'),
      axios.get('/api/recipients/finishes-by-month')
    ])
      .then(([byMonthRes, totalCommRes, avgCommRes, adHocRes, completeCommRes, , syncRes, enquiriesRes, startsRes, finishesRes]) => {
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

        // --- Add log here for commission rate data fetch ---
        console.log('Fetched commission rate data:', avgCommRes.data);

        setCommissionRateData({
          months: avgCommRes.data.months,
          statuses: avgCommRes.data.statuses
        });

        setAdHocData(adHocRes.data);
        setCommissionData(completeCommRes.data);
        setLastSynced(syncRes.data.lastSynced);
        setEnquiriesData(enquiriesRes.data);
        setStartsData(startsRes.data);
        setFinishesData(finishesRes.data);
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

  const filteredEnquiries = {
    months: [],
    counts: []
  };

  if (enquiriesData.months && enquiriesData.counts) {
    enquiriesData.months.forEach((month, idx) => {
      if (isMonthInRange(month)) {
        filteredEnquiries.months.push(month);
        filteredEnquiries.counts.push(enquiriesData.counts[idx]);
      }
    });
  }

  const filteredEnquiriesData = {
    labels: filteredEnquiries.months.map(m => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')),
    datasets: [
      {
        label: 'Enquiries',
        data: filteredEnquiries.counts,
        backgroundColor: '#34D399',
        borderRadius: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  };

  // Build counts by month for starts and finishes
  const startsCountsByMonth = {};
  if (startsData.months && startsData.counts) {
    startsData.months.forEach((month, idx) => {
      startsCountsByMonth[month] = startsData.counts[idx];
    });
  }

  const finishesCountsByMonth = {};
  if (finishesData.months && finishesData.counts) {
    finishesData.months.forEach((month, idx) => {
      finishesCountsByMonth[month] = finishesData.counts[idx];
    });
  }

  // Combined chart data: plot finishes as negative
  const startsFinishesChartData = {
    labels: filteredMonths.map(m => format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')),
    datasets: [
      {
        label: 'starts',
        data: filteredMonths.map(month => startsCountsByMonth[month] || 0),
        backgroundColor: '#34D399',
        borderRadius: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        type: 'bar',
        order: 1,
        grouped: false, // <--- overlap bars
      },
      {
        label: 'finishes',
        data: filteredMonths.map(month => -(finishesCountsByMonth[month] || 0)),
        backgroundColor: '#f87171',
        borderRadius: 0,
        barPercentage: 0.8,
        categoryPercentage: 0.7,
        type: 'bar',
        order: 2,
        grouped: false, // <--- overlap bars
      },
      {
        label: 'net starts',
        data: filteredMonths.map(month =>
          (startsCountsByMonth[month] || 0) - (finishesCountsByMonth[month] || 0)
        ),
        type: 'line',
        showLine: true, // <--- draw the line
        pointStyle: 'circle',
        pointRadius: 1,
        pointBackgroundColor: '#c9cad6',
        borderColor: '#c9cad6',
        backgroundColor: '#c9cad6',
        borderWidth: 2,
        fill: false,
        yAxisID: 'y',
        order: 3,
        clip: false,
        z: 10,
      },
    ],
  };

  // Use the months array from the commission rate endpoint
  const commissionMonths = commissionRateData?.months || [];
  const commissionStartIdx = commissionMonths.indexOf(dateRange.start);
  const commissionEndIdx = commissionMonths.indexOf(dateRange.end);

  let rawMonths = [];
  let statuses = [];

  console.log('commissionMonths', commissionMonths);
  console.log('dateRange.start', dateRange.start);
  console.log('dateRange.end', dateRange.end);
  console.log('commissionStartIdx', commissionStartIdx);
  console.log('commissionEndIdx', commissionEndIdx);

  if (
    commissionRateData &&
    Array.isArray(commissionRateData.months) &&
    Array.isArray(commissionRateData.statuses) &&
    commissionStartIdx >= 0 &&
    commissionEndIdx >= 0 &&
    commissionEndIdx >= commissionStartIdx
  ) {
    rawMonths = commissionMonths.slice(commissionStartIdx, commissionEndIdx + 1);
    statuses = commissionRateData.statuses.map(statusObj => ({
      status: statusObj.status,
      data: statusObj.data.slice(commissionStartIdx, commissionEndIdx + 1)
    }));
  }

  const avgCommissionChartData = { rawMonths, statuses };

  console.log('avgCommissionChartData', avgCommissionChartData);

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

  console.log('avgCommissionChartData', avgCommissionChartData);

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
              { label: 'Number of students', id: 'number-of-students' },
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
                  commissionRateData={avgCommissionChartData}
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

          <section id="number-of-students">
            <h2 className="text-2xl font-bold mb-4">
              Number of students ≈ Net student start rate x Duration
            </h2>
            <div className="grid grid-cols-1 gap-12">
              <StartsFinishesChart chartData={startsFinishesChartData} />
              <EnquiriesChart
                filteredEnquiriesData={filteredEnquiriesData}
              />
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

export default App;
