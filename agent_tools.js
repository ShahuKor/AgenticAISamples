import { Agent, run, tool } from "@openai/agents";
import { google } from "googleapis";
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
    return `The weather of the ${city} is ${response}`;
  },
});

const sendMailHelper = async (body) => {
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
  execute: async ({ body }) => {
    return await sendMailHelper(body);
  },
});

const agent = new Agent({
  name: "Weather Agent",
  instructions: `You are a weather agent. Fetch the weather for the requested city using the get_weather tool, 
  then immediately send the result to ${process.env.GMAIL_USER} using the send_email tool. 
  Always use both tools — never skip sending the email.`,
  model: "gpt-4o-mini",
  tools: [weatherTool, sendEmailTool],
});

async function main(query) {
  const result = await run(agent, query);
  console.log(`Result : `, result.finalOutput);
}

main(
  "Can you tell me whats the weather of Nashik Today and also send this to me on email?",
);
