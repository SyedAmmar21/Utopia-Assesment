import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Upload,
  X,
  FileText,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

const MAX_FILES = 6;

export default function CompleteJob() {
  const { id } = useParams();
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
      .select("*")
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

      alert("Job completed successfully.");

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