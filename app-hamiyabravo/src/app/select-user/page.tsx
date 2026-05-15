import { prisma } from "@/lib/db";
import { selectUserAction } from "./actions";

export default async function SelectUserPage() {
  const users = await prisma.user.findMany({
    include: { branch: true, company: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-900">
          İstifadəçi seçin
        </h1>
        <p className="text-center text-slate-600 mb-8">
          Demo üçün bir rol seçin
        </p>

        <div className="space-y-3">
          {users.map((user) => (
            <form key={user.id} action={selectUserAction}>
              <input type="hidden" name="userId" value={user.id} />
              <button
                type="submit"
                className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <div className="font-semibold text-slate-900">{user.name}</div>
                <div className="text-sm text-slate-600">
                  {user.role} •{" "}
                  {user.company?.legalName || user.branch?.name || "—"}
                </div>
              </button>
            </form>
          ))}
        </div>
      </div>
    </div>
  );
}
