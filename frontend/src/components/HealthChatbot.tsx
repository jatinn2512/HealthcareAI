import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/Button";

type ChatRole = "user" | "bot";

type ChatMessage = {
  id: number;
  role: ChatRole;
  text: string;
};

const quickPrompts = [
  "How do I use Instant Alert?",
  "Where is the food scan button?",
  "How do I sync my smartwatch?",
  "How does profile autofill work?",
] as const;

const includesAny = (source: string, terms: string[]) => terms.some((term) => source.includes(term));

const getBotReply = (input: string): string => {
  const normalized = input.trim().toLowerCase();

  if (!normalized) {
    return "Type your question and I will guide you through the app features.";
  }

  if (includesAny(normalized, ["emergency", "severe chest pain", "cannot breathe", "unconscious", "fainted"])) {
    return "If this is an emergency, contact local emergency services or the nearest hospital immediately. This app is guidance only and not emergency care.";
  }

  if (includesAny(normalized, ["instant", "alert", "risk", "symptom checker"])) {
    return "Open Instant Alert from the sidebar, fill the form (N/A options are supported), then submit. You will get risk percentages with reasons and history.";
  }

  if (includesAny(normalized, ["camera", "scan", "ocr", "autofill", "qr", "photo"])) {
    return "Camera autofill is available in Profile, Instant Alert, and Food pages. Capture or upload an image and the app will try to parse QR and readable text.";
  }

  if (includesAny(normalized, ["smartwatch", "bluetooth", "wearable", "steps", "heart rate", "sync"])) {
    return "Use the Smartwatch Integration section in Settings. Tap Connect, allow Bluetooth if supported, then sync sensor values to save them in backend logs.";
  }

  if (normalized.includes("profile")) {
    return "The Profile page includes personal and medical fields such as height, weight, eyesight, disability, chronic conditions, allergies, smoking, alcohol, and notes. You can also use Scan & Autofill.";
  }

  if (includesAny(normalized, ["food", "meal", "restaurant", "dish"])) {
    return "On the Food page, use Scan Food to analyze meals. If QR or readable text is found, dish hints are detected; otherwise a fallback image-based risk estimate is used.";
  }

  if (includesAny(normalized, ["login", "register", "sign in", "sign up", "auth"])) {
    return "If login behavior seems stuck, log out and try again, or clear browser storage. The home page is the public landing route and auth pages are separate routes.";
  }

  return "I can help with login, profile, camera autofill, Instant Alert, food scan, AQI, and smartwatch sync. Tell me which feature you need.";
};

const initialMessage: ChatMessage = {
  id: 1,
  role: "bot",
  text: "I am your CuraSync assistant. Ask me anything about using the app features.",
};

const HealthChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const canSend = useMemo(() => draft.trim().length > 0, [draft]);

  const sendMessage = (value: string) => {
    const message = value.trim();
    if (!message) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: message,
    };
    const botMessage: ChatMessage = {
      id: Date.now() + 1,
      role: "bot",
      text: getBotReply(message),
    };
    setMessages((prev) => [...prev, userMessage, botMessage]);
    setDraft("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[90] sm:bottom-6 sm:right-6">
      {isOpen ? (
        <section className="flex h-[28rem] w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_24px_60px_-25px_hsl(218_38%_9%/0.8)]">
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">Health Assistant</p>
                <p className="text-[11px] text-muted-foreground">App support chat</p>
              </div>
            </div>
            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((message) => (
              <div key={message.id} className={`max-w-[86%] rounded-xl px-3 py-2 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "border border-border/60 bg-card/65"}`}>
                {message.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border/60 px-3 py-2">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary/35 hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form className="flex gap-2" onSubmit={handleSubmit}>
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type your question..."
                className="h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
              <Button type="submit" size="icon" className="h-9 w-9 rounded-lg" disabled={!canSend}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>
      ) : (
        <Button type="button" size="icon" className="h-14 w-14 rounded-full shadow-soft" onClick={() => setIsOpen(true)} title="Open health assistant">
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};

export default HealthChatbot;
