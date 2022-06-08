const { exit } = require("process");

async function searchandremove(text,deletelabel) {
    /*let text = [
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'Task',
          metadata: {
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
          },
          spec: {
            params: [Array],
            stepTemplate: [Object],
            steps: [Array],
            volumes: [Array]
          }
        },
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'Task',
          metadata: {
            annotations: [Object],
            creationTimestamp: '2022-05-26T06:54:56Z',
            generation: 1,
            labels: {
                'app.kubernetes.io/instance': 'tools-tekton-resources',
                 version: '2.7.1',
                 ver: '21'
              },
            managedFields: [Array],
            name: 'ibm-build-tag-push-v2-7-1',
            namespace: 'tools',
            resourceVersion: '12240817',
            uid: '1164f138-bf1f-44df-9342-e241dd5eed42'
          },
          spec: {
            params: [Array],
            stepTemplate: [Object],
            steps: [Array],
            volumes: [Array]
          }
        },
        {
          apiVersion: 'tekton.dev/v1alpha1',
          kind: 'Task',
          metadata: {
            annotations: [Object],
            creationTimestamp: '2022-05-26T06:54:56Z',
            generation: 1,
            labels: {
                'app.kubernetes.io/instance': 'tools-tekton-resources',
                'argocd.argoproj.io/instance': 'tools-tekton',
                 version: '2.7.1'
              },
            managedFields: [Array],
            name: 'ibm-deploy-v2-7-1',
            namespace: 'tools',
            resourceVersion: '12240815',
            uid: '354c3629-3206-4d3d-8fda-983d466e2788'
          },
          spec: {
            params: [Array],
            results: [Array],
            stepTemplate: [Object],
            steps: [Array],
            volumes: [Array]
          }
        }];*/
        //var results = [];
        console.log("Test",text);
        //var searchField01 = "metadata";
        //var searchField02 = "labels";
        var labelkey01 = "app.kubernetes.io/instance";
        var labelkey02 = "argocd.argoproj.io/instance";
        //var deletelabel ="";
        console.log("length",text.length);
        for (var i=0 ; i < text.length ; i++)
        {
            console.log("I am reachable",text[i]);
            json = text[i].metadata.labels;
            console.log("Am I reachable",json);
            for (var key in json) {
                //console.log("key",labelkey01);
                if (json.hasOwnProperty(labelkey01)) {
                
                        console.log('match found!', json[labelkey01]); // do stuff here!
                        console.log('Found!', text[i].metadata.labels.labelkey01);
                        delete json[labelkey01];
                    }
                 if (json.hasOwnProperty(labelkey02)) {
                
                        console.log('match found!', json[labelkey02]); // do stuff here!
                        console.log('Found!', text[i].metadata.labels.labelkey01);
                        delete json[labelkey02];
                    }
                if(deletelabel != ""){
                    console.log("optional");
                    delete json[deletelabel];
                }

                }
                text[i].metadata.labels=json;  
            }
        console.log("----SemiFinale-----",text);
        console.log("----Finale-----",text[0].metadata.labels);
        console.log("----Finale-----",text[1].metadata.labels);
        console.log("----Finale-----",text[2].metadata.labels);
        }
        
