import {KubeMetadata} from "src/api/kubectl";

//This function searches for app.kubernetes.io/instance and argocd.argoproj.io/instance labels by default in metadata and removes them. It also has an optional deletelabel input.
//When value is passed to deletelabel, it also deletes deletelabel label from metadata other than app.kubernetes.io/instance and argocd.argoproj.io/instance labels. 
export function searchAndRemove<T extends KubeMetadata>(text: T ,deletelabel?: string): T {
      console.log("Test",text);
      var labelkey01 = "app.kubernetes.io/instance";
      var labelkey02 = "argocd.argoproj.io/instance";
      
          var json: any = text.labels;
          //console.log("Am I reachable",json);
          for (var key in json) {
              if (json.hasOwnProperty(labelkey01)) {
              
                      //console.log('match found!', json[labelkey01]); // do stuff here!
                      
                      delete json[labelkey01];
                      
                  }
               if (json.hasOwnProperty(labelkey02)) {
              
                      //console.log('match found!', json[labelkey02]); // do stuff here!
                      delete json[labelkey02];
                      
                  }
              if(deletelabel != ""){
                  //console.log("optional");
                  delete json[deletelabel];
                  
              }
            }
             text.labels=json;
              
              
          
      //console.log("----SemiFinale-----",text);
      //console.log("----Finale-----",json);
      
      return text;
      }
      
