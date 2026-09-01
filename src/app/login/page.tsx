import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-primary/15 blur-[100px]" />
      <div className="relative w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <img src="/logo-s.png" alt="" className="mx-auto size-14" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sfera Chamados
          </h1>
          <p className="text-sm text-muted-foreground">Logística · Sfera Multifranquias</p>
        </div>
        <LoginForm callbackUrl={callbackUrl ?? "/tickets"} />
      </div>
    </div>
  );
}
