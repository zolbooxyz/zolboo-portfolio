import Background from "@/components/Background";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Services from "@/components/Services";
import Timeline from "@/components/Timeline";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Background />
      <div className="relative z-10">
        <Nav />
        <main>
          <Hero />
          <Marquee />
          <About />
          <Projects />
          <Services />
          <Timeline />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
