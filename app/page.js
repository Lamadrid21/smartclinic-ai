export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl text-center w-[500px]">
        <h1 className="text-5xl font-bold text-blue-600">
          SmartClinic AI
        </h1>

        <p className="mt-4 text-gray-500">
          Healthcare Management System
        </p>

        <div className="flex justify-center gap-4 mt-8">
          <a
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
          >
            Login
          </a>

          <a
            href="/register"
            className="border border-blue-600 text-blue-600 px-6 py-3 rounded-xl"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}