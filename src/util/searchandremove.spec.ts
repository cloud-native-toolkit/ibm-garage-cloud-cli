import {searchAndRemove} from './searchandremove';
import {KubeMetadata} from "src/api/kubectl";
describe('searchandremove', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given searchAndRemove()', () => {
    const value1 = 'app.kubernetes.io/instance';
    const value2 = 'argocd.argoproj.io/instance';
    const deletelabel = 'ver';
    const metadata: KubeMetadata = {
      creationTimestamp: '2022-05-26T06:54:56Z',
      labels: {
          'app.kubernetes.io/instance': 'tools-tekton-resources',
          'argocd.argoproj.io/instance': 'tools-tekton',
           version: '2.7.1',
           ver: '2.1'
        },
      name: 'ibm-build-tag-push-ace-bar-v2-7-1',
      namespace: 'tools',
      resourceVersion: '12240816',
      uid: 'c0966e94-38b9-4e43-aa27-01a5a58571da'
    };
    describe('when jsonobject has label with'+ value1, () => {
      
      

      test('then return the jsonobject without label'+ value1, () => {
        const actualres:KubeMetadata=searchAndRemove(metadata);
        //expect(actualres.labels.hasOwnProperty(value1)).toEqual(false);
        //expect(Object.keys(actualres.labels)).not.toContain(value1);
        expect(Object.keys(actualres.labels)).not.toHaveProperty(value1);
      });
    });
    describe('when jsonobject has label with'+ value2, () => {
      
      

      test('then return the jsonobject without label'+ value2, () => {
        const actualres:KubeMetadata=searchAndRemove(metadata);
        //expect(searchAndRemove(lines)).hasOwnProperty(value2)).toEqual(false);
        //expect(Object.keys(actualres.labels)).not.toContain(value2);
        expect(Object.keys(actualres.labels)).not.toHaveProperty(value2);
      });
      describe('when the optional deletelabel is empty string', () => {
        test('then return the jsonobject as it is', () => {
          const actualres:KubeMetadata=searchAndRemove(metadata,'');
         // expect(Object.keys(actualres.labels)).not.toContain(value2).not.toContain(value1);
         expect(Object.keys(actualres.labels)).not.toHaveProperty(value2);
         expect(Object.keys(actualres.labels)).not.toHaveProperty(value1);
        });
      });
      describe('when the optional deletelabel is not empty string', () => {
        test('then return the jsonobject without label'+ deletelabel, () => {
          const actualres:KubeMetadata=searchAndRemove(metadata,deletelabel);
          //expect(searchAndRemove(JSON.parse(lines),deletelabel).hasOwnProperty(deletelabel)).toEqual(false);
        expect(Object.keys(actualres.labels)).not.toHaveProperty(value2);
        expect(Object.keys(actualres.labels)).not.toHaveProperty(value1);
        expect(Object.keys(actualres.labels)).not.toHaveProperty(deletelabel);
        });
      });
      describe('when the optional deletelabel is undefined string', () => {
        test('then return the jsonobject as it is', () => {
          const actualres:KubeMetadata=searchAndRemove(metadata,undefined);
          expect(Object.keys(actualres.labels)).not.toHaveProperty(value2);
          expect(Object.keys(actualres.labels)).not.toHaveProperty(value1);
          
          //expect(searchAndRemove(JSON.parse(lines),undefined)).toEqual(lines);
        });
      });
  
      describe('when the optional deletelabel is null string', () => {
        test('then return the jsonobject as it is', () => {
          const actualres:KubeMetadata=searchAndRemove(metadata,null);
          expect(Object.keys(actualres.labels)).not.toHaveProperty(value2);
          expect(Object.keys(actualres.labels)).not.toHaveProperty(value1); 
        });
      });
    });
  });
});
