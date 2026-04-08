import { run, Agent, tool } from "@openai/agents";
import "dotenv/config";
import { z } from "zod";
import fs from "fs/promises";

const showplanstool = tool({
  name: "show_data_plan",
  description: "Return available data plans",
  parameters: z.object({}),
  async execute({}) {
    // fetch data from the database about the data plans irl
    const plans = [
      {
        id: "1",
        price: 399,
        data: "20MB/s",
      },
      {
        id: "2",
        price: 699,
        data: "40MB/s",
      },
      {
        id: "3",
        price: 999,
        data: "60MB/s",
      },
      {
        id: "4",
        price: 1299,
        data: "10MB/s",
      },
    ];
    return plans;
  },
});

const planrefundtool = tool({
  name: "Plan_Refund_Tool",
  description:
    "Refund and Cancel any data plan for a particular user of Jio Telecom",
  parameters: z.object({
    userName: z.string().describe("User Name"),
    userId: z.number().describe("User Id"),
    plan: z.number().describe("User Plan Amount"),
  }),
  async execute({ userName, userId, plan }) {
    await fs.writeFile(
      "refunds.txt",
      `Refund for the plan of amount ${plan} created successfully for user : ${userName} , with user ID : ${userId} and the plan has been cancelled \n`,
      "utf8",
    );

    return {
      success: true,
      message: "User Refunded successfully and the Plan has been cancelled",
    };
  },
});

const financeAgent = new Agent({
  name: "Finance Service Agent",
  instructions: `You are an finance department service agent for the company Jio Telecom and your role is to get user name and user ID and user Plan (amount), and help users with refund and cancellation of their data plan.`,
  model: "gpt-4o-mini",
  tools: [planrefundtool],
});

const salesAgent = new Agent({
  name: "Customer Sales Agent",
  instructions: `You are a sales agent for Jio Telecom.

When the user asks about data plans:
- ALWAYS call the show_data_plan tool
- DO NOT ask follow-up questions
- Return the plans clearly 
`,
  model: "gpt-4o-mini",
  tools: [showplanstool],
});

const serviceAgent = new Agent({
  name: "Customer Service Agent",
  instructions: `You are a routing agent for Jio Telecom.

Your ONLY job is to decide which agent should handle the request.

Rules:
- If the user asks about data plans, pricing, or offers → IMMEDIATELY handoff to salesAgent. DO NOT ask follow-up questions.
- If the user asks for refund or cancellation → IMMEDIATELY handoff to financeAgent. Extract:
  - userName (string)
  - userId (number)
  - plan (number)

DO NOT answer questions yourself.
DO NOT ask clarifying questions.
Always delegate to the correct agent.
  `,
  model: "gpt-4o-mini",
  handoffDescription: `
- salesAgent: Handles data plan queries
- financeAgent: Handles refunds and cancellations (requires userName, userId, plan)
`,
  handoffs: [salesAgent, financeAgent],
});

async function main(query) {
  const result = await run(serviceAgent, query);
  console.log(`Agent : `, result.finalOutput);
}

main(
  "Hello my name is Abhishek Mukherjee having user id 1222300 having plan of 1299, I want to cancel this please make a refund and cancellation",
);
