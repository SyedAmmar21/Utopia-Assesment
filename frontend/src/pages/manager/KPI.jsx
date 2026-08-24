import { useEffect, useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  Users,
  CalendarClock,
  Trophy,
  AlertCircle,
  Loader2,
} from "lucide-react";

function KPI() {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchKPI() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "https://utopia-assessment-backend.onrender.com/api/kpi/technician-performance-this-week"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load KPI data."
          );
        }

        setKpiData(data);
      } catch (error) {
        console.error("KPI fetch error:", error);

        setError(
          error.message ||
            "Something went wrong while loading KPI data."
        );
      } finally {
        setLoading(false);
      }
    }

    fetchKPI();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <Loader2
            size={24}
            className="animate-spin"
          />

          <span>Loading KPI data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <AlertCircle
          size={22}
          className="mt-0.5 shrink-0"
        />

        <div>
          <p className="font-semibold">
            Unable to load KPI dashboard
          </p>

          <p className="mt-1 text-sm">
            {error}
          </p>
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return null;
  }

  const { summary, technicians } = kpiData;
  const maxJobs = Math.max(
    ...technicians.map((item) => item.jobs_completed),
    1
);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      "en-MY",
      {
        style: "currency",
        currency: "MYR",
      }
    ).format(amount || 0);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">

      {/* Header */}
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900">
          <BarChart3
            size={32}
            className="text-blue-600"
          />

          KPI Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Weekly technician performance and operational metrics.
        </p>
      </div>


      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Total Jobs */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Jobs Completed
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {summary.total_jobs_completed}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                This week
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
              <BriefcaseBusiness size={24} />
            </div>
          </div>
        </div>


        {/* Total Amount */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Amount
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {formatCurrency(summary.total_amount)}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Completed jobs
              </p>
            </div>

            <div className="rounded-lg bg-green-50 p-3 text-green-600">
              <BarChart3 size={24} />
            </div>
          </div>
        </div>


        {/* Active Technicians */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Active Technicians
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {summary.active_technicians}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                With completed jobs
              </p>
            </div>

            <div className="rounded-lg bg-purple-50 p-3 text-purple-600">
              <Users size={24} />
            </div>
          </div>
        </div>


        {/* Postpone / Reschedule */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Postpone / Reschedule
              </p>

              <p className="mt-2 text-3xl font-bold text-gray-900">
                {summary.postpone_reschedule_count}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                This week
              </p>
            </div>

            <div className="rounded-lg bg-orange-50 p-3 text-orange-600">
              <CalendarClock size={24} />
            </div>
          </div>
        </div>

      </div>


      {/* Top Technician */}
      {summary.top_technician && (
        <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-6 shadow-sm">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div className="flex items-center gap-4">

              <div className="rounded-xl bg-yellow-100 p-4 text-yellow-600">
                <Trophy size={32} />
              </div>

              <div>
                <p className="text-sm font-medium text-yellow-700">
                  Top Performer This Week
                </p>

                <h2 className="mt-1 text-2xl font-bold text-gray-900">
                  {summary.top_technician.name}
                </h2>

                <p className="mt-1 text-sm text-gray-600">
                  {summary.top_technician.branch}
                </p>
              </div>

            </div>


            <div className="flex gap-8">

              <div>
                <p className="text-sm text-gray-500">
                  Jobs Completed
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {summary.top_technician.jobs_completed}
                </p>
              </div>


              <div>
                <p className="text-sm text-gray-500">
                  Total Amount
                </p>

                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatCurrency(
                    summary.top_technician.total_amount
                  )}
                </p>
              </div>

            </div>

          </div>

        </div>
      )}


      {/* Technician Leaderboard */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">

        <div className="border-b border-gray-200 p-6">
          <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Trophy
              size={22}
              className="text-yellow-500"
            />

            Technician Leaderboard
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Ranked by completed jobs this week.
          </p>
        </div>


        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Rank
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Technician
                </th>

                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                  Branch
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Jobs Completed
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Total Amount
                </th>

                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                  Postpone / Reschedule
                </th>

              </tr>
            </thead>


            <tbody>

              {technicians.map((technician) => (
                <tr
                  key={technician.technician_id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >

                  <td className="px-6 py-4">

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 font-semibold text-gray-700">
                      {technician.rank}
                    </div>

                  </td>


                  <td className="px-6 py-4">

                    <p className="font-semibold text-gray-900">
                      {technician.name}
                    </p>

                  </td>


                  <td className="px-6 py-4 text-gray-600">
                    {technician.branch || "-"}
                  </td>


                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {technician.jobs_completed}
                  </td>


                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {formatCurrency(
                      technician.total_amount
                    )}
                  </td>


                  <td className="px-6 py-4 text-right text-gray-600">
                    {technician.postpone_reschedule_count}
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>


      {/* Simple Performance Visualization */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">

        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Jobs Completed by Technician
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Weekly completed job comparison.
          </p>
        </div>


        <div className="mt-6 space-y-5">

          {technicians.map((technician) => {

            const percentage =
              (technician.jobs_completed / maxJobs) * 100;

            return (
              <div
                key={technician.technician_id}
              >

                <div className="mb-2 flex items-center justify-between">

                  <span className="font-medium text-gray-700">
                    {technician.name}
                  </span>

                  <span className="text-sm text-gray-500">
                    {technician.jobs_completed} jobs
                  </span>

                </div>


                <div className="h-3 overflow-hidden rounded-full bg-gray-100">

                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />

                </div>

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}

export default KPI;