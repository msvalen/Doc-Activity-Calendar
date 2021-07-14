require('dotenv').config();

const CLIENT_ID = pocess.env.CLIENT_ID ;
const  API_KEY = process.env.API_KEY;
/**
        * Sample JavaScript code for driveactivity.activity.query
        * See instructions for running APIs Explorer code samples locally:
        * https://developers.google.com/explorer-help/guides/code_samples#javascript
        */

 function authenticate() {
    return gapi.auth2.getAuthInstance()
        .signIn({scope: "https://www.googleapis.com/auth/drive.activity https://www.googleapis.com/auth/drive.activity.readonly https://www.googleapis.com/auth/drive.readonly"})
        .then(function() { console.log("Sign-in successful"); },
            function(err) { console.error("Error signing in", err); });
}
function loadClient() {
    gapi.client.setApiKey(API_KEY);
    gapi.client.load("https://driveactivity.googleapis.com/$discovery/rest?version=v2");
    return gapi.client.load("https://content.googleapis.com/discovery/v1/apis/drive/v3/rest")
        .then(function() { console.log("GAPI client loaded for API"); },
              function(err) { console.error("Error loading GAPI client for API", err); });
  }

// Make sure the client is loaded and sign-in is complete before calling this method.
function execute() {
    return gapi.client.driveactivity.activity.query({
    "resource": {}
    })
        .then(function(response) {
                // Handle the results here (response.result has the parsed body).
                console.log("Response", response);
            },
            function(err) { console.error("Execute error", err); });
}
function findfiles() {
    return gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.document'"
    })
    .then(function(response) {
        // Handle the results here (response.result has the parsed body).
        showfiles(response);
        console.log("Response", response);
    },
    function(err) { console.error("Execute error", err); });
}
gapi.load("client:auth2", function() {
    gapi.auth2.init({client_id: CLIENT_ID});
});

function showfiles(response){
    let div = document.querySelector('#doccontainer');
    let form = document.querySelector('form');
    
    for(file of response.result.files){      
        div.innerHTML+='<div><input type="checkbox" name="documents[]" value="'+file.id+'" <label><i class="fas fa-file-alt"></i>'+file.name+'</label></div>';
    }
    let button=document.createElement('button');
    button.setAttribute('id','docpicker');
    button.setAttribute('type','submit');
    
    button.textContent = 'submit selected';
    form.append(button);
    form.addEventListener('submit',getfilesactivities);
}


function getfilesactivities(e){
    e.preventDefault();
    console.log(e);
    window.startT = new Date(e.target.startT.value);
    window.endT = new Date(e.target.endT.value);
    window.timearray = [{date:window.endT.toLocaleDateString('en-SE'),count:0}];

    let finalarray = [];
    for(input of e.target){
        if(input.checked){finalarray.push(input.value)};
    }
   
    requestActivity(finalarray).then(x => step2());
}


async function requestActivity(array){
    console.log(window.startT.getTime());
    for(file of array){
        console.log(file);
        let i = 20;
        try{
            let response;
            let body= {
                itemName: "items/"+file,
                pageSize: 40,
                filter: "time > "+window.startT.getTime()+" AND time < "+window.endT.getTime()
                }
            do{                
                response = await  gapi.client.driveactivity.activity.query(body);
                activityProcessor(await response);
                body.pageToken = response.result.nextPageToken;
                i--;
            }
            while (response.result.nextPageToken && i>0);
        }catch(e){console.log(e)}
    }
   
}

function activityProcessor(obj){
    console.log(obj);
    for(activity of obj.result.activities){
        if(activity.actors[0].user.knownUser.isCurrentUser){
            let now = new Date(activity.timestamp).toLocaleDateString('en-SE');
            let position = window.timearray.findIndex(x=> x.date == now);
            if(position>=0) window.timearray[position].count++;
            else window.timearray.push({ date:now, count:1});
        }
    }
}

function step2(){
    window.timearray.sort(function(x,y){
        if(x.date > y.date) return -1;
        else if(y.date > x.date) return 1;
        else return 0;
    });
    let now = window.startT.toLocaleDateString('en-SE');
    if(window.timearray[window.timearray.length-1].date == now){
        window.timearray[window.timearray.length-1].count++;
    }
    else window.timearray.push({date:now, count:0});
    timearrayAddSpaces();
    dosvg();
    console.log(window.timearray);
}

function timearrayAddSpaces(){
    let like=[];
    for(let i=window.timearray.length-1; i>0;i--){
        let dateA=window.timearray[i];
        let dateB=window.timearray[i-1];
        like.push(dateA);
         
        let days = (new Date(dateB.date).getTime()-new Date(dateA.date).getTime())/(1000*60*60*24);
        let temp = new Date(dateA.date).getTime();
        while(days>1){
            temp = temp + (1000*60*60*24);
            like.push({date: new Date(temp).toLocaleDateString('en-SE'), count: 0});
            days--;
        }
    }
    window.timearray = like;
}

function dosvg(){
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width','850');
    svg.setAttribute('height','160');
    let day=new Date(window.timearray[0].date).getDay();
    let week=1
    for(date of window.timearray){
        let color = '#D5D8DC';
        if(date.count>0) color = '#5B2C6F';
        svg.innerHTML+= `<rect x="${15*(week)}" y="${15*(day%7)}" rx="2" ry="2" data-date="${date.date}" width="15" height="15" style="fill:${color};stroke:black;stroke-width:1;opacity:0.5"/>`;
        day++;
        if(day%7==0) week++;
    }
    document.getElementById('activity').append(svg);
}

/*** TODO
 * [x] - create a checkbox unput for the documents to check
 * [X] - time range input 
 * [X] - do a function that save in a sum all the activities by time range array updateTimeArray
 * [x] - create a function that get all the activities, even the ones in the extension page
 * [ ] - change the formulary to make sure that things happens in order (login -> fin files -> put dates - select files -> submit form)
 * [ ] - maybe clean this into cute litle files
 * [ ] - estructure this to a public version
 * [ ] - 
 * 
 * 
 * 
 * 
 */