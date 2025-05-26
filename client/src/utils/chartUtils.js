import { format } from 'date-fns';

export const generateMonthRange = (start, end) => {
  const result = [];
  const startDate = new Date(`${start}-01`);
  const endDate = new Date(`${end}-01`);

  while (startDate <= endDate) {
    result.push(format(startDate, 'yyyy-MM'));
    startDate.setMonth(startDate.getMonth() + 1);
  }
  return result;
};

export const getColor = (status) => {
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

export const createBarOptions = (title, valueFormatter = (val) => val, stacked = false) => ({
  responsive: true,
  plugins: {
    legend: stacked
      ? {
          position: 'top',
          labels: {
            color: '#374151',
            font: { size: 13 },
          },
        }
      : { display: false },
    tooltip: {
      callbacks: {
        label: (context) => valueFormatter(context.raw),
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: '#4B5563',
        callback: (val) => valueFormatter(val),
      },
      title: {
        display: true,
        text: title,
        color: '#374151',
        font: { size: 14 },
      },
      grid: { color: '#E5E7EB' },
    },
    x: {
      stacked: true,
      ticks: { color: '#4B5563' },
      grid: { color: '#F3F4F6' },
    },
  },
});
