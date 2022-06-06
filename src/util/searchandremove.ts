//const { exit } = require("process");

//import { KubeBody, } from "puppeteer";
//import { KubeBackend } from "src/api/kubectl";
import {KubeBody,KubeResource,KubeMetadata} from "src/api/kubectl";

//import { JSONObject } from "puppeteer";


export function searchAndRemove<T extends KubeMetadata>(text: T ,deletelabel?: string): T {
      console.log("Test",text);
      var labelkey01 = "app.kubernetes.io/instance";
      var labelkey02 = "argocd.argoproj.io/instance";
      
          var json: any = text.labels;
          console.log("Am I reachable",json);
          for (var key in json) {
            //if(json.hasOwnProperty("labels")){
              
              if (json.hasOwnProperty(labelkey01)) {
              
                      console.log('match found!', json[labelkey01]); // do stuff here!
                      
                      delete json.labels[labelkey01];
                      console.log("blah1",json.labels);
                  }
               if (json.hasOwnProperty(labelkey02)) {
              
                      console.log('match found!', json[labelkey02]); // do stuff here!
                      delete json.labels[labelkey01];
                      console.log("blah2",json.labels);
                  }
              if(deletelabel != ""){
                  console.log("optional");
                  delete json[labelkey01];
                  console.log("blah3",json.labels);
              }
            }
             // }
             text.labels=json;
              
              
          
      console.log("----SemiFinale-----",text);
      console.log("----Finale-----",json);
      /*const x = {
        name: text.name,
        namespace: text.namespace,
        labels: json,
        annotations: text.annotations,
        uid: text.uid,
       selfLink: text.selfLink,
       resourceVersion: text.resourceVersion,
       creationTimestamp: text.creationTimestamp
      } as KubeMetadata;*/
      //declare const x : IModal;
      //x.name = text.name;
//console.log("Check",x);
      return text;
      //console.log("----Finale-----",text[1].metadata.labels);
      //console.log("----Finale-----",text[2].metadata.labels);
      }
      
