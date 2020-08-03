(function (global, clientName) {
  const hackium = clientName in global ? global[clientName] : {};

  hackium.myInjection = () => {
    console.log('Hello world');
  };

  console.log('loaded my injection');
})(window, 'hackium');
