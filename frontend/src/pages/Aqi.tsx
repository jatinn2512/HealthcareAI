import { motion } from "framer-motion";
import { CloudRain, Droplets, MapPin, ShieldAlert, Thermometer, Wind } from "lucide-react";
import AppLayout from "@/components/AppLayout";

const aqiValue = 218;

const getAqiStatus = (value: number) => {
  if (value <= 50) return { label: "Good", color: "text-emerald-600", bg: "bg-emerald-500/12", desc: "Minimal impact. Outdoor activity is safe." };
  if (value <= 100) return { label: "Satisfactory", color: "text-yellow-600", bg: "bg-yellow-500/12", desc: "Minor discomfort for sensitive people." };
  if (value <= 200) {
    return { label: "Moderate", color: "text-orange-600", bg: "bg-orange-500/12", desc: "Breathing discomfort possible in sensitive groups." };
  }
  if (value <= 300) {
    return { label: "Poor", color: "text-red-600", bg: "bg-red-500/12", desc: "Reduce outdoor exertion and use mask outdoors." };
  }
  if (value <= 400) {
    return { label: "Very Poor", color: "text-fuchsia-700", bg: "bg-fuchsia-500/12", desc: "Avoid prolonged outdoor exposure." };
  }
  return { label: "Severe", color: "text-purple-700", bg: "bg-purple-500/12", desc: "Serious health impact possible for everyone." };
};

const pollutants = [
  { name: "PM2.5", value: "128 ug/m3", status: "Poor", icon: Droplets, color: "text-red-600" },
  { name: "PM10", value: "236 ug/m3", status: "Poor", icon: Wind, color: "text-red-600" },
  { name: "CO", value: "1.2 mg/m3", status: "Moderate", icon: CloudRain, color: "text-orange-600" },
  { name: "NO2", value: "58 ppb", status: "Moderate", icon: Thermometer, color: "text-orange-600" },
] as const;

const recommendations = [
  "Prefer indoor workout today in Delhi NCR.",
  "Use N95 mask during commute and outdoor exposure.",
  "Keep windows closed in peak traffic hours (8 AM-12 PM, 6 PM-10 PM).",
  "Use air purifier in bedroom at night if available.",
] as const;

const hourlyTrend = [
  { hour: "6AM", value: 178 },
  { hour: "9AM", value: 224 },
  { hour: "12PM", value: 248 },
  { hour: "3PM", value: 236 },
  { hour: "6PM", value: 215 },
  { hour: "9PM", value: 202 },
] as const;

const Aqi = () => {
  const status = getAqiStatus(aqiValue);
  const markerLeftPercent = Math.min((aqiValue / 500) * 100, 100);
  const hourlyMax = Math.max(...hourlyTrend.map((item) => item.value));

  return (
    <AppLayout title="AQI" subtitle="Delhi NCR focused AQI monitoring with India-standard categories and guidance.">
      <section className="glass-card overflow-hidden rounded-3xl border-border/50 p-6 lg:p-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="flex flex-col items-center text-center">
            <div className={`flex h-36 w-36 items-center justify-center rounded-full border-4 ${status.bg} ${status.color}`}>
              <div>
                <p className="text-4xl font-bold">{aqiValue}</p>
                <p className="text-xs font-medium">AQI</p>
              </div>
            </div>
            <p className={`mt-3 text-lg font-semibold ${status.color}`}>{status.label}</p>
            <p className="text-sm text-muted-foreground">{status.desc}</p>
          </div>

          <div className="flex-1">
            <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              Delhi NCR - Anand Vihar
            </div>

            <div className="relative overflow-hidden rounded-full border border-border/60">
              <div className="flex h-4">
                <div className="w-1/6 bg-emerald-400/85" />
                <div className="w-1/6 bg-yellow-400/85" />
                <div className="w-1/6 bg-orange-400/85" />
                <div className="w-1/6 bg-red-500/85" />
                <div className="w-1/6 bg-fuchsia-500/85" />
                <div className="w-1/6 bg-purple-500/85" />
              </div>
              <div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-background bg-foreground shadow" style={{ left: `calc(${markerLeftPercent}% - 8px)` }} />
            </div>

            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>Good</span>
              <span>Satisfactory</span>
              <span>Moderate</span>
              <span>Poor</span>
              <span>V.Poor</span>
              <span>Severe</span>
            </div>

            <div className="mt-6 flex h-32 items-center justify-center rounded-2xl border border-border/60 bg-card/55 text-sm text-muted-foreground">
              <MapPin className="mr-2 h-4 w-4" />
              Local hotspot summary: Anand Vihar, Noida Sec-62, Gurgaon Sector-51
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {pollutants.map((pollutant, index) => (
          <motion.article
            key={pollutant.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-3xl border-border/50 p-4 text-center sm:p-5"
          >
            <pollutant.icon className={`mx-auto mb-2 h-6 w-6 ${pollutant.color}`} />
            <p className="text-sm font-semibold">{pollutant.name}</p>
            <p className="mt-1 text-lg font-bold sm:text-xl">{pollutant.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{pollutant.status}</p>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-6 lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Hourly AQI Trend</h2>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/75 to-card/35 p-4">
            <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_top,hsl(var(--border))_1px,transparent_1px)] [background-size:100%_22%]" />
            <div className="relative grid h-56 grid-cols-6 items-end gap-2 sm:gap-3">
              {hourlyTrend.map((item) => (
                <div key={item.hour} className="flex h-full flex-col justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.round((item.value / hourlyMax) * 100)}%` }}
                    transition={{ duration: 0.6 }}
                    className="relative min-h-4 rounded-t-md bg-gradient-to-t from-health-cyan/65 via-health-cyan/80 to-health-teal/85 shadow-[0_10px_18px_-12px_rgba(14,165,233,0.9)]"
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground">{item.value}</span>
                  </motion.div>
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">{item.hour}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <ShieldAlert className="h-5 w-5 text-health-cyan" />
            Health Recommendations
          </h2>
          <div className="space-y-3">
            {recommendations.map((tip) => (
              <div key={tip} className="rounded-2xl border border-border/60 bg-card/55 p-3 text-sm leading-relaxed text-muted-foreground">
                {tip}
              </div>
            ))}
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default Aqi;
