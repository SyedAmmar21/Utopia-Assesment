import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  ShieldCheck,
  Snowflake,
  Wrench,
} from "lucide-react";

const portals = [
  {
    title: "Admin portal",
    description: "Create service orders, assign work, and keep operations moving.",
    to: "/admin",
    icon: ClipboardList,
    accent: "bg-blue-600",
    iconStyle: "bg-blue-50 text-blue-600",
    hover: "group-hover:border-blue-200 group-hover:shadow-blue-100/80",
  },
  {
    title: "Technician portal",
    description: "View assigned jobs and complete service work in the field.",
    to: "/technician",
    icon: Wrench,
    accent: "bg-emerald-500",
    iconStyle: "bg-emerald-50 text-emerald-600",
    hover: "group-hover:border-emerald-200 group-hover:shadow-emerald-100/80",
  },
  {
    title: "Manager portal",
    description: "Review completed work, performance, and operational insights.",
    to: "/manager",
    icon: BarChart3,
    accent: "bg-violet-600",
    iconStyle: "bg-violet-50 text-violet-600",
    hover: "group-hover:border-violet-200 group-hover:shadow-violet-100/80",
  },
];

function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-5 py-6 text-slate-900 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/80 via-slate-50 to-transparent" />
      <div className="pointer-events-none absolute -right-28 top-28 h-72 w-72 rounded-full border border-blue-100 bg-blue-50/50" />
      <div className="pointer-events-none absolute -left-24 bottom-[-7rem] h-80 w-80 rounded-full border border-slate-200 bg-white" />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between py-3 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-900/15">
              <Snowflake size={21} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight text-slate-900">Sejuk Sejuk</p>
              <p className="text-xs text-slate-500">Operations System</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm sm:flex">
            <ShieldCheck size={15} className="text-emerald-600" />
            Secure workspace
          </div>
        </header>

        <section className="flex flex-1 items-center py-12 sm:py-16">
          <div className="w-full">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                Service operations, simplified
              </span>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                Everything your team needs to keep work flowing.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                Choose your workspace to manage orders, complete jobs, or keep an eye on the bigger picture.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 sm:mt-14 sm:gap-5 md:grid-cols-3">
              {portals.map((portal) => {
                const Icon = portal.icon;

                return (
                  <Link
                    key={portal.to}
                    to={portal.to}
                    className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-xl ${portal.hover}`}
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 ${portal.accent}`} />
                    <div className={`grid size-12 place-items-center rounded-xl ${portal.iconStyle}`}>
                      <Icon size={23} strokeWidth={2.1} />
                    </div>
                    <h2 className="mt-6 text-lg font-bold text-slate-900">{portal.title}</h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{portal.description}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                      Open workspace
                      <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/80 py-5 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <span>Service coordination for every part of the team.</span>
          <span>Sejuk Sejuk Operations</span>
        </footer>
      </div>
    </main>
  );
}

export default Home;
