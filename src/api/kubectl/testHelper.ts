export function buildMockKubeClient() {
  const state = {};

  const buildNodeFunction = nodeFunctionBuilder(state);

  return withPluralKeyNames({
    api: withPluralKeyNames({
      v1: withPluralKeyNames({
        namespace: buildNodeFunction('namespace', {
          secret: buildNodeFunction('secret', {get: jest.fn()}, {post: jest.fn()}),
          pod: buildNodeFunction('secret', {get: jest.fn()}, {post: jest.fn()})
        }),
      }),
      extension: {
        v1beta1: withPluralKeyNames({
          namespace: buildNodeFunction('namespace', {
            ingress: buildNodeFunction('ingress', {get: jest.fn()}, {})
          }),
        })
      }
    }),
    _state: state,
  });
}

function nodeFunctionBuilder(state: any) {
  return (name: string, tempMockResult: any, mixin?: any): (arg: any) => any => {
    const mockResult = !mixin ? withPluralKeyNames(tempMockResult) : tempMockResult;

    return Object.assign((arg) => {
      if (arg) {
        state[name] = arg;
      }

      return mockResult;
    }, mixin);
  };
}

function withPluralKeyNames(tempObject: any) {
  const object = Object
    .keys(tempObject)
    .reduce((result, key) => {
      const value = tempObject[key];

      result[key] = value;
      if (withPluralKeyNames && !key.startsWith('_')) {
        if (key.endsWith('s')) {
          result[`${key}es`] = value;
        } else {
          result[`${key}s`] = value;
        }
      }

      return result;
    }, {});

  return object;
}
