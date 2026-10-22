import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { Copy, Loader2 } from "lucide-react";
import { generateEmail, summarizeNotes, planTasks } from "@/lib/ai.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Desk — AI email, notes & planning" },
      { name: "description", content: "Write emails, summarize meeting notes and plan your week with AI." },
      { property: "og:title", content: "Desk — AI email, notes & planning" },
      { property: "og:description", content: "Write emails, summarize meeting notes and plan your week with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tool = "email" | "notes" | "planner";
const TOOLS: { id: Tool; n: string; label: string }[] = [
  { id: "email", n: "01", label: "Email" },
  { id: "notes", n: "02", label: "Meeting notes" },
  { id: "planner", n: "03", label: "Planner" },
];

function useRunner() {
  const [out, setOut] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<{ text: string }>) => {
    setBusy(true);
    setErr("");
    try {
      setOut((await fn()).text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };
  return { out, err, busy, run };
}

function Index() {
  const [tool, setTool] = useState<Tool>("email");
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-12">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-foreground pb-6">
        <div>
          <p className="eyebrow">Your AI work desk</p>
          <h1 className="font-display text-6xl leading-none md:text-7xl">Desk.</h1>
        </div>
        <nav className="flex gap-2">
          {TOOLS.map((t) => (
            <button key={t.id} onClick={() => setTool(t.id)} className="tab" data-active={tool === t.id}>
              <span className="text-xs opacity-60">{t.n}</span> {t.label}
            </button>
          ))}
        </nav>
      </header>
      {tool === "email" && <EmailTool />}
      {tool === "notes" && <NotesTool />}
      {tool === "planner" && <PlannerTool />}
    </main>
  );
}

function Layout({ title, sub, form, r }: { title: string; sub: string; form: ReactNode; r: ReturnType<typeof useRunner> }) {
  return (
    <section className="grid gap-8 md:grid-cols-2">
      <div>
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mb-6 text-muted-foreground">{sub}</p>
        {form}
      </div>
      <div className="paper min-h-[24rem]">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">Result</span>
          {r.out && (
            <button className="ghost-btn" onClick={() => navigator.clipboard.writeText(r.out)}>
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          )}
        </div>
        {r.busy ? (
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</p>
        ) : r.err ? (
          <p className="text-destructive">{r.err}</p>
        ) : r.out ? (
          <div className="prose-desk"><ReactMarkdown>{r.out}</ReactMarkdown></div>
        ) : (
          <p className="text-muted-foreground">Your result will appear here.</p>
        )}
      </div>
    </section>
  );
}

function EmailTool() {
  const r = useRunner();
  const [purpose, setPurpose] = useState("");
  const [recipient, setRecipient] = useState("");
  const [tone, setTone] = useState<"formal" | "friendly" | "persuasive">("formal");
  return (
    <Layout title="Smart email" sub="Describe what you need to say — pick a tone." r={r} form={
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); r.run(() => generateEmail({ data: { purpose, recipient, tone } })); }}>
        <input className="field" placeholder="Recipient (e.g. hiring manager)" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
        <textarea className="field h-40" required minLength={3} placeholder="e.g. Ask for a one-week extension on the Q4 report due to data delays" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        <div className="flex gap-2">
          {(["formal", "friendly", "persuasive"] as const).map((t) => (
            <button type="button" key={t} className="chip capitalize" data-active={tone === t} onClick={() => setTone(t)}>{t}</button>
          ))}
        </div>
        <button className="primary-btn" disabled={r.busy}>Write email</button>
      </form>
    } />
  );
}

function NotesTool() {
  const r = useRunner();
  const [notes, setNotes] = useState("");
  return (
    <Layout title="Meeting notes" sub="Paste raw notes. Get a summary, decisions, action items and deadlines." r={r} form={
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); r.run(() => summarizeNotes({ data: { notes } })); }}>
        <textarea className="field h-80" required minLength={10} placeholder="Paste your meeting notes here…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button className="primary-btn" disabled={r.busy}>Summarize</button>
      </form>
    } />
  );
}

function PlannerTool() {
  const r = useRunner();
  const [tasks, setTasks] = useState("");
  const [hours, setHours] = useState("9:00–17:00");
  const [range, setRange] = useState<"daily" | "weekly">("daily");
  return (
    <Layout title="Task planner" sub="List your tasks. Get them prioritized and scheduled." r={r} form={
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); r.run(() => planTasks({ data: { tasks, hours, range } })); }}>
        <textarea className="field h-56" required minLength={3} placeholder={"One task per line, e.g.\nFinish client proposal (due Friday)\nGym\nReply to emails"} value={tasks} onChange={(e) => setTasks(e.target.value)} />
        <input className="field" placeholder="Working hours" value={hours} onChange={(e) => setHours(e.target.value)} />
        <div className="flex gap-2">
          {(["daily", "weekly"] as const).map((t) => (
            <button type="button" key={t} className="chip capitalize" data-active={range === t} onClick={() => setRange(t)}>{t}</button>
          ))}
        </div>
        <button className="primary-btn" disabled={r.busy}>Build schedule</button>
      </form>
    } />
  );
}
