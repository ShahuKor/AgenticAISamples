import { Agent, run, tool, withTrace } from "@openai/agents";
import { createInterface } from "node:readline/promises";
import { OpenAI } from "openai";
import { z } from "zod";
import "dotenv/config";

async function ask(prompt) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const message = await rl.question(prompt);
  rl.close();
  return message;
}

const getWeatherTool = tool({
  name: "get_weather",
  description: "Get the weather for a given city",
  parameters: z.object({
    demo: z.string(),
  }),

  execute: async (input) => {
    return `The weather in ${input.demo} is sunny`;
  },
});

const weatherAgent = new Agent({
  name: "Weather Agent",
  handoffDescription: "Knows everything about the weather but nothing else.",
  tools: [getWeatherTool],
});

const agent = new Agent({
  name: "Basic test agent",
  instructions: "You are a basic agent",
  handoffDescription: "An expert on everything but the weather.",
  handoffs: [weatherAgent],
});

// makes connection or handoff between weather agent and the main agent bi-directional
weatherAgent.handoffs.push(agent);

async function main() {
  const client = new OpenAI();

  // Create a single conversation once — reused for every turn
  const { id: conversationId } = await client.conversations.create({});
  console.log(`Conversation started: ${conversationId}`);

  let latestAgent = agent;

  console.log("Type exit() to leave");
  await withTrace("Chat Session", async () => {
    while (true) {
      const message = await ask("User > ");
      if (message === "exit()") return;

      const result = await run(latestAgent, message, { conversationId });

      console.log(`[${latestAgent.name}] ${result.finalOutput}`);

      if (result.lastAgent) {
        latestAgent = result.lastAgent;
      }
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
