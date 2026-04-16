/**
 * Env Viewer — reads NEXT_PUBLIC_ENV_DEBUG set by load-env.mjs when ENV_DEBUG=true.
 */
/* eslint-disable i18next/no-literal-string */
export default function EnvPage() {
  const raw = process.env.NEXT_PUBLIC_ENV_DEBUG;

  if (!raw) {
    return (
      <main className="p-8 font-mono text-sm">
        <h1 className="text-xl font-bold mb-2">Environment Variables</h1>
        <p className="text-red-500">
          ENV_DEBUG is not enabled. Set ENV_DEBUG=true in your env file.
        </p>
      </main>
    );
  }

  const vars = JSON.parse(raw) as Record<string, string>;
  const rows = Object.entries(vars).sort(([a], [b]) => a.localeCompare(b));

  return (
    <main className="p-8 font-mono text-sm">
      <h1 className="text-xl font-bold mb-1">Environment Variables</h1>
      <p className="text-muted-foreground mb-6 text-xs">
        TARGET_ENV=<strong>{vars.TARGET_ENV ?? "not set"}</strong> · NODE_ENV=
        <strong>{vars.NODE_ENV}</strong> · {rows.length} vars
      </p>
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-foreground/20">
            <th className="pb-2 pr-4 font-semibold">Key</th>
            <th className="pb-2 font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} className="border-b border-foreground/10">
              <td className="py-1 pr-4 text-blue-500 whitespace-nowrap">
                {key}
              </td>
              <td className="py-1 break-all max-w-xl">
                {value ? (
                  <span className="text-green-600">{value}</span>
                ) : (
                  <span className="text-red-500 italic">not set</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
