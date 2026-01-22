export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

