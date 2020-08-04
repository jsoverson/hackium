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

Hackium looks for `hackium.json` or `hackium.config.js` files in the current directory for configuration. Hackium merges or overrides configuration from the command line arguments. All command line options

## REPL

Hackium's REPL exposes the browser, page, and protocol instances for rapid prototyping.

### Additional REPL context:

- page: active page
- browser: browser instance
- cdp: chrome devtools protocol connection
- extension: chrome extension API bridge

## Hackium Scripts

Getting sh\*t done is the name of the game here, and the boilerplate around getting P

## Plugins
