# Zolboo — Portfolio

Бараан + cyan neon өнгөтэй, нэг хуудас, **MN/EN хоёр хэлт** хувийн portfolio.
Dark + cyan neon, single-page, **bilingual (MN/EN)** personal portfolio.

## Stack

- **Next.js 15** (App Router) + **React 18**
- **TypeScript**
- **Tailwind CSS 3.4**
- **Framer Motion** (motion / animation)
- **lucide-react** (icons)
- Fonts: Syne (display) · Manrope (body) · JetBrains Mono (mono)

## Эхлүүлэх / Getting started

```bash
npm install
npm run dev
```

→ http://localhost:3000

Production build:

```bash
npm run build
npm run start
```

## Контент засах / Editing content

Бүх текст, төсөл, timeline нэг файлд төвлөрсөн:
All text, projects, and the timeline live in one file:

```
lib/content.ts
```

- `hero` — нэр, role, tagline
- `about` — танилцуулга, боловсрол, "одоо"
- `projects.items` — төслийн картууд (нэр, он, тайлбар, tags)
- `services.items` — үйлчилгээ
- `journey.items` — timeline (он бүрээр)
- `contact` — имэйл, утас, байршил

Текст бүр `{ mn: "...", en: "..." }` бүтэцтэй — хоёр хэлээ зэрэг засна.

## Өнгө солих / Changing colors

`tailwind.config.ts` доторх `accent: "#2DE6E6"` утгыг солиход neon өнгө бүхэлдээ өөрчлөгдөнө.

## Deploy

- **Vercel:** repo-г push хийгээд импортлоход л болно.
- **Hetzner VPS:** `npm run build` → `npm run start` (PM2 / Docker + Nginx ардаа).

---

© Zolboo
