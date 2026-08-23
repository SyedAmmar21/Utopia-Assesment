import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [technician, setTechnician] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  async function fetchOrderDetails() {
    setLoading(true);

    // Get order
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single();

    if (orderError) {
      console.error("Error fetching order:", orderError);
      setLoading(false);
      return;
    }

    setOrder(orderData);

    // Get assigned technician
    if (orderData.assigned_technician_id) {
      const { data: technicianData, error: technicianError } =
        await supabase
          .from("technicians")
          .select("*")
          .eq("id", orderData.assigned_technician_id)
          .single();

      if (technicianError) {
        console.error(
          "Error fetching technician:",
          technicianError
        );
      } else {
        setTechnician(technicianData);
      }
    }

    // Get job completion if available
    const { data: completionData, error: completionError } =
      await supabase
        .from("job_completions")
        .select("*")
        .eq("order_id", id)
        .maybeSingle();

    if (completionError) {
      console.error(
        "Error fetching completion:",
        completionError
      );
    } else {
      setCompletion(completionData);
    }

    // Get uploaded files
    const { data: fileData, error: fileError } =
      await supabase
        .from("job_files")
        .select("*")
        .eq("order_id", id)
        .order("uploaded_at", { ascending: false });

    if (fileError) {
      console.error("Error fetching files:", fileError);
    } else {
      setFiles(fileData || []);
    }

    setLoading(false);
  }

  function getFileUrl(filePath) {
    const { data } = supabase.storage
      .from("job-files")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading order details...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-red-500">
        Order not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button
        onClick={() => navigate("/admin")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      {/* Order Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Service Order
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              {order.order_number}
            </h1>
          </div>

          <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            {order.status}
          </span>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">
              Customer
            </p>

            <p className="font-medium text-gray-900">
              {order.customer_name}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Phone
            </p>

            <p className="font-medium text-gray-900">
              {order.phone || "-"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Service Type
            </p>

            <p className="font-medium text-gray-900">
              {order.service_type}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Assigned Technician
            </p>

            <p className="font-medium text-gray-900">
              {technician?.name || "Unassigned"}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">
              Address
            </p>

            <p className="font-medium text-gray-900">
              {order.address}
            </p>
          </div>

          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">
              Reported Problem
            </p>

            <p className="font-medium text-gray-900">
              {order.problem_description}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Quoted Price
            </p>

            <p className="font-medium text-gray-900">
              RM {Number(order.quoted_price || 0).toFixed(2)}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Admin Notes
            </p>

            <p className="font-medium text-gray-900">
              {order.admin_notes || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Completion Details */}
      {completion && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            Job Completion
          </h2>

          <div className="space-y-5">
            <div>
              <p className="text-sm text-gray-500">
                Work Done
              </p>

              <p className="mt-1 text-gray-900">
                {completion.work_done}
              </p>
            </div>

            {completion.remarks && (
              <div>
                <p className="text-sm text-gray-500">
                  Technician Remarks
                </p>

                <p className="mt-1 text-gray-900">
                  {completion.remarks}
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">
                  Quoted Amount
                </p>

                <p className="font-medium text-gray-900">
                  RM {Number(order.quoted_price || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Extra Charges
                </p>

                <p className="font-medium text-gray-900">
                  RM {Number(completion.extra_charges || 0).toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Final Amount
                </p>

                <p className="font-medium text-gray-900">
                  RM {Number(completion.final_amount || 0).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">
                  Payment Received
                </p>

                <p className="font-medium text-gray-900">
                  {completion.payment_received
                    ? `RM ${Number(
                        completion.payment_received
                      ).toFixed(2)}`
                    : "Not recorded"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Payment Method
                </p>

                <p className="font-medium text-gray-900">
                  {completion.payment_method || "Not recorded"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Job Evidence */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Job Evidence
        </h2>

        <p className="mb-5 text-sm text-gray-500">
          Files uploaded by the technician.
        </p>

        {files.length === 0 ? (
          <p className="text-sm text-gray-500">
            No files uploaded.
          </p>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <a
                key={file.id}
                href={getFileUrl(file.file_path)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 hover:bg-gray-50"
              >
                <FileText
                  size={20}
                  className="text-blue-600"
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {file.file_name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {file.file_type || "File"}
                  </p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}