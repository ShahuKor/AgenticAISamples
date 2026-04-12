import { Agent, run, tool } from "@openai/agents";
import { google } from "googleapis";
import { z } from "zod";
import "dotenv/config";
import readline from "readline/promises";
const weatherTool = tool({
  name: "get_weather",
  description: "Return the weather details about a specific city",
  parameters: z.object({ city: z.string().describe("Name of the City") }),
  async execute({ city }) {
    const response = await fetch(
      `https://wttr.in/${city.toLowerCase()}?format=%C+%t`,
    ).then((res) => res.text());
    return `The weather of the ${city} is ${response}`;
  },
});

const sendMailHelper = async (body: string) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      "http://localhost:3000",
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
    });

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const emailContent = [
      'Content-Type: text/plain; charset="UTF-8"\n',
      "MIME-Version: 1.0\n",
      `To: ${process.env.GMAIL_USER}\n`,
      `From: ${process.env.GMAIL_USER}\n`,
      `Reply-To: ${process.env.GMAIL_USER}\n`,
      `Subject: Weather detail from weather ai agent\n\n`,
      `Name: Weather Ai Agent\n`,
      `Email: ${process.env.GMAIL_USER}\n\n`,
      `Message:\n${body}`,
    ].join("");

    const encodedMessage = Buffer.from(emailContent)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: encodedMessage,
      },
    });

    return "Email sent successfully";
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Surface the error to the agent instead of swallowing it
  }
};

const sendEmailTool = tool({
  name: "send_email",
  description: "This tool sends an email about the weather to the user",
  parameters: z.object({
    body: z.string().describe("Email Body"),
  }),
  needsApproval: true,
  execute: async ({ body }) => {
    return await sendMailHelper(body);
  },
});

async function confirm(permission: string) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await rl.question(`${permission} (y/n): `);
  const normalizedAnswer = answer.toLowerCase();
  rl.close();
  return normalizedAnswer === "y" || normalizedAnswer === "yes";
}

const agent = new Agent({
  name: "Weather Agent",
  instructions: `You are a weather agent. Fetch the weather for the requested city using the get_weather tool, 
  then immediately send the result to ${process.env.GMAIL_USER} using the send_email tool. 
  Always use both tools — never skip sending the email.`,
  model: "gpt-4o-mini",
  tools: [weatherTool, sendEmailTool],
});

async function main(query: string) {
  let result = await run(agent, query);

  let hasInteruptions = result?.interruptions.length > 0;

  while (hasInteruptions) {
    let currentState = result.state;

    for (const interupts of result.interruptions) {
      const confirmed = await confirm(
        `Agent ${interupts.agent.name} would like to use the tool ${interupts.name} with "${interupts.arguments}". Do you approve?`,
      );
      if (confirmed) {
        currentState.approve(interupts);
      } else {
        currentState.reject(interupts);
      }
    }
    result = await run(agent, currentState);
    hasInteruptions = result?.interruptions.length > 0;
  }
  console.log(result.finalOutput);
}

main(
  "Can you tell me whats the weather of Nashik Today and also send this to me on email?",
);

/* 
understanding the state logic :
When an agent hits a tool with needsApproval, it pauses and returns a result.interruptions array. 
Each interruption is a planned tool call waiting for a decision.
You for loop through all interruptions, calling state.approve() or state.reject() on each one. 
These calls mutate the state object, baking all your decisions into it.

After the loop, you call run(agent, state) once. 
The agent doesn't re-plan — it just reads the decisions already recorded in the state and executes them in order.

at the end of the for loop your currentState object will be looking like this if you had 4 interruptions : 
{
  tool_call_1: { decision: "approved", arguments: "..." },
  tool_call_2: { decision: "approved", arguments: "..." },
  tool_call_3: { decision: "rejected", arguments: "..." },
  tool_call_4: { decision: "approved", arguments: "..." },
}

*/
