import { assert } from "console";
import { SafeMap } from "./util/SafeMap";

export const strings = new SafeMap([
  ["clientid", "hackium"],
  ["clienteventhandler", "__hackium_internal_onEvent"],
  ["extensionid", require('puppeteer-extensionbridge/extension/manifest.json').key]
])
