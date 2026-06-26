"use client";

import { useLang } from "@/lib/LanguageContext";
import { content } from "@/lib/content";

// The 3D scroll experience renders its content into WebGL + scrubbed overlays,
// which crawlers and screen readers can't read. This mirrors the full portfolio
// as a plain semantic document, visually hidden (Tailwind `sr-only`) but present
// in the SSR HTML — so search engines index the bio/services/journey and
// assistive tech gets a linear, readable version of the whole page.
export default function SeoContent() {
  const { t } = useLang();
  const c = content;

  return (
    <main className="sr-only" aria-label="Zolboo — portfolio">
      <h1>
        {c.hero.name} — {t(c.hero.role)}
      </h1>
      <p>{t(c.hero.tagline)}</p>
      <p>{t(c.contact.location)}</p>

      <section aria-labelledby="seo-about">
        <h2 id="seo-about">{t(c.about.label)}</h2>
        <p>{t(c.about.body)}</p>
        <p>
          {t(c.about.eduLabel)}: {t(c.about.edu)}
        </p>
        <p>
          {t(c.about.nowLabel)}: {t(c.about.now)}
        </p>
      </section>

      <section aria-labelledby="seo-services">
        <h2 id="seo-services">{t(c.services.heading)}</h2>
        <ul>
          {c.services.items.map((s) => (
            <li key={s.id}>
              <h3>{t(s.title)}</h3>
              <p>{t(s.desc)}</p>
              <p>{s.tools}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="seo-work">
        <h2 id="seo-work">{t(c.projects.heading)}</h2>
        <ul>
          {c.projects.items.map((p) => (
            <li key={p.id}>
              <h3>{t(p.title)}</h3>
              <p>
                {t(p.category)} · {p.year}
              </p>
              <p>{t(p.desc)}</p>
              <p>{p.tags.join(", ")}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="seo-journey">
        <h2 id="seo-journey">{t(c.journey.heading)}</h2>
        <ol>
          {c.journey.items.map((it) => (
            <li key={it.year}>
              <h3>
                {it.year} — {t(it.title)}
              </h3>
              <p>{t(it.desc)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="seo-contact">
        <h2 id="seo-contact">{t(c.contact.heading)}</h2>
        <p>{t(c.contact.sub)}</p>
        <ul>
          <li>
            <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
          </li>
          <li>
            <a href={`tel:${c.contact.phoneRaw}`}>{c.contact.phone}</a>
          </li>
          <li>
            <a href={c.contact.social.facebook} rel="noreferrer">
              Facebook
            </a>
          </li>
          <li>
            <a href={c.contact.social.instagram} rel="noreferrer">
              Instagram
            </a>
          </li>
          <li>
            <a href={c.contact.social.github} rel="noreferrer">
              GitHub
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
