import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ClipboardList, Clock3, MapPin, UserRound, Wrench } from "lucide-react";
import { supabase } from "../../lib/supabase";

const statusStyles = {
  Assigned: "bg-amber-50 text-amber-700 ring-amber-100",
  "In Progress": "bg-blue-50 text-blue-700 ring-blue-100",
};

export default function TechnicianDashboard() {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [orders, setOrders] = useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(false);

  async function fetchTechnicians() {
    setLoadingTechnicians(true);
    const { data, error } = await supabase.from("technicians").select("id, name").order("name", { ascending: true });
    if (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    } else {
      setTechnicians(data || []);
      if (data?.length) setSelectedTechnician(data[0].id);
    }
    setLoadingTechnicians(false);
  }

  async function fetchAssignedJobs() {
    setLoadingJobs(true);
    const { data, error } = await supabase.from("orders").select("*").eq("assigned_technician_id", selectedTechnician).in("status", ["Assigned", "In Progress"]).order("created_at", { ascending: false });
    if (error) {
      console.error("Error fetching technician jobs:", error);
      setOrders([]);
    } else setOrders(data || []);
    setLoadingJobs(false);
  }

  useEffect(() => { fetchTechnicians(); }, []);
  useEffect(() => {
    if (selectedTechnician) fetchAssignedJobs();
    else setOrders([]);
  }, [selectedTechnician]);

  const selectedTechnicianData = technicians.find((technician) => technician.id === selectedTechnician);
  const assignedCount = orders.filter((order) => order.status === "Assigned").length;
  const inProgressCount = orders.filter((order) => order.status === "In Progress").length;
  const loading = loadingTechnicians || loadingJobs;
  const stats = [
    { title: "Active jobs", value: orders.length, icon: ClipboardList, style: "bg-slate-900 text-white" },
    { title: "Ready to start", value: assignedCount, icon: Clock3, style: "bg-amber-50 text-amber-700" },
    { title: "In progress", value: inProgressCount, icon: Wrench, style: "bg-blue-50 text-blue-700" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="rounded-2xl bg-slate-900 px-6 py-7 text-white shadow-lg shadow-slate-900/10 sm:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-200">Technician workspace</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Your work, all in one place.</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Review active service orders and record completed work when you are ready.</p>
          </div>
          <div className="min-w-52 rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur-sm">
            <label htmlFor="technician" className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-300"><UserRound size={14} /> Viewing as</label>
            <select id="technician" value={selectedTechnician} onChange={(event) => setSelectedTechnician(event.target.value)} disabled={loadingTechnicians} className="w-full cursor-pointer rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm font-medium text-white outline-none transition focus:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
              {technicians.length === 0 ? <option value="">No technicians found</option> : technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return <div key={stat.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{stat.title}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{loading ? "—" : stat.value}</p></div><div className={`grid size-10 place-items-center rounded-xl ${stat.style}`}><Icon size={19} /></div></div></div>;
        })}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-bold text-slate-900">Active jobs</h2><p className="mt-1 text-sm text-slate-500">{selectedTechnicianData ? `Work currently assigned to ${selectedTechnicianData.name}.` : "Choose a technician to view their work."}</p></div>{!loading && orders.length > 0 && <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{orders.length} open</span>}</div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading active jobs…</div> : technicians.length === 0 ? <EmptyState title="No technicians available" message="Add a technician before assigning service orders." /> : orders.length === 0 ? <EmptyState title="No active jobs" message={`${selectedTechnicianData?.name || "This technician"} has no assigned or in-progress jobs.`} /> : <div className="divide-y divide-slate-100">
          {orders.map((order) => <div key={order.id} className="flex flex-col gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6 md:flex-row md:items-center md:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-slate-900">{order.order_number || order.id}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusStyles[order.status] || "bg-slate-100 text-slate-700 ring-slate-200"}`}>{order.status}</span></div><p className="mt-2 text-sm font-medium text-slate-700">{order.customer_name}</p><div className="mt-1 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />{order.address || "Address not provided"}</div><p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">{order.service_type || "Service order"}</p></div><Link to={`/technician/complete-job/${order.id}`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">Complete job <ArrowRight size={16} /></Link></div>)}
        </div>}
      </section>
    </div>
  );
}

function EmptyState({ title, message }) {
  return <div className="px-6 py-14 text-center"><div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500"><CheckCircle2 size={21} /></div><h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-slate-500">{message}</p></div>;
}
