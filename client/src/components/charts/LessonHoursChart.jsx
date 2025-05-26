import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function LessonHoursChart({ filteredAppointmentData }) {
  return (
    <section id="lesson-hours">
      <h2 className="text-xl font-semibold text-gray-800 text-center mb-4">
        Lesson hours
      </h2>
      {filteredAppointmentData.datasets.length > 0 ? (
        <Bar
          data={filteredAppointmentData}
          options={createBarOptions('', (val) => val, true)}
        />
      ) : (
        <p className="text-center text-gray-500">No data to display.</p>
      )}
    </section>
  );
}