import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Wrench,
  FileText,
  CreditCard,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

function ManagerJobDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [job, setJob] = useState(null);
  const [completion, setCompletion] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  async function fetchJobDetails() {
    setLoading(true);

    try {
      // Get order and technician information
      const { data: jobData, error: jobError } =
        await supabase
          .from("orders")
          .select(`
            *,
            technicians (
              id,
              name
            )
          `)
          .eq("id", id)
          .single();

      if (jobError) {
        throw jobError;
      }

      setJob(jobData);

      // Get job completion information
      const { data: completionData, error: completionError } =
        await supabase
          .from("job_completions")
          .select("*")
          .eq("order_id", id)
          .single();

      if (completionError) {
        console.error(
          "Error fetching completion:",
          completionError
        );
      } else {
        setCompletion(completionData);
      }

      // Get uploaded job files
      const { data: fileData, error: fileError } =
        await supabase
          .from("job_files")
          .select("*")
          .eq("order_id", id)
          .order("uploaded_at", {
            ascending: false,
          });

      if (fileError) {
        console.error(
          "Error fetching job files:",
          fileError
        );
      } else {
        setFiles(fileData || []);
      }
    } catch (error) {
      console.error(
        "Error fetching job details:",
        error
      );
      setJob(null);
    }

    setLoading(false);
  }

  function getFileUrl(filePath) {
    const { data } = supabase.storage
      .from("job-files")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "Not available";
    }

    return new Date(dateString).toLocaleString(
      "en-MY",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function formatAmount(amount) {
    return `RM ${Number(amount || 0).toFixed(2)}`;
  }

  async function handleReview() {
    const confirmed = window.confirm(
        "Are you sure you want to mark this job as reviewed?"
    );

    if (!confirmed) {
        return;
    }

    setReviewing(true);

    const { error } = await supabase
        .from("orders")
        .update({
        status: "Reviewed",
        updated_at: new Date().toISOString(),
        })
        .eq("id", id);

    if (error) {
        console.error("Error reviewing job:", error);

        alert("Failed to mark the job as reviewed.");

        setReviewing(false);

        return;
    }

    setJob((previous) => ({
        ...previous,
        status: "Reviewed",
    }));

    alert("Job has been reviewed successfully.");

    setReviewing(false);
    }
  
  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        Loading job details...
      </div>
    );
  }

  if (!job) {
    return (
      <div className="space-y-4 p-8 text-center">
        <p className="text-red-500">
          Job not found.
        </p>

        <button
          onClick={() => navigate("/manager")}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Back to Manager Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate("/manager")}
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to Completed Jobs
      </button>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-gray-500">
              Service Order
            </p>

            <h1 className="text-2xl font-bold text-gray-900">
              {job.order_number}
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {job.service_type}
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span
                className={`w-fit rounded-full px-3 py-1 text-sm font-medium ${
                job.status === "Reviewed"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-green-50 text-green-700"
                }`}
            >
                {job.status}
            </span>

            {job.status === "Job Done" && (
                <button
                onClick={handleReview}
                disabled={reviewing}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                <CheckCircle2 size={18} />

                {reviewing
                    ? "Reviewing..."
                    : "Mark as Reviewed"}
                </button>
            )}
            </div>
        </div>
      </div>

      {/* Customer and Technician */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <User
              size={20}
              className="text-blue-600"
            />

            <h2 className="font-semibold text-gray-900">
              Customer
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">
                Name
              </p>

              <p className="font-medium text-gray-900">
                {job.customer_name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Phone
              </p>

              <p className="font-medium text-gray-900">
                {job.phone || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Address
              </p>

              <div className="flex gap-2">
                <MapPin
                  size={16}
                  className="mt-1 shrink-0 text-gray-400"
                />

                <p className="font-medium text-gray-900">
                  {job.address}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Technician */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Wrench
              size={20}
              className="text-blue-600"
            />

            <h2 className="font-semibold text-gray-900">
              Technician
            </h2>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">
                Technician Name
              </p>

              <p className="font-medium text-gray-900">
                {job.technicians?.name ||
                  "Unknown"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Completed At
              </p>

              <p className="font-medium text-gray-900">
                {formatDate(
                  completion?.completed_at
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Original Problem */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Reported Problem
          </h2>
        </div>

        <p className="text-gray-700">
          {job.problem_description}
        </p>
      </div>

      {/* Work Completed */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Work Completed
        </h2>

        <div className="space-y-5">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">
              Work Done
            </p>

            <p className="whitespace-pre-wrap text-gray-800">
              {completion?.work_done ||
                "No work description provided."}
            </p>
          </div>

          {completion?.remarks && (
            <div>
              <p className="mb-2 text-sm font-medium text-gray-500">
                Technician Remarks
              </p>

              <p className="whitespace-pre-wrap text-gray-800">
                {completion.remarks}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Financial Information */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <CreditCard
            size={20}
            className="text-blue-600"
          />

          <h2 className="font-semibold text-gray-900">
            Financial Information
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Quoted Price
            </p>

            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatAmount(job.quoted_price)}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-500">
              Extra Charges
            </p>

            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatAmount(
                completion?.extra_charges
              )}
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-700">
              Final Amount
            </p>

            <p className="mt-1 text-lg font-semibold text-blue-900">
              {formatAmount(
                completion?.final_amount
              )}
            </p>
          </div>

          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm text-green-700">
              Payment Received
            </p>

            <p className="mt-1 text-lg font-semibold text-green-900">
              {completion?.payment_received
                ? formatAmount(
                    completion.payment_received
                  )
                : "Not recorded"}
            </p>

            {completion?.payment_method && (
              <p className="mt-1 text-xs text-green-700">
                {completion.payment_method}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Job Evidence */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="font-semibold text-gray-900">
            Job Evidence
          </h2>

          <p className="text-sm text-gray-500">
            Files uploaded by the technician.
          </p>
        </div>

        {files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
            No evidence files were uploaded.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {files.map((file) => {
              const fileUrl = getFileUrl(
                file.file_path
              );

              const isImage =
                file.file_type?.startsWith(
                  "image/"
                );

              const isVideo =
                file.file_type?.startsWith(
                  "video/"
                );

              return (
                <div
                  key={file.id}
                  className="overflow-hidden rounded-xl border border-gray-200"
                >
                  {isImage ? (
                    <img
                      src={fileUrl}
                      alt={file.file_name}
                      className="h-48 w-full object-cover"
                    />
                  ) : isVideo ? (
                    <video
                      src={fileUrl}
                      controls
                      className="h-48 w-full bg-black object-cover"
                    />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-gray-50">
                      <FileText
                        size={48}
                        className="text-red-500"
                      />
                    </div>
                  )}

                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-gray-700">
                      {file.file_name}
                    </p>

                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink size={15} />
                      Open File
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerJobDetails;