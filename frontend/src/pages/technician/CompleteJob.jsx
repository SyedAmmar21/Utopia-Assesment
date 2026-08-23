import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Upload,
  X,
  FileText,
  MapPin,
  UserRound,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const MAX_FILES = 6;

export default function CompleteJob() {
  const { id } = useParams();

  return id ? <CompleteJobForm id={id} /> : <CompleteJobList />;
}

function CompleteJobForm({ id }) {
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [formData, setFormData] = useState({
    workDone: "",
    extraCharges: "",
    remarks: "",
    paymentReceived: "",
    paymentMethod: "",
  });

  useEffect(() => {
    fetchOrder();
  }, [id]);

  async function fetchOrder() {
    setLoading(true);

    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        technicians (
          name
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching order:", error);
      setOrder(null);
      setLoading(false);
      return;
    }

    setOrder(data);

    // Automatically mark the job as In Progress
    if (data.status === "Assigned") {
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "In Progress",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating job status:", updateError);
      } else {
        setOrder({
          ...data,
          status: "In Progress",
        });
      }
    }

    setLoading(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const newFiles = Array.from(event.target.files);

    const allowedTypes = [
      "image/",
      "video/",
      "application/pdf",
    ];

    const validFiles = newFiles.filter((file) => {
      return allowedTypes.some((type) => {
        if (type.endsWith("/")) {
          return file.type.startsWith(type);
        }

        return file.type === type;
      });
    });

    if (validFiles.length !== newFiles.length) {
      alert(
        "Some files were not added. Only images, videos, and PDF files are allowed."
      );
    }

    if (selectedFiles.length + validFiles.length > MAX_FILES) {
      alert(`You can upload a maximum of ${MAX_FILES} files.`);
      return;
    }

    setSelectedFiles((previous) => [
      ...previous,
      ...validFiles,
    ]);

    // Allows the same file to be selected again if needed
    event.target.value = "";
  }

  function removeFile(indexToRemove) {
    setSelectedFiles((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  }

  const quotedPrice = Number(order?.quoted_price || 0);
  const extraCharges = Number(formData.extraCharges || 0);

  const finalAmount = quotedPrice + extraCharges;

  async function uploadFiles() {
    const uploadedFiles = [];

    for (const file of selectedFiles) {
      // Create a unique file path
      const fileName = `${Date.now()}-${crypto.randomUUID()}-${file.name}`;

      const filePath = `${id}/${fileName}`;

      // Upload actual file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("job-files")
        .upload(filePath, file);

      if (uploadError) {
        console.error("File upload error:", uploadError);
        throw new Error(
          `Failed to upload file: ${file.name}`
        );
      }

      uploadedFiles.push({
        order_id: id,
        file_name: file.name,
        file_path: filePath,
        file_type: file.type,
      });
    }

    return uploadedFiles;
  }

  async function saveFileMetadata(uploadedFiles) {
    if (uploadedFiles.length === 0) {
      return;
    }

    const { error } = await supabase
      .from("job_files")
      .insert(uploadedFiles);

    if (error) {
      console.error("Error saving file metadata:", error);
      throw new Error(
        "Files were uploaded, but their information could not be saved."
      );
    }
  }

  function openWhatsAppNotification() {
    if (!order?.phone) {
      console.warn(
        "Customer phone number is missing."
      );

      return;
    }

    // Remove spaces, +, -, brackets, etc.
    let phone = order.phone.replace(
      /\D/g,
      ""
    );

    // Convert Malaysian local phone number:
    // 0123456789 -> 60123456789
    if (phone.startsWith("0")) {
      phone = `60${phone.substring(1)}`;
    }

    const technicianName =
      order.technicians?.name ||
      "Technician";

    const completedTime =
      new Date().toLocaleString(
        "en-MY",
        {
          dateStyle: "medium",
          timeStyle: "short",
        }
      );

    const message = `Hi ${order.customer_name},

Job ${order.order_number} has been completed by Technician ${technicianName} at ${completedTime}.

Please check the completed service and leave feedback.

Thank you!
Sejuk Sejuk Operations`;

    const whatsappUrl =
      `https://wa.me/${phone}?text=${encodeURIComponent(
        message
      )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);

    try {
      // Step 1: Save job completion
      const { error: completionError } = await supabase
        .from("job_completions")
        .insert({
          order_id: id,
          technician_id: order.assigned_technician_id,
          work_done: formData.workDone,
          extra_charges: extraCharges,
          final_amount: finalAmount,
          remarks: formData.remarks || null,
          payment_received: formData.paymentReceived
            ? Number(formData.paymentReceived)
            : null,
          payment_method:
            formData.paymentMethod || null,
          completed_at: new Date().toISOString(),
        });

      if (completionError) {
        throw completionError;
      }

      // Step 2: Upload selected files to Supabase Storage
      const uploadedFiles = await uploadFiles();

      // Step 3: Save file metadata in job_files
      await saveFileMetadata(uploadedFiles);

      // Step 4: Mark the order as Job Done
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "Job Done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (orderError) {
        throw orderError;
      }

      // Step 5: Trigger WhatsApp notification
      openWhatsAppNotification();

      alert(
        "Job completed successfully. WhatsApp notification prepared."
      );

      navigate("/technician");
    } catch (error) {
      console.error("Job completion error:", error);

      alert(
        error.message ||
          "Something went wrong while completing the job."
      );

      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading job...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-red-500">
        Job not found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => navigate("/technician")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Jobs
      </button>

      {/* Order Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-start justify-between">
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

        <div className="grid gap-4 sm:grid-cols-2">
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
              Service Type
            </p>

            <p className="font-medium text-gray-900">
              {order.service_type}
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
        </div>
      </div>

      {/* Completion Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Service Completion
          </h2>

          <p className="text-sm text-gray-500">
            Record the completed service work.
          </p>
        </div>

        {/* Work Done */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Work Done *
          </label>

          <textarea
            name="workDone"
            value={formData.workDone}
            onChange={handleChange}
            required
            rows="4"
            placeholder="Describe the work completed..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        {/* Pricing */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Quoted Price
            </label>

            <input
              value={`RM ${quotedPrice.toFixed(2)}`}
              readOnly
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-gray-600"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Extra Charges
            </label>

            <input
              type="number"
              name="extraCharges"
              value={formData.extraCharges}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Final Amount */}
        <div className="rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            Final Amount
          </p>

          <p className="text-2xl font-bold text-blue-900">
            RM {finalAmount.toFixed(2)}
          </p>
        </div>

        {/* File Upload */}
        <div className="border-t border-gray-200 pt-6">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">
              Job Evidence
            </h3>

            <p className="text-sm text-gray-500">
              Upload up to 6 photos, videos, or PDF files.
            </p>
          </div>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-gray-600 transition hover:border-blue-500 hover:text-blue-600">
            <Upload size={20} />

            <span>
              Choose Files ({selectedFiles.length}/{MAX_FILES})
            </span>

            <input
              type="file"
              multiple
              accept="image/*,video/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={selectedFiles.length >= MAX_FILES}
            />
          </label>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText
                      size={18}
                      className="shrink-0 text-gray-500"
                    />

                    <span className="truncate text-sm text-gray-700">
                      {file.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="ml-3 text-red-500 hover:text-red-700"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remarks */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Remarks
          </label>

          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleChange}
            rows="3"
            placeholder="Additional remarks..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </div>

        {/* Payment */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900">
            Payment Received
          </h3>

          <p className="mb-4 text-sm text-gray-500">
            Optional: record payment received from the customer.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Amount
              </label>

              <input
                type="number"
                name="paymentReceived"
                value={formData.paymentReceived}
                onChange={handleChange}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment Method
              </label>

              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 outline-none focus:border-blue-500"
              >
                <option value="">
                  Select method
                </option>

                <option value="Cash">
                  Cash
                </option>

                <option value="Online Transfer">
                  Online Transfer
                </option>

                <option value="Card">
                  Card
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CheckCircle2 size={20} />

          {submitting
            ? "Completing Job..."
            : "Mark Job as Done"}
        </button>
      </form>
    </div>
  );
}

function CompleteJobList() {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);

  async function fetchTechnicians() {
    setLoadingTechnicians(true);
    const { data, error } = await supabase
      .from("technicians")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    } else {
      setTechnicians(data || []);
      if (data?.length) setSelectedTechnician(data[0].id);
    }

    setLoadingTechnicians(false);
  }

  async function fetchJobs() {
    setLoadingJobs(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("assigned_technician_id", selectedTechnician)
      .in("status", ["Assigned", "In Progress"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching jobs:", error);
      setOrders([]);
    } else {
      setOrders(data || []);
    }

    setLoadingJobs(false);
  }

  useEffect(() => {
    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (selectedTechnician) fetchJobs();
    else setOrders([]);
  }, [selectedTechnician]);

  const technician = technicians.find((item) => item.id === selectedTechnician);
  const loading = loadingTechnicians || loadingJobs;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-600">Job completion</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Choose a job to complete</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">Select a technician to see their active jobs, then record the completed service work.</p>
        </div>
        <div className="w-full sm:w-60">
          <label htmlFor="completion-technician" className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700"><UserRound size={16} /> Technician</label>
          <select id="completion-technician" value={selectedTechnician} onChange={(event) => setSelectedTechnician(event.target.value)} disabled={loadingTechnicians} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50">
            {technicians.length === 0 ? <option value="">No technicians found</option> : technicians.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-6">
          <div>
            <h2 className="font-bold text-slate-900">Active jobs</h2>
            <p className="mt-1 text-sm text-slate-500">{technician ? `Available to complete for ${technician.name}.` : "Select a technician to continue."}</p>
          </div>
          {!loading && orders.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{orders.length} available</span>}
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading jobs…</div>
        ) : technicians.length === 0 ? (
          <CompletionEmptyState title="No technicians available" message="Add a technician before assigning or completing service orders." />
        ) : orders.length === 0 ? (
          <CompletionEmptyState title="No active jobs" message={`${technician?.name || "This technician"} does not have any assigned or in-progress jobs to complete.`} />
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((order) => (
              <Link key={order.id} to={`/technician/complete-job/${order.id}`} className="group flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{order.order_number || order.id}</p><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{order.status}</span></div>
                  <p className="mt-2 text-sm font-medium text-slate-700">{order.customer_name}</p>
                  <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={15} className="mt-0.5 shrink-0" />{order.address || "Address not provided"}</p>
                  <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{order.service_type || "Service order"}</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-blue-600">Open completion form <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CompletionEmptyState({ title, message }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><BriefcaseBusiness size={21} /></div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{message}</p>
    </div>
  );
}
