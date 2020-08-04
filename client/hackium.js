// @ts-nocheck
(function (global, clientId) {
  function log(...args) {
    console.log(...args);
  }

  const eventHandlerName = '%%%clienteventhandler%%%';

  const client = {
    version: '%%%HACKIUM_VERSION%%%',
    log,
    postMessage(name, data) {
      window.postMessage({ owner: clientId, name, data });
    },
    eventBridge: {
      send: (name, data) => {
        const handler = global[eventHandlerName];
        if (!handler || typeof handler !== 'function') throw new Error(`${name} client event handler not a function`);
        handler({
          owner: clientId,
          name,
          data,
        });
      },
    },
    init() {
      client.postMessage('clientLoaded');
      log(`loaded ${clientId} client`);
    },
  };

  if (typeof global[clientId] === 'object') {
    log(`merging ${clientId} client with existing configuration`);
    global[clientId] = Object.assign(client, global[clientId]);
  } else {
    global[clientId] = client;
  }

  window.addEventListener('message', (evt) => {
    if (evt.data.owner !== 'hackium') return;
    const handler = window[eventHandlerName];
    if (handler && typeof handler === 'function') handler(evt.data);
  });

  if (window === window.parent) client.init();
})(window, '%%%clientid%%%');
