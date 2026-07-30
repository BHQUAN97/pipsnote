export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md p-8 border rounded-lg">
        <h1 className="text-2xl font-bold mb-6">Admin Login</h1>
        <form className="space-y-4">
          <div>
            <label className="block text-sm mb-2">Username</label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-brand text-white rounded hover:bg-brand-dark"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-sm text-neutral">
          ⚠️ Protected by rate-limit: max 10 attempts/10min
        </p>
      </div>
    </div>
  );
}
