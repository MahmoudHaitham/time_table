import MagicBackground from "@/components/MagicBackground";
import FloatingShapes from "@/components/FloatingShapes";

export default function TimetableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen relative">
      <MagicBackground />
      <FloatingShapes />
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}

