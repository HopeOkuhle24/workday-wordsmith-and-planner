import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.object({
  purpose: z.string().min(3).max(4000),
  recipient: z.string().max(200).optional(),
  tone: z.enum(["formal", "friendly", "persuasive"]),
});

export const generateEmail = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => emailSchema.parse(d))
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    const text = await generate(
      `You write polished professional emails. Tone: ${data.tone}. Output markdown with a first line "**Subject:** ..." then a blank line, then the email body with greeting and sign-off. No commentary.`,
      `Recipient: ${data.recipient || "unspecified"}\nWhat the email should say:\n${data.purpose}`,
    );
    return { text };
  });

export const summarizeNotes = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ notes: z.string().min(10).max(30000) }).parse(d))
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    const text = await generate(
      `You summarize meeting notes. Output markdown with exactly these sections: "## Summary" (3-6 concise bullets), "## Decisions", "## Action Items" (bullets as "**Owner** — task (due: date or 'not set')"), "## Deadlines". Write "None noted." for empty sections. No extra commentary.`,
      data.notes,
    );
    return { text };
  });

export const planTasks = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        tasks: z.string().min(3).max(8000),
        range: z.enum(["daily", "weekly"]),
        hours: z.string().max(100).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { generate } = await import("./ai.server");
    const text = await generate(
      `You are a productivity planner. Build a realistic ${data.range} schedule. Output markdown: "## Priorities" (tasks ranked using urgency/importance, each tagged High/Medium/Low with a one-line reason), then "## Schedule" as a markdown table (${data.range === "daily" ? "Time | Task | Notes" : "Day | Time | Task"}), include breaks, then "## Tips" with 2-3 bullets. No extra commentary.`,
      `Working hours: ${data.hours || "9:00–17:00"}\nTasks:\n${data.tasks}`,
    );
    return { text };
  });
