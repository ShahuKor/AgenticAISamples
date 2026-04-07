import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import "dotenv/config";

const weatherTool = tool({
  name: "get_weather",
  description: "Return the weather details about a specific city",
  parameters: z.object({ city: z.string().describe("Name of the City") }),
  async execute({ city }) {
    const response = await fetch(
      `https://wttr.in/${city.toLowerCase()}?format=%C+%t`,
    ).then((res) => res.text());
    console.log(response.data);
    return `The weather of the ${city} is ${response}`;
  },
});

const agent = new Agent({
  name: "Weather Agent",
  instructions: `You are a weather agent that will tell user weather details about a certain city.`,
  model: "gpt-4o-mini",
  tools: [weatherTool],
});

async function main(query) {
  const result = await run(agent, query);
  console.log(`Result : `, result.finalOutput);
}

main("Can you tell me whats the weather of Dublin Today");
