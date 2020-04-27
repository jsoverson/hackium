
import Protocol from "puppeteer-interceptor/node_modules/devtools-protocol";
import { Interceptor } from "puppeteer-extra-plugin-interceptor/node_modules/puppeteer-interceptor";

// Why do I need this if puppeteer-extra-plugin-interceptor does this itself?
declare module 'puppeteer' {
  interface Page {
      intercept(patterns: Protocol.Fetch.RequestPattern[], eventHandlers: Interceptor.EventHandlers): void;
  }
}
