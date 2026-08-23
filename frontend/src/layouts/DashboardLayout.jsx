import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  Wrench,
  BarChart3,
  Bot,
  ArrowLeft,
} from "lucide-react";

function DashboardLayout({ role }) {
  const navigate = useNavigate();

  const navigation = {
    admin: [
      {
        name: "Dashboard",
        path: "/admin",
        icon: LayoutDashboard,
      },
      {
        name: "Create Order",
        path: "/admin/create-order",
        icon: PlusCircle,
      },
    ],

    technician: [
      {
        name: "My Jobs",
        path: "/technician",
        icon: ClipboardList,
      },
      {
        name: "Complete Job",
        path: "/technician/complete-job",
        icon: Wrench,
      },
    ],

    manager: [
      {
        name: "Dashboard",
        path: "/manager",
        icon: LayoutDashboard,
      },
      {
        name: "KPI Dashboard",
        path: "/manager/kpi",
        icon: BarChart3,
      },
      {
        name: "AI Assistant",
        path: "/manager/ai",
        icon: Bot,
      },
    ],
  };

  const roleNames = {
    admin: "Admin",
    technician: "Technician",
    manager: "Manager",
  };

  const items = navigation[role];

  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 text-white md:flex">
        <div className="border-b border-slate-700 p-6">
          <h1 className="text-xl font-bold">
            Sejuk Sejuk
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Operations System
          </p>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin" || item.path === "/technician" || item.path === "/manager"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`
                }
              >
                <Icon size={20} />

                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <button
            onClick={() => navigate("/")}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft size={18} />
            Switch Portal
          </button>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="flex h-16 items-center justify-between border-b bg-white px-6">
          <div>
            <p className="text-sm text-slate-500">
              Logged in as
            </p>

            <h2 className="font-semibold text-slate-900">
              {roleNames[role]}
            </h2>
          </div>

          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            Mock User
          </div>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;