export function ExamResultsSummary({ totalCount }: { totalCount: number }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-primary px-5 py-5 text-primary-foreground shadow-sm sm:px-8 sm:py-7">
      {/*
        Desktop: template-style network illustration.
        Mobile: intentionally simplified so the artwork stays calm and readable
        instead of stacking nodes/lines on top of each other at narrow widths.
      */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1200 150"
        fill="none"
      >
        <defs>
          <linearGradient id="exam-summary-base" x1="0" y1="0" x2="1200" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#6b102d" stopOpacity="0.18" />
            <stop offset="0.48" stopColor="#9b2848" stopOpacity="0.10" />
            <stop offset="1" stopColor="#4e081f" stopOpacity="0.22" />
          </linearGradient>

          <linearGradient id="exam-summary-wave" x1="180" y1="0" x2="620" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.5" stopColor="white" stopOpacity="0.075" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>

          <pattern id="exam-summary-network" width="390" height="150" patternUnits="userSpaceOnUse">
            <g stroke="white" strokeOpacity="0.22" strokeWidth="1.35">
              <path d="M18 60 L105 24 L190 88 L310 38" />
              <path d="M190 88 L158 148" />
              <path d="M310 38 L278 148" />
            </g>
            <g fill="white" fillOpacity="0.035" stroke="white" strokeOpacity="0.32" strokeWidth="1.4">
              <circle cx="18" cy="60" r="3.7" />
              <circle cx="105" cy="24" r="3.7" />
              <circle cx="190" cy="88" r="3.7" />
              <circle cx="310" cy="38" r="3.7" />
            </g>
          </pattern>
        </defs>

        <rect width="1200" height="150" fill="url(#exam-summary-base)" />

        {/* Desktop tonal waves + network. */}
        <g className="hidden sm:block">
          <path
            d="M560 -35 C475 28 470 93 382 185"
            stroke="url(#exam-summary-wave)"
            strokeWidth="72"
          />
          <path
            d="M590 -35 C505 28 500 93 412 185"
            stroke="white"
            strokeOpacity="0.028"
            strokeWidth="2"
          />
          <path
            d="M1080 -40 C1000 20 990 88 900 190"
            stroke="white"
            strokeOpacity="0.025"
            strokeWidth="46"
          />
          <rect width="1200" height="150" fill="url(#exam-summary-network)" />
        </g>

        {/* Mobile: broad, soft waves only — no nodes or crossing network lines. */}
        <g className="sm:hidden">
          <path
            d="M-90 170 C120 125 145 20 350 -20"
            stroke="white"
            strokeOpacity="0.045"
            strokeWidth="70"
          />
          <path
            d="M390 180 C575 125 605 20 820 -25"
            stroke="white"
            strokeOpacity="0.035"
            strokeWidth="58"
          />
          <path
            d="M850 180 C1010 130 1050 40 1240 -10"
            stroke="white"
            strokeOpacity="0.028"
            strokeWidth="52"
          />
          <path
            d="M-20 28 C180 -18 300 48 470 8"
            stroke="white"
            strokeOpacity="0.025"
            strokeWidth="1.5"
          />
        </g>
      </svg>

      <div className="relative z-10 flex items-center justify-between gap-4 sm:gap-6">
        <div className="min-w-0">
          <p className="font-display text-[18px] font-semibold leading-tight tracking-[-0.02em] opacity-[0.96] sm:text-[20px]">
            Ümumi nəticə
          </p>
          <p className="mt-1 max-w-[24rem] text-sm font-normal leading-relaxed text-primary-foreground/75">
            Semestr, test və bilet imtahanlarınızın ümumi nəticələri
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display text-[38px] font-semibold leading-none tracking-[-0.03em] sm:text-[42px]">
            {totalCount}
          </p>
          <p className="mt-1 text-[13px] font-normal leading-none text-primary-foreground/75">
            İmtahan
          </p>
        </div>
      </div>
    </section>
  );
}
