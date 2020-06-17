

// "prompt" is magically available from promzard but collides with DOM's prompt()
//@ts-ignore
const p: (msg: string, def: any, cb: (...args: any) => any) => any = prompt;

export default {
  url: p("What URL do you want to load by default?", "<Hackium Reference Page>", function (result: string) {
    return result;
  }),
  adblock: p("Do you want to block ads?", "true", function (result: string) {
    return result === "true";
  }),
  devtools: p("Do you want to open devtools automatically?", "true", function (result: string) {
    return result === "true";
  }),
  // intercept: p("Do you want to intercept and modify any scripts?", "yes", function (result: string) {
  //   return result === 'yes' ? 
  //   return result;
  // }),
  headless: p("Do you want to run headless?", "false", function (result: string) {
    return result === 'true';
  }),
  execute: p("Do you want to execute any hackium scripts by default?", "no", function (result: string) {
    return [];
  })
};