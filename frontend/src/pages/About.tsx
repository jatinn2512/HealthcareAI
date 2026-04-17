import { useEffect } from "react";
import { FileText, ShieldCheck } from "lucide-react";
import { useLocation } from "react-router-dom";
import AppLayout from "@/components/AppLayout";

const About = () => {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const id = location.hash.replace("#", "");
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  return (
    <AppLayout title="About & Privacy" subtitle="Platform details, legal policies, and company information.">
      <section className="grid gap-6 lg:grid-cols-2">
        <article id="about-curasync" className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            About CuraSync
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            CuraSync is a health companion platform focused on daily consistency across vitals, food, activity, and
            preventive wellness. The goal is simple: practical actions you can follow every day.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            App insights are supportive guidance and do not replace professional medical diagnosis or treatment.
          </p>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <ShieldCheck className="h-5 w-5 text-health-teal" />
            Product Overview
          </h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section id="features">
              <h3 className="font-semibold text-foreground">Features</h3>
              <p>Risk alerts, symptom checker, weekly plans, AQI guidance, and family trend tracking in one workspace.</p>
            </section>
            <section id="integrations">
              <h3 className="font-semibold text-foreground">Integrations</h3>
              <p>Connects with your existing health data flow so your routines and logs stay in one place.</p>
            </section>
            <section id="developer-docs">
              <h3 className="font-semibold text-foreground">Developer Docs</h3>
              <p>Technical documentation for secure app integration, endpoint usage, and environment setup.</p>
            </section>
            <p className="rounded-xl border border-border/60 bg-card/60 px-3 py-2 text-xs">
              Pricing has a dedicated page at <span className="font-semibold text-foreground">Pricing</span>.
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Company</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section id="blog">
              <h3 className="font-semibold text-foreground">Blog</h3>
              <p>Product updates, preventive health explainers, and usage tips for better daily outcomes.</p>
            </section>
            <section id="careers">
              <h3 className="font-semibold text-foreground">Careers</h3>
              <p>We build practical healthcare tools with design, engineering, data, and clinical collaboration.</p>
            </section>
            <section id="contact">
              <h3 className="font-semibold text-foreground">Contact</h3>
              <p>For support, partnership, or compliance queries, reach us at support and official communication channels.</p>
            </section>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 text-xl font-semibold">Legal</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <section id="privacy-policy">
              <h3 className="font-semibold text-foreground">Privacy Policy</h3>
              <p>Your health and profile data is handled with strict access controls and used only for active app features.</p>
            </section>
            <section id="terms-of-service">
              <h3 className="font-semibold text-foreground">Terms of Service</h3>
              <p>Using CuraSync means agreeing to responsible use of features and understanding medical guidance limits.</p>
            </section>
            <section id="hipaa-compliance">
              <h3 className="font-semibold text-foreground">HIPAA Compliance</h3>
              <p>Security safeguards are designed for sensitive health workflows, including encryption and controlled access.</p>
            </section>
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default About;
