export default function NotConfigured() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="max-w-md">
        <h1 className="font-serif text-3xl mb-3">Workspace isn’t connected yet</h1>
        <p className="text-body">
          Set <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>,
          then apply <code>supabase/migrations/</code> to the project with <code>supabase db push</code>.
        </p>
      </div>
    </div>
  );
}
