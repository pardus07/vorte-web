import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yapım Aşamasında",
  description:
    "Vorte Dijital Teknoloji A.Ş. — dijital teknoloji çözümleri geliştiren şirketimizin yeni kurumsal sitesi çok yakında burada.",
  alternates: { canonical: "/" },
};

// Deterministik parçacık konumları: runtime'da Math.random KULLANMIYORUZ
// (SSR/prerender kararlılığı + hydration uyumu için sabit liste)
const PARTICLES = [
  { left: "6%", top: "18%", size: 2, dur: 22, delay: 0 },
  { left: "14%", top: "62%", size: 3, dur: 26, delay: 3 },
  { left: "22%", top: "34%", size: 2, dur: 19, delay: 1 },
  { left: "31%", top: "78%", size: 2, dur: 24, delay: 5 },
  { left: "39%", top: "12%", size: 3, dur: 28, delay: 2 },
  { left: "47%", top: "52%", size: 2, dur: 21, delay: 4 },
  { left: "55%", top: "26%", size: 2, dur: 25, delay: 0 },
  { left: "63%", top: "70%", size: 3, dur: 30, delay: 6 },
  { left: "71%", top: "16%", size: 2, dur: 20, delay: 2 },
  { left: "78%", top: "58%", size: 2, dur: 27, delay: 3 },
  { left: "85%", top: "38%", size: 3, dur: 23, delay: 1 },
  { left: "92%", top: "74%", size: 2, dur: 29, delay: 5 },
  { left: "12%", top: "88%", size: 2, dur: 24, delay: 4 },
  { left: "44%", top: "84%", size: 2, dur: 26, delay: 2 },
  { left: "68%", top: "44%", size: 2, dur: 22, delay: 0 },
  { left: "88%", top: "10%", size: 2, dur: 28, delay: 3 },
] as const;

export default function ComingSoonPage() {
  return (
    <main className="cs-root" aria-label="Vorte Dijital Teknoloji A.Ş. yapım aşamasında">
      {/* Tüm animasyonlar saf CSS — framer-motion yok, JS bütçesi korunur */}
      <style>{`
        .cs-root {
          position: relative;
          min-height: 100svh;
          width: 100%;
          overflow: hidden;
          background:
            radial-gradient(120% 80% at 50% -10%, #11151f 0%, #0a0c12 45%, #05060a 100%);
          color: #f4f6fb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.25rem 6rem;
          font-family: var(--font-sans, system-ui, sans-serif);
        }
        .cs-aurora, .cs-grid, .cs-particles { position: absolute; inset: 0; pointer-events: none; }
        .cs-blob { position: absolute; border-radius: 9999px; filter: blur(90px); opacity: 0.45; }
        .cs-blob-1 {
          top: -22%; left: 14%; width: 640px; height: 640px;
          background: radial-gradient(circle, rgba(122,193,67,0.40), transparent 70%);
          animation: cs-aurora1 22s ease-in-out infinite;
        }
        .cs-blob-2 {
          bottom: -28%; right: 12%; width: 560px; height: 560px;
          background: radial-gradient(circle, rgba(56,189,168,0.34), transparent 70%);
          animation: cs-aurora2 27s ease-in-out infinite;
        }
        .cs-grid {
          opacity: 0.05;
          background-image:
            linear-gradient(rgba(244,246,251,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(244,246,251,0.6) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 40%, #000 30%, transparent 75%);
        }
        .cs-dot {
          position: absolute; border-radius: 9999px;
          background: rgba(122,193,67,0.55);
          animation: cs-float linear infinite;
        }
        .cs-content { position: relative; z-index: 10; width: 100%; max-width: 56rem; text-align: center; }
        .cs-rise { opacity: 0; animation: cs-rise 0.9s cubic-bezier(0.22,1,0.36,1) forwards; }
        .cs-wordmark-wrap { position: relative; display: inline-block; }
        .cs-wordmark {
          margin: 0;
          font-size: clamp(3.5rem, 12vw, 7.5rem);
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 1;
          background: linear-gradient(120deg, #ffffff 0%, #d8efc4 40%, #7AC143 70%, #38bda8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .cs-sheen {
          position: absolute; inset: 0;
          background: linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%);
          mix-blend-mode: overlay;
          transform: translateX(-200%);
          animation: cs-sheen 5s ease-in-out 1.2s infinite;
        }
        .cs-legal { margin: 1rem 0 0; font-size: clamp(0.85rem, 2.4vw, 1.05rem); font-weight: 500; letter-spacing: 0.18em; text-transform: uppercase; color: #9aa3b2; }
        .cs-status { margin: 2.4rem 0 0; font-size: clamp(1.4rem, 5vw, 2.4rem); font-weight: 700; color: #f4f6fb; }
        .cs-soon { margin: 0.4rem 0 0; font-size: clamp(1rem, 3.5vw, 1.4rem); font-weight: 600; color: #7AC143; letter-spacing: 0.02em; }
        .cs-desc { margin: 1.4rem auto 0; max-width: 34rem; font-size: clamp(0.95rem, 2.6vw, 1.1rem); line-height: 1.7; color: #aab2c0; }
        .cs-bar-wrap { margin: 2.6rem auto 0; width: 100%; max-width: 22rem; height: 4px; border-radius: 9999px; background: rgba(244,246,251,0.08); overflow: hidden; }
        .cs-bar {
          height: 100%; width: 42%; border-radius: 9999px;
          background: linear-gradient(90deg, transparent, #7AC143, #38bda8, transparent);
          animation: cs-bar 2.2s ease-in-out infinite;
        }
        .cs-footer {
          position: relative; z-index: 10; margin-top: 3rem;
          display: flex; flex-wrap: wrap; align-items: center; justify-content: center;
          gap: 0.5rem 1.25rem; font-size: 0.9rem; color: #8b93a3;
        }
        .cs-footer a { color: inherit; text-decoration: none; transition: color 0.2s; }
        .cs-footer a:hover, .cs-footer a:focus-visible { color: #7AC143; outline: none; }
        .cs-sep { opacity: 0.4; }

        .cs-d1 { animation-delay: 0.05s; }
        .cs-d2 { animation-delay: 0.25s; }
        .cs-d3 { animation-delay: 0.45s; }
        .cs-d4 { animation-delay: 0.65s; }
        .cs-d5 { animation-delay: 0.85s; }
        .cs-d6 { animation-delay: 1.05s; }

        @keyframes cs-rise { from { opacity: 0; transform: translateY(26px); } to { opacity: 1; transform: none; } }
        @keyframes cs-aurora1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(80px,40px) scale(1.12); } }
        @keyframes cs-aurora2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-70px,-50px) scale(1.18); } }
        @keyframes cs-float { 0% { transform: translateY(0); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateY(-120px); opacity: 0; } }
        @keyframes cs-sheen { 0% { transform: translateX(-200%); } 55%,100% { transform: translateX(220%); } }
        @keyframes cs-bar { 0% { transform: translateX(-160%); } 100% { transform: translateX(320%); } }

        @media (prefers-reduced-motion: reduce) {
          .cs-rise { opacity: 1; animation: none; }
          .cs-blob-1, .cs-blob-2, .cs-dot, .cs-sheen, .cs-bar { animation: none; }
          .cs-sheen { display: none; }
          .cs-bar { width: 100%; }
        }
      `}</style>

      <div className="cs-aurora" aria-hidden="true">
        <span className="cs-blob cs-blob-1" />
        <span className="cs-blob cs-blob-2" />
      </div>
      <div className="cs-grid" aria-hidden="true" />
      <div className="cs-particles" aria-hidden="true">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="cs-dot"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="cs-content">
        <div className="cs-wordmark-wrap cs-rise cs-d1">
          <h1 className="cs-wordmark">Vorte</h1>
          <span className="cs-sheen" aria-hidden="true" />
        </div>
        <p className="cs-legal cs-rise cs-d2">Vorte Dijital Teknoloji A.Ş.</p>

        <h2 className="cs-status cs-rise cs-d3">Yapım Aşamasında</h2>
        <p className="cs-soon cs-rise cs-d4">Çok Yakında</p>

        <p className="cs-desc cs-rise cs-d5">
          Dijital teknoloji çözümleri geliştiren şirketimizin yeni kurumsal
          sitesi üzerinde çalışıyoruz. Projelerimiz, ekibimiz ve yol haritamız
          çok yakında burada.
        </p>

        <div className="cs-bar-wrap cs-rise cs-d6" role="presentation">
          <div className="cs-bar" />
        </div>
      </div>

      <footer className="cs-footer cs-rise cs-d6">
        <a href="mailto:info@vorte.com.tr">info@vorte.com.tr</a>
        <span className="cs-sep" aria-hidden="true">•</span>
        <span>İzmir, Türkiye</span>
        <span className="cs-sep" aria-hidden="true">•</span>
        <span>© 2026 Vorte Dijital Teknoloji A.Ş.</span>
      </footer>
    </main>
  );
}
