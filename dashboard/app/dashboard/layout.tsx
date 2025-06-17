export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto">
        {children}
      </main>
    </div>
  )
}