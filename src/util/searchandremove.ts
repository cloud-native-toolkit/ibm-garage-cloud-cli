import {KubeMetadata} from "src/api/kubectl";

export function searchAndRemove<T extends KubeMetadata>(text: T ,deletelabel?: string): T {
      console.log("Test",text);
      var labelkey01 = "app.kubernetes.io/instance";
      var labelkey02 = "argocd.argoproj.io/instance";
      
          var json: any = text.labels;
          console.log("Am I reachable",json);
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
      
