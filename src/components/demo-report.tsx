import { ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const sampleFindings = [
  {
    title: "Product image alt text",
    status: "Failed",
    tone: "danger" as const,
    evidence: "2 of 7 server-rendered images have no alt attribute.",
    fix: "Describe meaningful product images; use empty alt text only for decoration.",
  },
  {
    title: "Product structured data",
    status: "Warning",
    tone: "warning" as const,
    evidence: "No Product JSON-LD was found in the initial HTML.",
    fix: "Verify the rendered page first, then add valid Product markup if it is missing.",
  },
  {
    title: "Mobile layout and tap targets",
    status: "Unverified",
    tone: "neutral" as const,
    evidence: "Static HTML cannot measure visual spacing or touch-target size.",
    fix: "Check the buy button, variant picker, and menu on a real phone.",
  },
];

export function DemoReport() {
  return (
    <section
      id="demo-report"
      className="border-y border-line bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-warning/20 bg-warning-soft px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-warning">
              Demo Report
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              See the shape of a report before you scan.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted">
              Findings are grouped by status, with the actual signal used and a
              practical next step. This sample uses illustrative data only.
            </p>
          </div>
          <ButtonLink href="/audit" variant="secondary">
            Run a real audit
            <Icon name="arrow-right" size={17} />
          </ButtonLink>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-canvas shadow-sm">
          <div className="flex flex-col gap-3 border-b border-line bg-warning-soft px-5 py-3 text-sm text-warning sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 font-semibold">
              <Icon name="info" size={17} />
              Illustrative data only. This is not a scan of a real store.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.12em]">
              demo-store.example
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1.8fr]">
            <div className="border-b border-line p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    Example verdict
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-ink">
                    Worth reviewing
                  </p>
                </div>
                <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
                  <Icon name="alert" size={23} />
                </span>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                {[
                  ["5", "Passed"],
                  ["1", "Warning"],
                  ["1", "Failed"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-line bg-white px-2 py-3"
                  >
                    <p className="text-xl font-bold text-ink">{value}</p>
                    <p className="mt-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-muted">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-line bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Passed in this example
                </p>
                <ul className="mt-3 space-y-2 text-sm text-ink-soft">
                  {[
                    "Page title present",
                    "One H1 heading",
                    "Responsive viewport declared",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Icon
                        name="check"
                        size={15}
                        className="shrink-0 text-accent"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mt-5 text-xs leading-5 text-muted">
                A real report includes the final URL, redirects, HTTP status,
                scan time, and full evidence for every check.
              </p>
            </div>

            <div className="p-5 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-ink">
                  Example findings
                </h3>
                <span className="text-xs text-muted">Static HTML scan</span>
              </div>

              <div className="mt-4 space-y-3">
                {sampleFindings.map((finding) => (
                  <article
                    key={finding.title}
                    className="rounded-xl border border-line bg-white p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-ink">
                        {finding.title}
                      </h4>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide ${
                          finding.tone === "danger"
                            ? "bg-danger-soft text-danger"
                            : finding.tone === "warning"
                              ? "bg-warning-soft text-warning"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {finding.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      <span className="font-semibold text-ink-soft">
                        Evidence:{" "}
                      </span>
                      {finding.evidence}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      <span className="font-semibold text-ink-soft">
                        Suggested fix:{" "}
                      </span>
                      {finding.fix}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
