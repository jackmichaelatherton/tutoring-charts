import { Bar } from 'react-chartjs-2';
import { parse, format } from 'date-fns';
import { createBarOptions } from '../../utils/chartUtils';

export default function UniqueStudentsChart({ uniqueStudentsData, filteredMonths }) {
  if (!uniqueStudentsData?.months || !uniqueStudentsData?.data) return null;

  const dataset = {
    labels: filteredMonths.map(m =>
      format(parse(m, 'yyyy-MM', new Date()), 'MMM-yy')
    ),
    datasets: [
      {
        label: 'Unique Students',
        data: filteredMonths.map((m) => {
          const idx = uniqueStudentsData.months.indexOf(m);
          return idx >= 0 ? uniqueStudentsData.data[idx] : 0;
        }),
        backgroundColor: '#c9cad6',
        barPercentage: 0.8,
        categoryPercentage: 0.7,
      },
    ],
  };

  return (
    <section id="unique-students">
      <h2 className="text-lg font-semibold mb-2">
        Number of students
      </h2>
      <Bar data={dataset} options={createBarOptions('Students', (val) => `${val}`)} />
    </section>
  );
}
