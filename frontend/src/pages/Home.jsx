import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-100 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900">
          Sejuk Sejuk Operations System
        </h1>

        <p className="mt-3 text-slate-600">
          Select a portal to continue
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Link
          to="/admin"
          className="rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white hover:bg-blue-700"
        >
          Admin Portal
        </Link>

        <Link
          to="/technician"
          className="rounded-lg bg-green-600 px-6 py-3 text-center font-medium text-white hover:bg-green-700"
        >
          Technician Portal
        </Link>

        <Link
          to="/manager"
          className="rounded-lg bg-purple-600 px-6 py-3 text-center font-medium text-white hover:bg-purple-700"
        >
          Manager Portal
        </Link>
      </div>
    </div>
  );
}

export default Home;