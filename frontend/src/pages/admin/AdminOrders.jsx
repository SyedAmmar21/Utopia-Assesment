import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [techniciansById, setTechniciansById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchOrdersAndTechnicians() {
      setLoading(true);
      setError(null);

      const [ordersResult, techniciansResult] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, service_type, assigned_technician_id, status, created_at"
          )
          .order("created_at", { ascending: false }),
        supabase.from("technicians").select("id, name"),
      ]);

      if (ordersResult.error) {
        console.error("Error fetching orders:", ordersResult.error);
        setError("Unable to load orders. Please try again.");
      } else {
        setOrders(ordersResult.data || []);
      }

      if (techniciansResult.error) {
        console.error("Error fetching technicians:", techniciansResult.error);
      } else {
        setTechniciansById(
          Object.fromEntries(
            (techniciansResult.data || []).map((technician) => [
              technician.id,
              technician.name,
            ])
          )
        );
      }

      setLoading(false);
    }

    fetchOrdersAndTechnicians();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Orders
        </h1>

        <p className="text-sm text-gray-500">
          View and manage all service orders.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-200 p-5">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <ClipboardList size={20} />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">All Orders</h2>
            <p className="text-sm text-gray-500">
              Service orders sorted from newest to oldest.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading orders...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No orders found. Create your first service order.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Order Number</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Service Type</th>
                  <th className="px-5 py-3">Assigned Technician</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
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
                      {order.assigned_technician_id
                        ? techniciansById[order.assigned_technician_id] ||
                          "Unassigned"
                        : "Unassigned"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {order.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        View Details
                        <ExternalLink size={16} />
                      </Link>
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
