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
    status: { mn: "Төслийн захиалга болон хамтран ажиллахад үргэлж нээлттэй", en: "Always open to projects & collaboration" },
    greeting: { mn: "Сайн байна уу, би", en: "Hello, I'm" },
    welcome: { mn: "Профайлд тавтай морил", en: "Welcome to my profile" },
    scrollHint: { mn: "Танилцуулгыг доош гүйлгэн үзнэ үү", en: "Scroll down to see my intro" },
    name: "Zolboo",
    role: { mn: "Full-Stack хөгжүүлэгч · Автоматжуулалт", en: "Full-Stack Developer · Automation" },
    tagline: {
      mn: "Вэбсайт, чатбот, автоматжуулалтын систем бүтээдэг. Монголын бизнест хэмжигдэхүйц, бодит үр дүн авчрахыг эрхэмлэдэг.",
      en: "I build websites, chatbots, and automation systems — focused on delivering measurable, real-world results for Mongolian businesses.",
    },
    ctaWork: { mn: "Ажлуудыг үзэх", en: "View my work" },
    ctaContact: { mn: "Холбоо барих", en: "Get in touch" },
    hint: { mn: "↔ неоныг чирээд эргүүлээрэй", en: "↔ drag the neon to spin it" },
    location: { mn: "Улаанбаатар, Монгол", en: "Ulaanbaatar, Mongolia" },
    skillsNote: {
      mn: "AI — видео үүсгэхээс бусад бүх чиглэлд",
      en: "AI — every domain except video generation",
    },
    startCta: { mn: "Доош гүйлгэн эхлүүлээрэй", en: "Scroll to begin" },
  },

  memories: {
    title: { mn: "Дурсамжийн өрөө", en: "Room of Memories" },
    line: {
      mn: "Энд зочилсон хүн бүрийн үлдээсэн ул мөр мөнхөд гэрэлтэн үлдэнэ.",
      en: "Every visitor leaves a trace here — left to glow for good.",
    },
    cta: { mn: "Дурсамж үлдээх", en: "Add a memory" },
    formTitle: { mn: "Дурсамж үлдээх", en: "Add a memory" },
    formEyebrow: { mn: "Дурсамжийн өрөө", en: "Room of Memories" },
    formIntro: {
      mn: "Энэхүү вебээр зочлон надтай танилцсанд баярлалаа. Хамтарч ажиллах санал болон үлдээх сэтгэгдэл байвал дурсамжийн хайрцагт зурвас үлдээгээд хадгалаарай. Баярлалаа.",
      en: "Thank you for visiting and getting to know me. If you'd like to work together or share a thought, drop a message in the memory box and save it. Thank you.",
    },
    nickname: { mn: "Нэр", en: "Name" },
    nicknamePh: { mn: "таны нэр", en: "your name" },
    phone: { mn: "Утас", en: "Phone" },
    phonePh: { mn: "99xxxxxx", en: "99xxxxxx" },
    phoneNote: { mn: "Заавал биш · нийтэд харагдахгүй", en: "Optional · never shown" },
    comment: { mn: "Сэтгэгдэл", en: "Message" },
    commentPh: { mn: "үлдээх үгээ бичнэ үү…", en: "write your message…" },
    submit: { mn: "Илгээх", en: "Send" },
    submitting: { mn: "Хадгалж байна…", en: "Saving…" },
    success: { mn: "Таны зурвас амжилттай хадгалагдлаа ✦", en: "Your message has been saved ✦" },
    error: { mn: "Алдаа гарлаа. Дахин оролдоно уу.", en: "Something went wrong. Try again." },
    close: { mn: "Хаах", en: "Close" },
  },

  about: {
    label: { mn: "Танилцуулга", en: "About" },
    body: {
      mn: "2019 онд дижитал маркетингаар эхэлж, цаг хугацааны эрхээр вэб хөгжүүлэлт, автоматжуулалт руу гүнзгийрсэн. Өнөөдөр Монголын бизнест зориулсан вэбсайт, чатбот, автоматжуулалтын систем бүтээдэг. Үүний зэрэгцээ AI автоматжуулалтын өөрийн бүтээгдэхүүн болох KnowHub-ийг хөгжүүлж байна.",
      en: "I started in digital marketing in 2019 and gradually moved deeper into web development and automation. Today I build websites, chatbots, and automation systems for Mongolian businesses. Alongside that, I'm building KnowHub, my own AI automation product.",
    },
    eduLabel: { mn: "Боловсрол", en: "Education" },
    edu: {
      mn: "Бакалавр — Мэдээлэл холбооны технологи, ШУТИС (2024)",
      en: "B.Sc. in Information & Communication Technology — MUST, 2024",
    },
    nowLabel: { mn: "Одоо", en: "Now" },
    now: { mn: "KnowHub — AI автоматжуулалт ба SaaS бүтээж байна", en: "Building KnowHub — AI automation & SaaS" },
  },

  statement: {
    label: { mn: "Миний тухай нэг өгүүлбэр", en: "In one line" },
    lead: { mn: "Сонирхлоо", en: "I turned" },
    words: {
      mn: ["ажил", "болгож,", "ажлаа", "адал", "явдал", "болгосон."],
      en: ["curiosity", "into", "a", "craft —", "and", "an", "adventure."],
    },
  },

  projects: {
    label: { mn: "Сонгомол ажлууд", en: "Selected Work" },
    heading: { mn: "Сүүлд бүтээсэн төслүүд", en: "Recent work" },
    sub: {
      mn: "Олон нийтэд нээлттэй demo одоогоор байхгүй ч доорх төсөл бүр бодит захиалга, бодит бүтээгдэхүүн дээр суурилсан.",
      en: "No public demos yet — but each of these is built on real client work and real products.",
    },
    items: [
      {
        id: "dreamtrip",
        title: "DreamTrip.mn",
        year: "2025–2026",
        category: { mn: "Веб", en: "Web" },
        desc: {
          mn: "Монголчуудад зориулсан Японы VIP аяллын үйлчилгээний танилцуулга вэб.",
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
          mn: "Хөрөнгө оруулалтын зөвлөх компанийн олон хэлт корпорат вэбсайт.",
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
          mn: "Төрийн худалдан авалтын тендерийг хянаж, шинэ зар гармагц мэдэгдэл илгээдэг автомат систем.",
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
          mn: "Facebook/Instagram-ийн захиалгыг бүрэн автоматжуулсан чатбот систем — карусель цэс, захиалгын бүртгэл, нэгдсэн өгөгдлийн сан.",
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
          mn: "Хуульч, өмгөөлөгчтэй зөвлөгөө захиалах онлайн платформ — миний анхны вэб төсөл.",
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
          mn: "Гоо сайхны 4 эмнэлгийн сошиал маркетинг, контент, постер дизайн болон сурталчилгааны менежмент.",
          en: "Social media marketing, content, poster design, and ad management for 4 beauty clinics.",
        },
        tags: ["Meta Ads", "Canva", "ManyChat"],
        clients: "Royal De Beauty · Renew · Friends · Nature Skin",
      },
    ],
  },

  services: {
    label: { mn: "Үйлчилгээ", en: "What I do" },
    heading: { mn: "Танд хэрхэн туслах вэ", en: "How I can help you" },
    items: [
      {
        id: "web",
        title: { mn: "Веб хөгжүүлэлт", en: "Web Development" },
        desc: {
          mn: "Орчин үеийн, хурдан, motion-той вэбсайт ба лендинг хуудас.",
          en: "Modern, fast, motion-rich websites & landing pages.",
        },
        tools: "Next.js · React · TypeScript · Tailwind",
      },
      {
        id: "automation",
        title: { mn: "AI ба автоматжуулалт", en: "AI & Automation" },
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
          mn: "Нэвтрэлт, удирдлагын самбар, өгөгдлийн сан бүхий бүрэн бүтээгдэхүүн.",
          en: "Full products with authentication, dashboards, and databases.",
        },
        tools: "Supabase · PostgreSQL · Next.js",
      },
      {
        id: "design",
        title: { mn: "UI/UX ба Motion", en: "UI/UX & Motion" },
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
        title: { mn: "Өсөлт", en: "Growing" },
        desc: { mn: "Renew Beauty Clinic — контент ба сурталчилгааны кампанит ажил.", en: "Renew Beauty Clinic — content and ad campaigns." },
      },
      {
        year: "2021–2023",
        title: { mn: "Урт хугацааны хамтрагч", en: "Long-term client" },
        desc: { mn: "Friends Beauty Clinic — урт хугацааны SMM хамтын ажиллагаа.", en: "Friends Beauty Clinic — a long-term SMM partnership." },
      },
      {
        year: "2022",
        title: { mn: "Анхны вэб төсөл", en: "First web project" },
        desc: { mn: "Хуульч захиалах онлайн платформ — код руу хийсэн анхны алхам.", en: "Online lawyer-booking platform — my first step into code." },
        highlight: true,
      },
      {
        year: "2024",
        title: { mn: "Бакалавр төгссөн", en: "Graduated" },
        desc: { mn: "ШУТИС — Мэдээлэл холбооны технологийн бакалавр.", en: "MUST — Information & Communication Technology." },
        highlight: true,
      },
      {
        year: "2024–2026",
        title: { mn: "Үргэлжилж буй хамтын ажиллагаа", en: "Ongoing partnership" },
        desc: { mn: "Nature Skin Clinic — SMM, өнөөг хүртэл үргэлжилж байна.", en: "Nature Skin Clinic — SMM, still ongoing." },
      },
      {
        year: "2025",
        title: { mn: "Автоматжуулалт ба KnowHub", en: "Automation + KnowHub" },
        desc: { mn: "Suvdandusal-ийн автоматжуулалтыг бүтээж, KnowHub чиглэлээ эхлүүлсэн.", en: "Built the Suvdandusal automation and started KnowHub." },
        highlight: true,
      },
      {
        year: "2025–2026",
        title: { mn: "Full-stack үе", en: "Full-stack era" },
        desc: { mn: "DreamTrip, Khan Consulting, Tender Monitor — вэб ба автоматжуулалт.", en: "DreamTrip, Khan Consulting, Tender Monitor — web + automation." },
        highlight: true,
      },
    ],
  },

  contact: {
    label: { mn: "Холбоо барих", en: "Contact" },
    heading: { mn: "Хамтдаа бүтээх үү?", en: "Let's build something" },
    sub: {
      mn: "Төсөл эсвэл хамтын ажиллагааны санал байвал бичээрэй.",
      en: "Got a project or an idea? Drop me a line.",
    },
    emailLabel: { mn: "Имэйл", en: "Email" },
    phoneLabel: { mn: "Утас", en: "Phone" },
    locationLabel: { mn: "Байршил", en: "Location" },
    email: "zolbooq@gmail.com",
    phone: "8869 0420",
    phoneRaw: "+97688690420",
    location: { mn: "Улаанбаатар, Монгол", en: "Ulaanbaatar, Mongolia" },
    // TODO: replace with the real profile URLs
    social: {
      facebook: "https://facebook.com/",
      instagram: "https://instagram.com/",
    },
  },

  // closing beat over the memory-galaxy finale
  finale: {
    heading: { mn: "Хамтдаа од асаах уу?", en: "Let's light up a star together" },
    sub: {
      mn: "Хамтран ажиллах болон төслийн захиалга байвал утасны дугаараа оруулан дурсамжийн хайрцагт зурвас үлдээнэ үү. Би эргэн холбогдох болно. Баярлалаа.",
      en: "Want to work together or commission a project? Leave a message with your phone number in the memory box and I'll get back to you. Thank you.",
    },
    continued: { mn: "Үргэлжлэл бий…", en: "To be continued…" },
  },

  footer: {
    rights: { mn: "Бүх эрх хуулиар хамгаалагдсан.", en: "All rights reserved." },
    built: { mn: "Next.js ба Framer Motion-оор бүтээв.", en: "Built with Next.js & Framer Motion." },
  },
} as const;

export type Content = typeof content;
export type { Bi };
