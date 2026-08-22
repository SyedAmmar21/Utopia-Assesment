import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ClipboardList,
  UserCheck,
  Wrench,
  CheckCircle2,
  Plus,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }

    setLoading(false);
  }

  const totalOrders = orders.length;

  const assignedOrders = orders.filter(
    (order) => order.status === "Assigned"
  ).length;

  const inProgressOrders = orders.filter(
    (order) => order.status === "In Progress"
  ).length;

  const completedOrders = orders.filter(
    (order) =>
      order.status === "Job Done" ||
      order.status === "Reviewed" ||
      order.status === "Closed"
  ).length;

  const stats = [
    {
      title: "Total Orders",
      value: totalOrders,
      icon: ClipboardList,
    },
    {
      title: "Assigned",
      value: assignedOrders,
      icon: UserCheck,
    },
    {
      title: "In Progress",
      value: inProgressOrders,
      icon: Wrench,
    },
    {
      title: "Completed",
      value: completedOrders,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Admin Dashboard
          </h1>

          <p className="text-sm text-gray-500">
            Overview of service orders and operations.
          </p>
        </div>

        <Link
          to="/admin/create-order"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Order
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Recent Orders */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">
            Recent Orders
          </h2>

          <p className="text-sm text-gray-500">
            Latest service orders in the system.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No orders found. Create your first service order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Service</th>
                  <th className="px-5 py-3">Technician</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {orders.slice(0, 8).map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {order.order_number || order.id}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {order.customer_name}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {order.service_type}
                    </td>

                    <td className="px-5 py-4 text-gray-600">
                      {order.assigned_technician || "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}