import {searchAndRemove} from './searchandremove';
import {KubeMetadata} from "src/api/kubectl";
describe('searchandremove', () => {
  test('canary verifies test infrastructure', () => {
    expect(true).toEqual(true);
  });

  describe('given searchAndRemove()', () => {
    const value1 = 'app.kubernetes.io/instance';
    const value2 = 'argocd.argoproj.io/instance';
    const deletelabel = 'ver'
    describe('when jsonobject has label with'+ value1, () => {
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
      

      test('then return the jsonobject without label'+ value1, () => {
        const actualres:KubeMetadata=searchAndRemove(metadata);
        //expect(actualres.labels.hasOwnProperty(value1)).toEqual(false);
        expect(Object.keys(actualres.labels)).not.toContain(value1)
      });

      /*test('then return the jsonobject without label'+ value1, () => {
        expect(searchAndRemove(lines).hasOwnProperty(value1)).toEqual(false);
      });*/
    });
    describe('when jsonobject has label with'+ value2, () => {
      
      const lines = `{
        annotations: [Object],
        creationTimestamp: '2022-05-26T06:54:56Z',
        generation: 1,
        labels: {
            'app.kubernetes.io/instance': 'tools-tekton-resources',
            'argocd.argoproj.io/instance': 'tools-tekton',
             version: '2.7.1',
             ver: '2.1'
          },
        managedFields: [Array],
        name: 'ibm-build-tag-push-ace-bar-v2-7-1',
        namespace: 'tools',
        resourceVersion: '12240816',
        uid: 'c0966e94-38b9-4e43-aa27-01a5a58571da'
      }`;

      test('then return the jsonobject without label'+ value2, () => {
        expect(searchAndRemove(JSON.parse(lines)).hasOwnProperty(value2)).toEqual(false);
      });
      describe('when the optional deletelabel is empty string', () => {
        test('then return the jsonobject as it is', () => {
          expect(searchAndRemove(JSON.parse(lines),"")).toEqual(lines);
        });
      });
      describe('when the optional deletelabel is not empty string', () => {
        test('then return the jsonobject without label'+ deletelabel, () => {
          expect(searchAndRemove(JSON.parse(lines),deletelabel).hasOwnProperty(deletelabel)).toEqual(false);
        });
      });
      describe('when the optional deletelabel is undefined string', () => {
        test('then return the jsonobject as it is', () => {
          expect(searchAndRemove(JSON.parse(lines),undefined)).toEqual(lines);
        });
      });
  
      describe('when the optional deletelabel is null string', () => {
        test('then return the jsonobject as it is', () => {
          expect(searchAndRemove(JSON.parse(lines),null)).toEqual(lines);
        });
      });
    });
  });
});
