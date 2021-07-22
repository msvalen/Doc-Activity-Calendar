
function authenticate() {
    return gapi.auth2.getAuthInstance()
        .signIn({
            scope: "https://www.googleapis.com/auth/drive.activity.readonly https://www.googleapis.com/auth/drive.metadata.readonly",
            fetch_basic_profile:false 
        })
        .then(function() { console.log("Sign-in successful"); },
            function(err) { console.error("Error signing in", err); });
}

function loadClient() {
    //gapi.client.setApiKey(API_KEY);
    gapi.client.load("https://driveactivity.googleapis.com/$discovery/rest?version=v2");
    return gapi.client.load("https://content.googleapis.com/discovery/v1/apis/drive/v3/rest")
        .then(function() { 
            showbyid('finder');
            hidebyid('loginButt');
            showbyid('logoutButt');
            //console.log("GAPI client loaded for API"); 
        },
              function(err) { console.error("Error loading GAPI client for API", err); });
}
function load(){
    gapi.load("client:auth2", function() {
        gapi.auth2.init({
            client_id:"679594866988-p5mscfnsno9e5n5fp936btrq9gq61o6t.apps.googleusercontent.com",
            scope: 'openid',
            fetch_basic_profile: false
        });
    });
}
function logoutclient(){
    var auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut()
    auth2.disconnect().then(function () {
        hidebyid('logoutButt');
        showbyid('loginButt');
        //console.log('User signed out.');
    });
}

//DRIVE
function findfiles() {
    return gapi.client.drive.files.list({
        q: "mimeType='application/vnd.google-apps.document'"
    })
    .then(function(response) {
        // Handle the results here (response.result has the parsed body).
        showfiles(response);
        hidebyid('finder');
        hidebyid('FthStep');
        showbyid('TrdStep');
        //console.log("Response", response);
    },
    function(err) { console.error("Execute error", err); });
}

function showfiles(response){
    let div = document.querySelector('#doccontainer');
    let form = document.querySelector('form');
    div.innerHTML='';
    for(let file of response.result.files){      
        div.innerHTML+='<input type="checkbox" class="checkbox" name="documents[]" value="'+file.id+'" id="'+file.id+'"> <label for="'+file.id+'" class="checkbox"><i class="fas fa-file-alt"></i><br>'+file.name+'</label>';
    }
    let button=document.createElement('button');
    button.setAttribute('id','docpicker');
    button.setAttribute('type','submit');
    button.setAttribute('class','button')
    
    button.textContent = 'submit selected';
    const last = document.querySelector('form button:last-child');
    if(!last) {form.append(button);}
    form.addEventListener('submit',getfilesactivities);
}


//ACTIVITY
async function requestActivity(array){
    //console.log(window.startT.getTime());
    for(let file of array){
        //console.log(file);
        let i = 20;
        try{
            let response;
            let body= {
                itemName: "items/"+file,
                pageSize: 40,
                filter: "time > "+window.startT.getTime()+" AND time < "+window.endT.getTime()
                };
            do{                
                response = await  gapi.client.driveactivity.activity.query(body);
                activityProcessor(await response);
                body.pageToken = response.result.nextPageToken;
                i--;
            }
            while (response.result.nextPageToken && i>0);
        }catch(e){console.log(e);}
    }
   
}


function activityProcessor(obj){
    //console.log(obj);
    for(let activity of obj.result.activities){
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
    hidebyid('TrdStep');
    timearrayAddSpaces();
    dosvg();
    showbyid('FthStep');
    //console.log(window.timearray);
}

//FORM
function getfilesactivities(e){
    e.preventDefault();
    //console.log(e);
    
    window.endT = new Date(e.target.endT.value);
    window.startT = new Date(window.endT.getTime()-Number(e.target.period.value));
    window.timearray = [{date:window.endT.toLocaleDateString('en-SE'),count:0}];

    let finalarray = [];
    for(let input of e.target){
        if(input.checked){finalarray.push(input.value);}
    }
    if(!!finalarray[0]) requestActivity(finalarray).then(x => step2());
}

//EXTRA TIME ARRAY SVG
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

const months=['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Agu', 'Sep', 'Oct', 'Nov', 'Dic' ]

function dosvg(typeWeek=1,color1='#D5D8DC', color2='#5B2C6F'){
    let svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute('width','850');
    svg.setAttribute('height','160');
    let day=new Date(window.timearray[0].date).getDay()-typeWeek;
    if(day == -1) day=6;
    let week=1;
    for(let date of window.timearray){
        let color = color1;
       
        if(day%7==0 && date.date.split('-')[2]>=1&&date.date.split('-')[2]<=7 || day==0){
            svg.innerHTML +=`<text x=${15*(week)} y=15 class="meses">${months[date.date.split('-')[1]-1]}</text>`
        } 
        if(date.count>0) color = color2;
        svg.innerHTML += `<rect x="${15*(week)}" y="${15*(day%7)+18}" rx="2" ry="2" data-date="${date.date}" width="15" height="15" style="fill:${color};stroke:black;stroke-width:1;opacity:0.5"/>`;
        day++;
        if(day%7==0) week++;
        
    }
    svg.innerHTML += `<text x `
    const activity =document.getElementById('activity')
    activity.innerHTML='';
    activity.append(svg);
}

function hidebyid(id){
    document.getElementById(id).style.display = 'none';
}
function showbyid(id){
    document.getElementById(id).style.display = 'block';
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
 * normal work of the app:
 * at the start have a explanation with a gif of what would you get
 * It has a button that start the process
 * then it show the sign in
 *  then it shows the option for picking up the files from drive or the option from a document url
 * then it shows the dates range
 * submit
 * form disapears
 * maybe show a loading with an animation of the files
 * svg apears while color and style can be change dinamicaly by buttons
 * then is 
 * 
 * 
 * 
 */