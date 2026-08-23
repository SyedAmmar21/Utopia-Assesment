import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardCheck,
  Eye,
  User,
  Calendar,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

function ManagerDashboard() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedJobs();
  }, []);

  async function fetchCompletedJobs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        technicians (
          id,
          name
        ),
        job_completions (
          id,
          work_done,
          final_amount,
          extra_charges,
          remarks,
          payment_received,
          payment_method,
          completed_at
        )
      `)
      .in("status", ["Job Done", "Reviewed"])
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching completed jobs:", error);
      setJobs([]);
    } else {
      setJobs(data || []);
    }

    setLoading(false);
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "Not available";
    }

    return new Date(dateString).toLocaleDateString(
      "en-MY",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Manager Dashboard
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Review completed service jobs and monitor operations.
        </p>
      </div>

      {/* Summary Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-lg bg-green-50 p-3 text-green-600">
            <ClipboardCheck size={24} />
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Jobs Awaiting Review
            </p>

            <p className="text-3xl font-bold text-gray-900">
              {loading
                ? "..."
                : jobs.filter(
                    (job) => job.status === "Job Done"
                  ).length}
            </p>
          </div>
        </div>
      </div>

      {/* Completed Jobs */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Completed Jobs
          </h2>

          <p className="text-sm text-gray-500">
            Review work submitted by technicians.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading completed jobs...
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No completed jobs available for review.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">
                    Order
                  </th>

                  <th className="px-5 py-3">
                    Customer
                  </th>

                  <th className="px-5 py-3">
                    Technician
                  </th>

                  <th className="px-5 py-3">
                    Completed
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {jobs.map((job) => {
                  const completion =
                    job.job_completions?.[0];

                  return (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-50"
                    >
                      {/* Order */}
                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {job.order_number}
                        </p>

                        <p className="text-sm text-gray-500">
                          {job.service_type}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4 text-gray-600">
                        {job.customer_name}
                      </td>

                      {/* Technician */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User
                            size={16}
                            className="text-gray-400"
                          />

                          {job.technicians?.name ||
                            "Unknown"}
                        </div>
                      </td>

                      {/* Completed Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar
                            size={16}
                            className="text-gray-400"
                          />

                          {formatDate(
                            completion?.completed_at
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            job.status === "Reviewed"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-green-50 text-green-700"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <Link
                          to={`/manager/job/${job.id}`}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <Eye size={16} />
                          Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard;