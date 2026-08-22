import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function CreateOrder() {
  const navigate = useNavigate();

  const [technicians, setTechnicians] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    address: "",
    problemDescription: "",
    serviceType: "Aircond Cleaning",
    quotedPrice: "",
    assignedTechnicianId: "",
    adminNotes: "",
  });

  useEffect(() => {
    async function fetchTechnicians() {
      const { data, error } = await supabase
        .from("technicians")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) {
        setError("Failed to load technicians: " + error.message);
      } else {
        setTechnicians(data);
      }

      setLoadingTechnicians(false);
    }

    fetchTechnicians();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  }

  function generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);

    return `ORD-${timestamp}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError(null);
    setSubmitting(true);

    const orderNumber = generateOrderNumber();

    const status = formData.assignedTechnicianId
      ? "Assigned"
      : "New";

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_name: formData.customerName,
        phone: formData.phone,
        address: formData.address,
        problem_description: formData.problemDescription,
        service_type: formData.serviceType,
        quoted_price: Number(formData.quotedPrice) || 0,
        assigned_technician_id:
          formData.assignedTechnicianId || null,
        admin_notes: formData.adminNotes,
        status,
      })
      .select()
      .single();

    if (orderError) {
      setError(orderError.message);
      setSubmitting(false);
      return;
    }

    const action = formData.assignedTechnicianId
      ? "Order created and technician assigned"
      : "Order created";

    const { error: activityError } = await supabase
      .from("order_activity")
      .insert({
        order_id: order.id,
        action,
        performed_by: "Admin",
        old_status: null,
        new_status: status,
        details: `Order ${orderNumber} created`,
      });

    if (activityError) {
      console.error(
        "Order created, but activity logging failed:",
        activityError.message
      );
    }

    navigate("/admin");
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">
          Create Service Order
        </h1>

        <p className="mt-2 text-slate-600">
          Create a new service request and optionally assign a technician.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Customer Name
            </label>

            <input
              type="text"
              name="customerName"
              value={formData.customerName}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="Enter customer name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Phone Number
            </label>

            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="012-345 6789"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Address
          </label>

          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            rows="3"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Enter service address"
          />
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Problem Description
          </label>

          <textarea
            name="problemDescription"
            value={formData.problemDescription}
            onChange={handleChange}
            rows="4"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Describe the customer's problem"
          />
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Service Type
            </label>

            <select
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option>Aircond Cleaning</option>
              <option>Aircond Repair</option>
              <option>Aircond Installation</option>
              <option>Gas Refill</option>
              <option>General Servicing</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Quoted Price (RM)
            </label>

            <input
              type="number"
              name="quotedPrice"
              value={formData.quotedPrice}
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Assigned Technician
          </label>

          <select
            name="assignedTechnicianId"
            value={formData.assignedTechnicianId}
            onChange={handleChange}
            disabled={loadingTechnicians}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 disabled:bg-slate-100"
          >
            <option value="">
              {loadingTechnicians
                ? "Loading technicians..."
                : "Assign later"}
            </option>

            {technicians.map((technician) => (
              <option
                key={technician.id}
                value={technician.id}
              >
                {technician.name} — {technician.branch}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Admin Notes
          </label>

          <textarea
            name="adminNotes"
            value={formData.adminNotes}
            onChange={handleChange}
            rows="3"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Additional notes for the technician"
          />
        </div>

        <div className="mt-8 flex justify-end gap-3 border-t pt-6">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="rounded-lg border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating Order..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateOrder;