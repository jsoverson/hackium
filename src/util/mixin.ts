

export function mixin<BaseType, PseudoClass>(baseObj: BaseType, mixinObject: PseudoClass): BaseType & PseudoClass {

  const typedObj = Object.assign(baseObj, mixinObject) as PseudoClass & BaseType;

  const prototype = Object.getPrototypeOf(mixinObject);
  const props = Object.getOwnPropertyDescriptors(prototype);
  Object
    .entries(props)
    .filter(([prop]) => prop !== 'constructor')
    .forEach(entry => {
      const prop = entry[0] as keyof BaseType;
      const descriptor = entry[1] as any;
      if (!(prop in baseObj)) {
        Object.defineProperty(baseObj, prop, descriptor)
      }
    });

  return typedObj;
}