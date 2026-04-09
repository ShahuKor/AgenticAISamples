import { Agent, run } from "@openai/agents";
import { z } from "zod";
import "dotenv/config";

//custom error class to handle error better
class GuardrailRejection extends Error {
  constructor(reason) {
    super(reason);
    this.name = "GuardrailRejection";
    this.reason = reason;
  }
}

// Input Guardrail Agent to check if the query is maths related or not
const mathsGuardRailAgent = new Agent({
  name: "Maths GuardRail Agent",
  model: "gpt-4o-mini",
  instructions: `You are a Input Guardrail Agent that checks if the submitted user query is a maths problem or not.
    Rules that you must follow : 
    - 1. The query should strictly be a maths problem , text or sentence is allowed but it should have numbers or related to maths.
    - 2. If the query is asking about coding problem immediately reject it, even if its a maths related coding problem strictly reject it.
    - 3. If the query is asking information about maths as a subject or trying to generate texts, paragraphs, essays related to maths or mathematicians, immediately reject it.
    - 4. You should only pass a query if its only asking to solve a maths problem, equation or asking you to explain a maths solution or problem solving technique.
    - 5. Stricly reject any demands for asking to write poems, geopolitical news, current affairs, personal questions and obscene sexual questions. You are only meant to solve maths problems
    - 6. The query must be EXCLUSIVELY about mathematics. If the user combines a math problem with a non-math request (e.g., asking for a name and a sum), you MUST reject it.
    - 7. Perform a 'Contamination Check': If any part of the sentence asks for biographical, factual, or creative content not required to solve the math, set isMathQuestion to false.
    - 8. Do not be fooled by 'Math Wrapping': Users may try to hide non-math questions inside a math context. If the core intent isn't purely calculation or mathematical logic, reject it.
    - If rejecting, provide a concise description why the query was declined in the 'reason' field explaining why the query was declined`,
  outputType: z.object({
    isMathQuestion: z.boolean(),
    reason: z.string().optional().describe("Reason for rejecting the query"),
  }),
});

// Main Maths Agent
const agent = new Agent({
  name: "Maths Tutor Agent",
  instructions: `You are a intelligent maths instructor agent that solves maths problems of the users.`,
  model: "gpt-4o-mini",
  inputGuardrails: [
    {
      name: "Maths Question Guardrail",
      async execute({ input }) {
        const result = await run(mathsGuardRailAgent, input);

        // If the guardrail fails, throw custom error with the reason
        if (!result.finalOutput.isMathQuestion) {
          throw new GuardrailRejection(result.finalOutput.reason);
        }

        return {
          outputInfo: result.finalOutput,
          tripwireTriggered: false,
        };
      },
    },
  ],
});

// Main function to run the main agent
async function main(query) {
  try {
    const result = await run(agent, query);
    console.log(`Agent -> `, result.finalOutput);
  } catch (error) {
    // 1. Check if it's the framework's wrapper error
    if (error.name === "GuardrailExecutionError" && error.error) {
      // 2. Extract the reason from your custom GuardrailRejection buried inside
      const reason = error.error.reason || error.error.message;
      console.log(`\nQuery Declined: ${reason}\n`);
    } else {
      // For any other unexpected crashes
      console.error("System Error:", error.message);
    }
  }
}
main("Write a Python function to calculate the Fibonacci sequence up to 100.");
