# Hackium

Hackium is a CLI tool, a browser, and a platform for analyzing and manipulating web sites.

## Hackium vs Puppeteer?

[Puppeteer][1] is an automation framework aimed at developers who need to automate and test the web headlessly. Hackium exposes Puppeteer's automation framework to an interactive version of Chromium and extends it with features aimed at web power users. Features that Puppeteer will not adopt for compatibility or maintenance reasons may find a home in Hackium.

Hackium started as Puppeteer scripts and will continue to directly rely on Puppeteer unless both project's focus diverge passed the point of code sharability.

### Core differences

- Hackium exposes access to [Chrome's Extension API](https://developer.chrome.com/extensions/api_index) via [`puppeteer-extensionbridge`](https://github.com/jsoverson/puppeteer-extensionbridge).
- Hackium simulates human behavior for mouse movement and keyboard events, vs moving in straight lines or typing rapidly all at once.
- Hackium prioritizes intercepting and transforming responses.
- Hackium includes a plugin framework to hook into the hackium lifecycle.
- Hackium injects an in-page client to extend functionality to pages and the console.
- Hackium is not meant to run headlessly. It can, but Chromium loses functionality when headless.
- Hackium includes a REPL to test and automate a live browser session.
- Puppeteer scripts can be used with Hackium with few to no changes, Hackium scripts can not be used by Puppeteer.
- and a lot more.

## Status

Experimental.

Hackium combines many disparate – sometimes experimental – APIs into one and as such, breaking changes can come from anywhere. Rather than limit public APIs to make it easier to stay backwards compatible, Hackium exposes as much as it can. You're in control. Backwards compatbility is a priority, but please consider the reality of depending on Hackium before building anything mission-critical.

## Installation

Install hackium globally with:

```bash
$ npm install -g hackium
```

> NOTE: NodeJS version 12.x or higher is required in order for you to be able to use Hackium.
>
> Using NodeJS version 10.x you'll be able to use the `hackium init ...` functionality of the CLI,
> but you won't able to run Hackium and its REPL.

You can install Hackium locally but every install downloads an additional Chromium installation so local installs should be avoided unless necessary.

## Using Hackium from node

Hackium can be used like [Puppeteer][1] from standard node.js scripts, e.g.

```js
const { Hackium } = require('hackium');

(async function main() {
  const hackium = new Hackium();
  const browser = await hackium.launch();
  //...
})();
```

## API

Hackium extends and overrides [Puppeteer] behavior regularly and a passing understanding of how to use Puppeteer is important for developer with Hackium. If you're only wiring together plugins or running a pre-configured project, you can skip the Puppeteer docs.

### Core dependencies

These projects or protocols provide valuable documentation that will help you get more out of Hackium

- [puppeteer][1] - provides browser automation API
- [puppeteer-extensionbridge] - provides access to the [Chrome Extension API](https://developer.chrome.com/extensions/api_index)
- [puppeteer-interceptor](https://github.com/jsoverson/puppeteer-interceptor) - interception API
- [Chrome Devtools API](https://chromedevtools.github.io/devtools-protocol/)

### Hackium Plugins

- [hackium-plugin-preserve-native](https://github.com/jsoverson/hackium-plugin-preserve-native) - preserves native browser API objects and methods before they can be overridden.
- [hackium-plugin-visiblecursor](https://github.com/jsoverson/hackium-plugin-visiblecursor) - fakes a cursor so automated mouse movements are visible.

### Related projects

These are projects built with Hackium and JavaScript interception in mind, though are separate on their own.

- [shift-refactor](https://github.com/jsoverson/shift-refactor) - JavaScript transformation library
- [refactor-plugin-common](https://github.com/jsoverson/refactor-plugin-common) - common transformation/deobfuscation methods
- [refactor-plugin-unsafe](https://github.com/jsoverson/refactor-plugin-unsafe) - experimental transformation methods
- [shift-interceptor](https://github.com/jsoverson/shift-interpreter) - experimental JavaScript meta-interpreter

### `Hackium`

Import the `Hackium` class and instantiate a `hackium` instance with the core options.

```js
const { Hackium } = require('hackium');

const hackium = new Hackium({
  plugins: [
    /* ... */
  ],
});
```

#### `.launch()`

Like [Puppeteer], `hackium.launch()` launches a Chrome instance and returns a `HackiumBrowser` instance. Refer to Puppeteer's [Browser] section for documentation.

#### `.cliBehavior()`

`hackium.cliBehavior()` runs through the Hackium configuration as if it was called via the command line. This is useful when migrating from a simple `hackium.config.js` to a node.js project.

Returns a browser instance. Refer to Puppeteer's [Browser] section for further documentation.

Example:

```js
const { Hackium } = require('hackium');

const hackium = new Hackium({
  plugins: [
    /* ... */
  ],
});

async function main() {
  const browser = await hackium.cliBehavior();
}
```

#### `.pause(options)`

Initializes a REPL and returns a promise that resolves only when `hackium.unpause()` (or `unpause()` in the REPL) is called. Use `pause()` with async/await to troubleshoot a script or to inject manual work into an automated process.

Options:

- `repl` : pass `false` to disable the REPL or an object to use as the REPL context.

Example:

```js
const { Hackium } = require('hackium');

const hackium = new Hackium();

async function main() {
  const browser = await hackium.launch();
  const [page] = await browser.pages();
  await hackium.pause({ repl: { page } });
}
```

#### `.startRepl(context)`

Initializes a REPL, adding the passed context to the REPL context. Will close an existing REPL if it is open.

Example:

```js
const { Hackium } = require('hackium');

const hackium = new Hackium();

async function main() {
  const browser = await hackium.launch();
  const [page] = await browser.pages();
  await hackium.startRepl({ page });
}
```

#### `.closeRepl()`

Closes a manually opened REPL.

### HackiumBrowser

HackiumBrowser extends Puppeteer's [Browser] and manages instrumentation of the browser.

#### `.extension`

Hackium Browser comes pre-configured with [puppeteer-extensionbridge] available via `browser.extension`. See [puppeteer-extensionbridge] for documentation.

#### `.clearSiteData(origin)`

Clears everything associated with the passed origin.

```js
const { Hackium } = require('hackium');

const hackium = new Hackium();

async function main() {
  const browser = await hackium.launch();
  await browser.clearSiteData('google.com');
}
```

### HackiumPage

HackiumPage extends Puppeteer's [Page] and manages instrumentation of each created page.

#### `.connection`

Each page has a Chrome DevTools Protocol session instantiated and accessible via `.connection`. See [Chrome Devtools Protocol](https://chromedevtools.github.io/devtools-protocol/) for documentation.

#### `.forceCacheEnabled(boolean)`

This bypasses Puppeteer's intelligent cache settings and sends a direct request to `Network.setCacheDisabled` with your argument.

#### `.mouse`

Hackium's mouse class overrides Puppeteer's mouse behavior to simulate human movement. This is transparent in usage but means that movement actions are not instantaneous. Refer to Puppeteer's [Mouse] section for further documentation.

#### `.mouse.idle()`

Generates idle mouse movement behavior like scrolling, moving, and clicking.

#### `.keyboard`

Like `mouse`, the Hackium keyboard class simulates human behavior by typing at a casual speed with varying intervals. Refer to Puppeteer's [Keyboard] section for documentation.

## Command line usage

Open hackium with the `hackium` command and Hackium will start the bundled Chromium.

```bash
$ hackium
```

### Interceptor modules

An interceptor module needs to expose two properties, `intercept` and `interceptor`. `intercept` is a list of request patterns to intercept and `interceptor` is a JavaScript function that is called on every request interception.

More information on request patterns can be found at [puppeteer-interceptor] and [Chrome Devtools Protocol#Fetch.RequestPattern](https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#type-RequestPattern)

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

## Plugin API

Plugins are plain JavaScript objects with properties named after Hackium lifecycle events. See [hackium-plugin-preserve-native](https://github.com/jsoverson/hackium-plugin-preserve-native) for an example of a plugin that injects JavaScript into the page to preserve native functions.

### Lifecycle methods

- `preInit` : called before a Hackium instance is initialized. Receives the `hackium` instance and the passed options.
- `postInit` : called after a Hackium instance is initialized. Receives the `hackium` instance and the final options.
- `preLaunch` : called before the browser is launched. Receives the `hackium` instance and the launch options.
- `postLaunch` : called after the browser is launched. Receives the `hackium` instance, `browser` instance, and final launch options.
- `postBrowserInit` : called after running browser initializing and instrumentation logic. Receives the `hackium` instance, `browser` instance, and final launch options.
- `prePageCreate` : called before a `Page` instance is created. Receives a `browser` instance.
- `postPageCreate` : called after a `Page` instance is created. Receives a `browser` instance and a `page` instance.

### Boilerplate plugin

```js
let plugin: Plugin = {
  preInit: function (hackium, options) {},
  postInit: function (hackium, options) {},
  preLaunch: function (hackium, launchOptions) {},
  postLaunch: function (hackium, browser, finalLaunchOptions) {},
  postBrowserInit: function (hackium, browser, finalLaunchOptions) {},
  prePageCreate: function (browser) {},
  postPageCreate: function (browser, page) {},
};

hackium = new Hackium({
  plugins: [plugin],
});
```

[1]: https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md
[browser]: https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md#class-browser
[mouse]: https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md#class-mouse
[keyboard]: https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md#class-keyboard
[page]: https://github.com/puppeteer/puppeteer/blob/v5.2.1/docs/api.md#class-Page
[puppeteer-extensionbridge]: https://github.com/jsoverson/puppeteer-extensionbridge
