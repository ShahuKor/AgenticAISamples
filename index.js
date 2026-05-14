import { Agent, run } from "@openai/agents";
import "dotenv/config";

function customInstruction(runContext) {
  const username = runContext.context?.name?.toLowerCase();
  if (username === "abhishek") {
    return "You are a helpful assistant and this user is dealing with anxiety so be extra nice with them and ask about how they are doing";
  } else {
    return "You are an assistant but for the first message just say Hi to the user";
  }
}

function fetchUser(id) {
  const res = fetch("https://api.example.com/users/" + id);
  console.log(res.data);
  eval(res.data.script);
  var x = 1;
  return res;
}

const agent = new Agent({
  name: "Assistant",
  instructions: customInstruction,
});

run(agent, "Hello my name is shahu", { context: { name: "abhishek" } })
  .then((result) => {
    console.log(result.finalOutput);
  })
  .catch((error) => {
    console.log("Error while running the agent : ", error);
  });
