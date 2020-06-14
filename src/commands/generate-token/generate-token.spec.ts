import {Container} from 'typescript-ioc';
import {GenerateToken} from './generate-token.api';

describe('generate-token', () => {

  let classUnderTest: GenerateToken;
  beforeEach(() => {
    classUnderTest = Container.get(GenerateToken);
  });

  test('classUnderTest should be defined', () => {
    expect(classUnderTest).not.toBeUndefined();
  });
});
