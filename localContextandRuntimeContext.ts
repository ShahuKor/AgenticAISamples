import { Agent, run, RunContext, tool } from "@openai/agents";
import { z } from "zod";
import "dotenv/config";

interface UserContext {
  userId: string;
  fetchUserDetailsfromDB: () => Promise<string>;
}

interface UserQuery {
  user: string;
  assistant: string;
}

interface ToolReturn {
  userDetails: string;
  userQueries: UserQuery[];
}

const getUserPastQueriesTool = tool({
  name: "Get_User_Past_Queries_Tool",
  description:
    "This tool helps agent get the past queries asked by user to the agent",
  parameters: z.object({}),
  execute: async (
    _,
    context?: RunContext<UserContext>,
  ): Promise<ToolReturn | undefined> => {
    const userQueries = [
      {
        user: "How do I top up my prepaid balance?",
        assistant:
          "You can top up your prepaid balance using our app, website, or by buying a voucher and entering the code.",
      },
      {
        user: "Can I top up using a credit card?",
        assistant:
          "Yes, you can use a credit or debit card through the app or website to add balance instantly.",
      },
      {
        user: "Is there a minimum top-up amount?",
        assistant:
          "Yes, the minimum top-up amount is usually €5, but it may vary depending on your plan.",
      },
      {
        user: "How do I check my prepaid balance?",
        assistant:
          "You can check your balance by dialing a short code, using the app, or logging into your account online.",
      },
      {
        user: "What happens if my prepaid balance runs out?",
        assistant:
          "If your balance runs out, you won’t be able to make calls or use data until you top up again.",
      },
    ];
    const userdetails = (await context?.context.fetchUserDetailsfromDB()) || "";
    return {
      userDetails: userdetails,
      userQueries: userQueries,
    };
  },
});

const agent = new Agent<UserContext>({
  name: "General Agent",
  instructions: `You are an intelligent customer service agent working for Prepay power.
    Greet user when starting a conversation.
    If the user asks a new query about prepay, Run the getUserPastQueriesTool to get all user information and data, the tool helps you to get user past query history.
    Present the past user query history, their name and user id before in a summarised format before answering the latest query asked by the user
    `,
  model: "gpt-4o-mini",
  tools: [getUserPastQueriesTool],
});

async function main(query: string, context: UserContext) {
  const result = await run(agent, query, { context: context });
  console.log(`Agent > `, result.finalOutput);
}

main(
  "Hello I am want to ask whats the minimum top up amount I forgot about that ",
  {
    userId: "22",
    fetchUserDetailsfromDB: async () => {
      const username = "Shahu Kor";
      return `User Id = 22 userName = ${username}`;
    },
  },
);
