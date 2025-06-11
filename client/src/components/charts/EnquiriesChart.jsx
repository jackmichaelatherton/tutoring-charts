import { Bar } from 'react-chartjs-2';
import { createBarOptions } from '../../utils/chartUtils';

export default function EnquiriesChart({ filteredEnquiriesData }) {
  const hasData =
    filteredEnquiriesData &&
    Array.isArray(filteredEnquiriesData.datasets) &&
    filteredEnquiriesData.datasets.length > 0 &&
    Array.isArray(filteredEnquiriesData.datasets[0].data) &&
    filteredEnquiriesData.datasets[0].data.length > 0;

  return (
    <section id="enquiries">
      <h2 className="text-lg font-semibold mb-2">
        Enquiries per Month
      </h2>
      {hasData ? (
        <Bar
        data={filteredEnquiriesData}
        options={createBarOptions('', (val) => val, false)} // <-- set to false
        />
      ) : (
        <p className="text-center text-gray-500">No data to display.</p>
      )}
    </section>
  );
}