# Hackium

Hackium is a CLI tool, a browser, and a framework for analyzing and manipulating web sites.

## Hackium vs Puppeteer?

Puppeteer is an automation framework aimed at developers who need to automate and test the web headlessly. Hackium exposes Puppeteer's automation framework to an interactive version of Chromium and extends it with features aimed at web power users.

Hackium started as Puppeteer scripts and will continue to directly rely on Puppeteer unless both project's focus diverge passed the point of code sharability.

### Core differences

- Hackium exposes access to [Chrome's Extension API](https://developer.chrome.com/extensions/api_index) via [`puppeteer-extensionbridge`](github.com/jsoverson/puppeteer-extensionbridge).
- Hackium simulates human behavior for mouse movement and keyboard events, vs moving in straight lines or typing rapidly all at once.
- Hackium prioritizes intercepting and transforming responses.
- Hackium includes a plugin framework to hook into the hackium lifecycle.
- Hackium injects an in-page client to extend functionality to pages and the console.
- Hackium is not meant to run headlessly. It can, but Chromium loses functionality when headless.
- Hackium includes a REPL to test and automate a live browser session.
- Puppeteer scripts can be used with Hackium with few to no changes, Hackium scripts can not be used by Puppeteer.
- and a lot more.

## Installation

Install hackium globally with:

```bash
$ npm install -g hackium
```

You can install Hackium locally but every install downloads an additional Chromium installation so local installs should be avoided unless necessary.

## API usage

Hackium can be used like Puppeteer from standard node.js scripts, e.g.

```js
const { Hackium } = require('hackium');

(async function main() {
  const hackium = new Hackium();
  const browser = await hackium.launch();
  //...
})();
```

## Command line usage

Open hackium with the `hackium` command and Hackium will start the bundled Chromium.

```bash
$ hackium
```

### `hackium init`

use `hackium init` to initialize a configuration file or common boilerplate scripts.

`hackium init config` will generate a configuration file and, optionally through the wizard, boilerplate scripts.

`hackium init interceptor` will provide a list of interceptor templates to generate

`hackium init injection` will generate a template script to inject in the page.

`hackium init script` will generate a sample Hackium script that can be executed via `hackium -e script.js`

### Default commmand options

```
Options:
  --version          Show version number                               [boolean]
  --help             Show help                                         [boolean]
  --headless         start hackium in headless mode   [boolean] [default: false]
  --pwd              root directory to look for support modules
                           [default: "/Users/jsoverson/development/src/hackium"]
  --adblock          turn on ad blocker                         [default: false]
  --url, -u          starting URL
  --env              environment variable name/value pairs (e.g. --env
                     MYVAR=value)                          [array] [default: []]
  --inject, -E       script file to inject first on every page
                                                           [array] [default: []]
  --execute, -e      hackium script to execute             [array] [default: []]
  --interceptor, -i  interceptor module that will handle intercepted responses
                                                           [array] [default: []]
  --userDataDir, -U  Chromium user data directory
                        [string] [default: "/Users/jsoverson/.hackium/chromium"]
  --devtools, -d     open devtools automatically on every tab
                                                       [boolean] [default: true]
  --watch, -w        watch for configuration changes  [boolean] [default: false]
  --plugin, -p       include plugin                        [array] [default: []]
  --timeout, -t      set timeout for Puppeteer                  [default: 30000]
  --chromeOutput     print Chrome stderr & stdout logging
                                                      [boolean] [default: false]
  --config, -c                                            [string] [default: ""]
```

### Debugging

Set the DEBUG environment variable with a wildcard to print debug logs to the console, e.g.

```bash
$ DEBUG=hackium* hackium
```

## Configuration

Hackium looks for `hackium.json` or `hackium.config.js` files in the current directory for configuration. Hackium merges or overrides configuration from the command line arguments. See the [Arguments definition](https://github.com/jsoverson/hackium/blob/master/src/arguments.ts#L25-L42) for valid configuration options.

## REPL

Hackium's REPL exposes the browser, page, and protocol instances for rapid prototyping.

### Additional REPL context:

- page: active page
- browser: browser instance
- cdp: chrome devtools protocol connection
- extension: chrome extension API bridge

## Interceptors

Interceptor modules define two things, a pattern that matches against URLs and an interceptor which is passed both the request and the response and can optionally return a modified response to send to the browser.

Use `hackium init interceptor` to see examples of different interceptors

## Injecting JavaScript

Injecting JavaScript before any other code loads is the only way to guarantee a pristine, unadulterated environment. Injected JavaScript can take any form and will run at the start of every page load.

Use `hackium init injection` to see an example of injected JavaScript that augments the in-page `hackium` client.

## Hackium Scripts

Hackium scripts are normal JavaScript scripts surrounded by an async wrapper function and a context primed with variables to reduce boilerplate. Hackium launches a browser and sets the `hackium`, `browser`, and `page` values automatically so you can rapidly get running.

Use `hackium init script` to generate a sample script.

## Plugins

Plugins are just simple JavaScript objects with the following properties that tie into the lifecycle of a Hackium instance and browser launch. See [hackium-plugin-preserve-native](https://github.com/jsoverson/hackium-plugin-preserve-native) for an example of a plugin that injects JavaScript into the page to preserve native functions.

```
{
  preInit?: (hackium: Hackium, options: ArgumentsWithDefaults) => void;
  postInit?: (hackium: Hackium, finalOptions: ArgumentsWithDefaults) => void;
  preLaunch?: (hackium: Hackium, launchOptions: PuppeteerLaunchOptions) => void;
  postLaunch?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => void;
  postBrowserInit?: (hackium: Hackium, browser: HackiumBrowser, finalLaunchOptions: PuppeteerLaunchOptions) => void;
}
```
