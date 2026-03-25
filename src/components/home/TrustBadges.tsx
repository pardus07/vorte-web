export function TrustBadges() {
  const badges = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-3.225a2.09 2.09 0 01-.66-1.393l-.33-2.968a1.125 1.125 0 00-1.12-1.014H7.37a1.125 1.125 0 00-1.12 1.014l-.33 2.968A2.09 2.09 0 015.26 14.25H2.25m19.5 0v-7.5A1.125 1.125 0 0020.625 5.625H3.375A1.125 1.125 0 002.25 6.75v7.5" />
        </svg>
      ),
      title: "Ücretsiz Kargo",
      description: "500₺ üzeri siparişlerde",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      title: "14 Gün İade",
      description: "Koşulsuz iade garantisi",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: "3D Güvenli Ödeme",
      description: "iyzico ile korumalı",
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
      title: "%95 Pamuk",
      description: "Taranmış penye kalite",
    },
  ];

  return (
    <section className="border-t border-gray-100 bg-[#FAFAFA] py-16 md:py-20">
      <div className="mx-auto max-w-[1200px] px-4 lg:px-8">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {badges.map((badge, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#1A1A1A] shadow-sm">
                {badge.icon}
              </div>
              <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-[#1A1A1A]">
                {badge.title}
              </h3>
              <p className="mt-1 text-[11px] text-gray-400">
                {badge.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
