import { Plugin } from '../util/types';
import { mergeLaunchOptions, decorateBrowser } from 'puppeteer-extensionbridge';

export const hackiumExtensionBridge: Plugin = {
  preLaunch(hackium, launchOptions) {
    mergeLaunchOptions(launchOptions);
  },
  async postLaunch(hackium, browser, finalLaunchOptions) {
    await decorateBrowser(browser, { newtab: browser.newtab });
    browser.log.debug('initializing and decorating browser instance');
    let lastActive = { tabId: -1, windowId: -1 };
    await browser.extension.addListener('chrome.tabs.onActivated', async ({ tabId, windowId }) => {
      lastActive = { tabId, windowId };
      const code = `
          window.postMessage({owner:'hackium', name:'pageActivated', data:{tabId:${tabId}, windowId:${windowId}}});
        `;
      browser.log.debug(`chrome.tabs.onActivated triggered. Calling %o`, code);
      await browser.extension.send('chrome.tabs.executeScript', tabId, { code });
    });
    await browser.extension.addListener('chrome.tabs.onUpdated', async (tabId) => {
      if (tabId === lastActive.tabId) {
        const code = `
            window.postMessage({owner:'hackium', name:'pageActivated', data:{tabId:${tabId}}});
          `;
        browser.log.debug(`Active page updated. Calling %o`, code);
        await browser.extension.send('chrome.tabs.executeScript', tabId, { code });
      }
    });
  },
};
