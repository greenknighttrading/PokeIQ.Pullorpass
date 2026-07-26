import { NavLink, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { WEDDING_DATE } from "@/lib/wedding/data";

function useCountdown() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, WEDDING_DATE.getTime() - now.getTime());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  return { days, hours };
}

export default function WeddingLayout() {
  const { days, hours } = useCountdown();
  return (
    <div className="wedding-root min-h-screen">
      <header className="border-b border-[hsl(35_25%_82%)] bg-[hsl(40_35%_96%)]">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center">
          <p className="wedding-serif text-xs tracking-[0.3em] uppercase text-[hsl(150_25%_28%)]">
            Bryant &amp; Eunice
          </p>
          <h1 className="wedding-serif text-4xl md:text-5xl mt-2 text-[hsl(150_30%_18%)]">
            Saturday, November 21, 2026
          </h1>
          <p className="mt-3 text-sm text-[hsl(30_15%_35%)]">
            <span className="font-semibold text-[hsl(35_60%_40%)]">{days}</span> days
            {days > 0 && (
              <>
                {" "}
                &amp; <span className="font-semibold text-[hsl(35_60%_40%)]">{hours}</span> hours
              </>
            )}{" "}
            to go
          </p>
          <nav className="mt-6 inline-flex gap-1 rounded-full border border-[hsl(35_25%_82%)] bg-white p-1">
            {[
              { to: "/wedding", label: "Tasks", end: true },
              { to: "/wedding/budget", label: "Budget", end: false },
            ].map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-5 py-2 rounded-full text-sm wedding-serif tracking-wide transition ${
                    isActive
                      ? "bg-[hsl(150_30%_20%)] text-[hsl(40_35%_96%)]"
                      : "text-[hsl(150_25%_25%)] hover:bg-[hsl(40_25%_92%)]"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <Outlet />
      </main>
      <style>{`
        .wedding-root {
          background: hsl(40 40% 97%);
          color: hsl(30 15% 20%);
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .wedding-serif {
          font-family: 'Playfair Display', 'Source Serif 4', Georgia, serif;
        }
      `}</style>
    </div>
  );
}