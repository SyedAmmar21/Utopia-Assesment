import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, Clock, Wrench, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

const technicians = [
  {
    id: "0bdbae42-4add-4921-8d05-272f84cd00c5",
    name: "Ali",
  },
];

export default function TechnicianDashboard() {
  const [selectedTechnician, setSelectedTechnician] = useState(
  technicians[0].id
);

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignedJobs();
  }, [selectedTechnician]);

  async function fetchAssignedJobs() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_technician_id", selectedTechnician)
      .in("status", ["Assigned", "In Progress"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching technician jobs:", error);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  const assignedCount = orders.filter(
    (order) => order.status === "Assigned"
  ).length;

  const inProgressCount = orders.filter(
    (order) => order.status === "In Progress"
  ).length;

  const stats = [
    {
      title: "My Jobs",
      value: orders.length,
      icon: ClipboardList,
    },
    {
      title: "Assigned",
      value: assignedCount,
      icon: Clock,
    },
    {
      title: "In Progress",
      value: inProgressCount,
      icon: Wrench,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Technician Dashboard
          </h1>

          <p className="text-sm text-gray-500">
            View and complete your assigned service jobs.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Viewing as
          </label>

          <select
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
          >
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">
                    {stat.title}
                  </p>

                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {loading ? "..." : stat.value}
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Assigned Jobs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            My Assigned Jobs
          </h2>

          <p className="text-sm text-gray-500">
            Jobs currently assigned to{" "}
            {technicians.find(
              (technician) => technician.id === selectedTechnician
            )?.name}.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading jobs...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No active jobs assigned to {technicians.find((technician) => technician.id === selectedTechnician)?.name}.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">
                      {order.order_number || order.id}
                    </p>

                    <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {order.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700">
                    {order.customer_name}
                  </p>

                  <p className="text-sm text-gray-500">
                    {order.address}
                  </p>

                  <p className="text-sm text-gray-500">
                    Service: {order.service_type}
                  </p>
                </div>

                <Link
                  to={`/technician/complete-job/${order.id}`}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <CheckCircle2 size={18} />
                  Complete Job
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}