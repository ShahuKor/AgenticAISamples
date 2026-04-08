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
      `Refund for the plan of amount ${plan} created successfully for user : ${userName} , with user ID : ${userId} and the plan has been cancelled`,
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

const serviceAgent = new Agent({
  name: "Customer Service Agent",
  instructions: `You are a customer service agent for Jio Telecom.

- If the user asks about plans → use show_data_plan
- If the user asks for refund or cancellation → ALWAYS call the "Plan Refund and Cancellation Agent" tool
- - Always extract:
  - userName (string)
  - userId (number)
  - plan (number)
- If missing, ask the user for it before proceeding
`,
  model: "gpt-4o-mini",
  tools: [
    showplanstool,
    financeAgent.asTool({
      toolName: "Plan Refund and Cancellation Agent",
      toolDescription:
        "This tool takes a user ID, user name and user plan amount and helps users in refund and cancellation of their data plan",
    }),
  ],
});

async function main(query) {
  const result = await run(serviceAgent, query);
  console.log(`Result : `, result.finalOutput);
}

main(
  "My name is Shahu Kor, userId is 123333 and my plan is of amount 399 , please cancel this",
);
