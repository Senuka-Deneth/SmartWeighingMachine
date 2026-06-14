import Link from "next/link";
import { createClient } from "@/utils/supabase/server";

const features = [
  {
    title: "Real-time stock tracking",
    description:
      "Monitor remaining product levels across all compartment slots as customers dispense via keypad. Updates appear instantly on your dashboard.",
    accent: "border-l-palette-primary",
  },
  {
    title: "Low-stock alerts",
    description:
      "Set per-product thresholds and receive push notifications when stock runs low, so your team can refill before shelves go empty.",
    accent: "border-l-palette-warning",
  },
  {
    title: "Hardware integration",
    description:
      "ESP32 microcontrollers send dispense events over a simple HTTP API. No browser login required on the device — just a secure API key per slot.",
    accent: "border-l-palette-accent",
  },
  {
    title: "Full audit history",
    description:
      "Every dispense and refill is logged with timestamps and stock changes, giving you a clear record for maintenance and inventory review.",
    accent: "border-l-palette-success",
  },
];

const steps = [
  {
    step: "01",
    title: "Customer dispenses",
    description:
      "A shopper selects a quantity on the keypad and the ESP32 sends the amount to the server.",
    color: "bg-palette-primary-light text-palette-primary border-palette-primary",
  },
  {
    step: "02",
    title: "Stock updates live",
    description:
      "The system decrements stock, logs the event, and pushes the new level to your dashboard in real time.",
    color: "bg-palette-success-light text-palette-success border-palette-success",
  },
  {
    step: "03",
    title: "Staff stays informed",
    description:
      "When stock crosses the threshold, admins get notified and can refill directly from the dashboard.",
    color: "bg-palette-warning-light text-palette-warning border-palette-warning",
  },
];

export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="page-shell">
      <header className="border-b border-border bg-surface backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            Smart Stock Monitor
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href="/dashboard" className="btn-primary">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-ghost hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-widest text-palette-primary">
              Smart weighing machine
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Know your stock before it runs out
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted">
              A maintenance dashboard for supermarket dispensing machines. Track
              product levels in real time, alert staff when stock is low, and
              keep a complete history of every dispense and refill.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {user ? (
                <Link href="/dashboard" className="btn-primary">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link href="/signup" className="btn-primary">
                    Get started
                  </Link>
                  <Link href="/login" className="btn-secondary">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Built for in-store dispensing
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted">
              Smart Stock Monitor connects physical weighing and dispensing
              hardware to a simple web dashboard. Each machine supports up to
              four compartment slots — products like rice, sugar, or grains —
              with dedicated keypads and ESP32 controllers. Store staff sign in to
              view live stock levels, adjust low-stock thresholds, record
              refills, and review dispense history from any browser.
            </p>
            <dl className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="stat-card-primary p-5">
                <dt className="text-sm font-medium text-palette-primary">Machine slots</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">4</dd>
              </div>
              <div className="stat-card-success p-5">
                <dt className="text-sm font-medium text-palette-success">Updates</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">Real-time</dd>
              </div>
              <div className="stat-card-warning p-5">
                <dt className="text-sm font-medium text-palette-warning">Alerts</dt>
                <dd className="mt-1 text-2xl font-semibold text-foreground">Push</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              Everything you need to maintain stock
            </h2>
            <p className="mt-3 max-w-2xl text-muted">
              Designed for supermarket operators who need reliable visibility
              without complexity.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {features.map((feature) => (
                <li
                  key={feature.title}
                  className={`feature-card ${feature.accent}`}
                >
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              How it works
            </h2>
            <ol className="mt-10 space-y-8">
              {steps.map((item) => (
                <li key={item.step} className="flex gap-6">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-medium ${item.color}`}
                  >
                    {item.step}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="card border-palette-primary bg-palette-primary-light px-6 py-10 text-center sm:px-12">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Ready to monitor your machine?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-muted">
                Create an account to access the dashboard, enable low-stock
                alerts, and manage refills for your dispensing compartments.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {user ? (
                  <Link href="/dashboard" className="btn-primary">
                    Open dashboard
                  </Link>
                ) : (
                  <>
                    <Link href="/signup" className="btn-primary">
                      Create account
                    </Link>
                    <Link href="/login" className="btn-secondary">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <p className="text-center text-sm text-muted">
            Smart Stock Monitor — maintenance dashboard for smart weighing machines
          </p>
        </div>
      </footer>
    </div>
  );
}
