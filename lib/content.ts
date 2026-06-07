export type Lang = "mn" | "en";

type Bi = { mn: string; en: string };

export const content = {
  nav: {
    work: { mn: "ажлууд", en: "work" },
    services: { mn: "үйлчилгээ", en: "services" },
    journey: { mn: "замнал", en: "journey" },
    contact: { mn: "холбоо", en: "say hi" },
  },

  hero: {
    status: { mn: "Шинэ төсөл хүлээж авч байна", en: "Available for new projects" },
    greeting: { mn: "Сайн уу, би", en: "Hi, I'm" },
    name: "Zolboo",
    role: { mn: "Веб хөгжүүлэгч & Автоматжуулалт", en: "Web Developer & Automation" },
    tagline: {
      mn: "Би вэбсайт, чатбот, автоматжуулалт бүтээдэг. Монголын бизнесүүдэд бодит үр дүн авчрах гэж хичээдэг.",
      en: "I build websites, chatbots, and automations — and I care about getting real results for Mongolian businesses.",
    },
    ctaWork: { mn: "Төслүүдийг үзэх", en: "View my work" },
    ctaContact: { mn: "Холбогдох", en: "Get in touch" },
    location: { mn: "Улаанбаатар, Монгол", en: "Ulaanbaatar, Mongolia" },
  },

  about: {
    label: { mn: "Танилцуулга", en: "About" },
    body: {
      mn: "Би 2019 оноос сошиал маркетингаар эхэлж, цаг хугацааны явцад вэб хөгжүүлэлт, автоматжуулалт руу шилжсэн. Одоо Монголын бизнесүүдэд зориулсан вэбсайт, чатбот, автоматжуулалтын систем бүтээдэг. Зэрэгцээд KnowHub нэртэй AI автоматжуулалтын чиглэлээ хөгжүүлж байна.",
      en: "I started in social media marketing back in 2019 and gradually moved into web development and automation. Today I build websites, chatbots, and automation systems for Mongolian businesses. Alongside that, I'm building KnowHub, my own AI automation venture.",
    },
    eduLabel: { mn: "Боловсрол", en: "Education" },
    edu: {
      mn: "Бакалавр, Мэдээлэл холбооны технологи — ШУТИС, 2024",
      en: "B.Sc. in Information & Communication Technology — MUST, 2024",
    },
    nowLabel: { mn: "Одоо", en: "Now" },
    now: { mn: "KnowHub — AI автоматжуулалт & SaaS бүтээж байна", en: "Building KnowHub — AI automation & SaaS" },
  },

  projects: {
    label: { mn: "Сонгомол төслүүд", en: "Selected Work" },
    heading: { mn: "Сүүлийн үед бүтээсэн зүйлс", en: "Things I've built lately" },
    sub: {
      mn: "Live demo нийтлэгдээгүй ч доорх төслүүд бодит захиалга, бодит бүтээгдэхүүн дээр суурилсан.",
      en: "No public demos yet, but each of these is based on real client work and real products.",
    },
    items: [
      {
        id: "dreamtrip",
        title: "DreamTrip.mn",
        year: "2025–2026",
        category: { mn: "Веб", en: "Web" },
        desc: {
          mn: "Монголчуудад зориулсан Японы VIP аялал зохион байгуулах үйлчилгээний лендинг.",
          en: "Landing experience for a VIP Japan travel service aimed at Mongolian travelers.",
        },
        tags: ["Web", "Landing", "Motion"],
      },
      {
        id: "khan",
        title: "Khan Consulting",
        year: "2025–2026",
        category: { mn: "Веб", en: "Web" },
        desc: {
          mn: "Хөрөнгө оруулалтын зөвлөх компанийн олон хэлт корпорэйт вэбсайт.",
          en: "Multilingual corporate website for an investment advisory firm.",
        },
        tags: ["Next.js", "TypeScript", "Tailwind", "Framer Motion", "Supabase"],
      },
      {
        id: "tender",
        title: "Tender Monitor",
        year: "2025",
        category: { mn: "Автоматжуулалт", en: "Automation" },
        desc: {
          mn: "Төрийн худалдан авалтын тендерийг хянаж, шинэ зарлал гарахад мэдэгдэл өгдөг автомат систем.",
          en: "Automated system that monitors government procurement tenders and sends alerts on new listings.",
        },
        tags: ["Automation", "Alerts"],
      },
      {
        id: "suvdandusal",
        title: "Suvdandusal Automation",
        year: "2025",
        category: { mn: "Автоматжуулалт", en: "Automation" },
        desc: {
          mn: "Facebook/Instagram дээрх захиалгыг бүрэн автоматжуулсан чатбот систем — карусель цэс, захиалга бүртгэл, нэгдсэн өгөгдлийн сан.",
          en: "Fully automated order-taking chatbot for Facebook/Instagram — carousel menu, order capture, and a unified database.",
        },
        tags: ["ManyChat", "Make.com", "Airtable"],
      },
      {
        id: "legal",
        title: { mn: "Онлайн хуулийн платформ", en: "Online Legal Platform" },
        year: "2022",
        category: { mn: "Веб", en: "Web" },
        desc: {
          mn: "Хуульч, өмгөөлөгчтэй зөвлөгөө захиалах онлайн платформ — миний анхны веб төсөл.",
          en: "Online platform to book lawyers and legal consultations — my first web project.",
        },
        tags: ["Web", "First project"],
      },
      {
        id: "smm",
        title: { mn: "Digital Marketing & SMM", en: "Digital Marketing & SMM" },
        year: "2019–2026",
        category: { mn: "Маркетинг", en: "Marketing" },
        desc: {
          mn: "Гоо сайхны салбарын 4 эмнэлгийн сошиал маркетинг, контент, постер дизайн, зар сурталчилгааны менежмент.",
          en: "Social media marketing, content, poster design, and ad management for 4 beauty clinics.",
        },
        tags: ["Meta Ads", "Canva", "ManyChat"],
        clients: "Royal De Beauty · Renew · Friends · Nature Skin",
      },
    ],
  },

  services: {
    label: { mn: "Юу хийдэг вэ", en: "What I do" },
    heading: { mn: "Чамд юугаар тусалж чадах вэ", en: "How I can help you" },
    items: [
      {
        id: "web",
        title: { mn: "Веб хөгжүүлэлт", en: "Web Development" },
        desc: {
          mn: "Орчин үеийн, хурдан, motion-той вэбсайт & лендинг.",
          en: "Modern, fast, motion-rich websites & landing pages.",
        },
        tools: "Next.js · React · TypeScript · Tailwind",
      },
      {
        id: "automation",
        title: { mn: "AI & Автоматжуулалт", en: "AI & Automation" },
        desc: {
          mn: "Чатбот, захиалгын урсгал, давтагдах ажлын автоматжуулалт.",
          en: "Chatbots, order flows, and automation for repetitive work.",
        },
        tools: "n8n · Make.com · ManyChat · Claude API",
      },
      {
        id: "saas",
        title: { mn: "SaaS хөгжүүлэлт", en: "SaaS Development" },
        desc: {
          mn: "Authentication, dashboard, өгөгдлийн сантай бүрэн бүтээгдэхүүн.",
          en: "Full products with authentication, dashboards, and databases.",
        },
        tools: "Supabase · PostgreSQL · Next.js",
      },
      {
        id: "design",
        title: { mn: "UI/UX & Motion", en: "UI/UX & Motion" },
        desc: {
          mn: "Цэвэрхэн интерфейс, нарийн motion дизайн, micro-interaction.",
          en: "Clean interfaces, refined motion design, and micro-interactions.",
        },
        tools: "Framer Motion · Figma · GSAP",
      },
    ],
  },

  journey: {
    label: { mn: "Замнал", en: "The Journey" },
    heading: { mn: "Маркетингаас хөгжүүлэлт хүртэл", en: "From marketing to engineering" },
    sub: {
      mn: "2019 оноос өнөөг хүртэлх замнал.",
      en: "A path from 2019 to today.",
    },
    items: [
      {
        year: "2019",
        title: { mn: "SMM-ийн эхлэл", en: "Started in SMM" },
        desc: { mn: "Royal De Beauty — сошиал маркетинг хариуцаж эхэлсэн.", en: "Royal De Beauty — began managing social media." },
      },
      {
        year: "2020",
        title: { mn: "Үргэлжлэл", en: "Growing" },
        desc: { mn: "Renew Beauty Clinic — контент, зар сурталчилгаа.", en: "Renew Beauty Clinic — content and ad campaigns." },
      },
      {
        year: "2021–2023",
        title: { mn: "Тогтвортой захиалагч", en: "Long-term client" },
        desc: { mn: "Friends Beauty Clinic — урт хугацааны SMM хамтын ажиллагаа.", en: "Friends Beauty Clinic — a long-term SMM partnership." },
      },
      {
        year: "2022",
        title: { mn: "Анхны веб төсөл", en: "First web project" },
        desc: { mn: "Хуульч захиалах онлайн платформ — код руу анхны алхам.", en: "Online lawyer-booking platform — my first step into code." },
        highlight: true,
      },
      {
        year: "2024",
        title: { mn: "Бакалавр төгссөн", en: "Graduated" },
        desc: { mn: "ШУТИС — Мэдээлэл холбооны технологи.", en: "MUST — Information & Communication Technology." },
        highlight: true,
      },
      {
        year: "2024–2026",
        title: { mn: "Үргэлжилж буй хамтын ажиллагаа", en: "Ongoing partnership" },
        desc: { mn: "Nature Skin Clinic — SMM, одоо ч үргэлжилж байна.", en: "Nature Skin Clinic — SMM, still ongoing." },
      },
      {
        year: "2025",
        title: { mn: "Автоматжуулалт + KnowHub", en: "Automation + KnowHub" },
        desc: { mn: "Suvdandusal автоматжуулалт хийж, KnowHub чиглэлээ эхлүүлсэн.", en: "Built the Suvdandusal automation and started KnowHub." },
        highlight: true,
      },
      {
        year: "2025–2026",
        title: { mn: "Full-stack эра", en: "Full-stack era" },
        desc: { mn: "DreamTrip, Khan Consulting, Tender Monitor — вэб + автоматжуулалт.", en: "DreamTrip, Khan Consulting, Tender Monitor — web + automation." },
        highlight: true,
      },
    ],
  },

  contact: {
    label: { mn: "Холбоо барих", en: "Contact" },
    heading: { mn: "Хамтдаа ажиллах уу?", en: "Let's build something" },
    sub: {
      mn: "Төсөл, хамтын ажиллагааны санал байвал бичээрэй.",
      en: "Got a project or an idea? Drop me a line.",
    },
    emailLabel: { mn: "Имэйл", en: "Email" },
    phoneLabel: { mn: "Утас", en: "Phone" },
    locationLabel: { mn: "Байршил", en: "Location" },
    email: "zolbooq@gmail.com",
    phone: "8869 0420",
    phoneRaw: "+97688690420",
    location: { mn: "Улаанбаатар, Монгол", en: "Ulaanbaatar, Mongolia" },
  },

  footer: {
    rights: { mn: "Бүх эрх хуулиар хамгаалагдсан.", en: "All rights reserved." },
    built: { mn: "Next.js & Framer Motion-оор бүтээв.", en: "Built with Next.js & Framer Motion." },
  },
} as const;

export type Content = typeof content;
export type { Bi };
