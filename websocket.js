window.addEventListener("DOMContentLoaded",main);
DCache = {}; // Memory cache
Me = {}; //My data

/*  --- Drawing States --- */
IsErasing = false; 
LastColor = "";
LastThickness = 0;
MouseInCanvas = true;
UserName = ""
PointerColor = "#1e90ff"

// Adds a pointer for a user
function addPointer(username, id) {
    document.getElementById("pointers").innerHTML+=`
    <div class="user-pointer ${(()=>{
        if (!DCache[id]["mouse-in-canvas"]) {return "nodisplay"}
        else {return ""} 
    })()}" id="pointer-${id}" style="background : ${DCache[id]["pointer-color"]}">
                    <div style="
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: ${DCache[id]["pen-color"]};
            padding: 4px;
            margin-right: 7px;
            border: 1px black solid;

            "></div> 
            <span>${username}</span>  
    </div>`;
}

//Download image data from drawing canvas
function downloadCanvas() {
    const link = document.createElement('a');
    link.download = 'canvas.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.9); // 90% quality
    link.click();
}

// Change a user pointer's color
function modifyPointerColor(pointerid,color) {
    document.getElementById(`${pointerid}`).firstElementChild.style.background = color;
}


// Move a users pointer
function movePointer(id,x,y) {
    let canvasRect = canvas.getBoundingClientRect();
    let userpointer = document.getElementById(`pointer-${id}`);
    userpointer.style.left = `${canvasRect.x+x +10}px`;
    userpointer.style.top = `${canvasRect.y+y -30}px`;
}

// Switch to a drawing pen
function switchToPen(ws) {
    if (!IsErasing) {return};
    IsErasing = false;
    // Setting back color and thickness to default
    Me["pen-thickness"] = LastThickness;
    Me["pen-color"] = LastColor;
    
    modifyPointerColor("mypointer",LastColor);
    document.querySelector("#color-input").value= LastColor;

    ws.send(JSON.stringify({action : "thickness-change", thickness : LastThickness}));
    ws.send(JSON.stringify({action : "color-change", color : LastColor}));

    //Ui : Setting back control buttons
    document.querySelector("#pen").classList.add("selected");
    document.querySelector("#eraser").classList.remove("selected");
    document.querySelector("#thickness-thick").removeAttribute("disabled")
    document.querySelector("#thickness-slim").removeAttribute("disabled")
    document.querySelector("#thickness-mid").removeAttribute("disabled")
    document.querySelector("#color").removeAttribute("disabled")
}

// Switch to a drawing pen
function switchToEraser(ws) {
    //saving color
    LastColor = Me["pen-color"];
    LastThickness = Me["pen-thickness"];
    if (IsErasing) {return}; // do nothing if already erasing

    IsErasing = true;
    Me["pen-thickness"] = 40;
    Me["pen-color"] = "#FFFFFF";
    
    // Setting color and thickness to erasing 
    modifyPointerColor("mypointer","#FFFFFF");
    document.querySelector("#color-input").value= "#FFFFFF";
    
    ws.send(JSON.stringify({action : "thickness-change", thickness : 40}));
    ws.send(JSON.stringify({action : "color-change", color : "#FFFFFF"}));

    //Disabling pen controls UI elements
    document.querySelector("#eraser").classList.add("selected");
    document.querySelector("#pen").classList.remove("selected");
    document.querySelector("#thickness-thick").setAttribute("disabled","")
    document.querySelector("#thickness-slim").setAttribute("disabled","")
    document.querySelector("#thickness-mid").setAttribute("disabled","")
    document.querySelector("#color").setAttribute("disabled","")
}

//Main code functionality 
function main() {
    let usernameinput = document.querySelector("#username-input")
    usernameinput.addEventListener("keyup", () => {
        document.getElementById("example-name").textContent = usernameinput.value;
        UserName = usernameinput.value;
    });
    usernameinput.addEventListener("change", () => {
    document.getElementById("example-name").textContent = usernameinput.value;
    UserName = usernameinput.value;
    });
    document.addEventListener("click",(ev)=>{
        //Switch color button
        if (ev.target.classList.contains("color-circle")) {
            document.querySelector("#example-pointer").style.background = ev.target.style.background
            PointerColor = ev.target.style.background;
        }
        //Join button
        else if (ev.target.classList.contains("join-btn")) {
                if (UserName == "") {return}
                const ws = new WebSocket("ws://91.185.189.19:57774"); //Online Server IP and OPEN port
                let connected = false;
                
                //Sign up packet
                ws.onopen = 
                    (ev)=>{
                        ws.send(JSON.stringify({
                            username: UserName,
                            "pointer-color" : PointerColor,
                            "mouse-in-canvas" : MouseInCanvas
                        }))
                    };
                

                //Handling messages
                ws.onmessage = 
                    (ev)=>{
                        let data = JSON.parse(ev.data);
                        //Connection accepted :
                        // 1 - Remove sign up page
                        // 2 - Recieve data from server
                        // 3 - Update canvas based on data
                        if (data["accepted"]) {
                            connected = true;
                            DCache = data["connections"];
                            Me = DCache[data["identity"]];
                            document.querySelector("#signupbox").classList.add("signup-fadeout");
                            document.querySelector("#eventscover").classList.add("signup-fadeout");
                            document.querySelector(`#signupbox`).addEventListener("animationend",()=>{
                                document.querySelector(`#signupbox`).remove()
                            })
                            document.querySelector(`#eventscover`).addEventListener("animationend",()=>{
                                document.querySelector(`#eventscover`).remove()
                            })

                            modifyPointerColor("mypointer",Me["pen-color"]);

                            document.querySelector("#mypointer").style.background = Me["pointer-color"];
                            document.querySelector("#color-input").value = Me["pen-color"];
                            document.querySelector("#mypointer").querySelector("span").textContent = Me["username"];
                            delete DCache[data["identity"]];
                            for (let id in DCache) {
                                addPointer(DCache[id]["username"],id)
                            }
                        };

                        //Handling server broadcasts and updating canvas accordingly 
                        if (data["action"]=="broadcast") {

                            if (data["data"]["action"] == "mousemove") {
                                movePointer(data["source"],data["data"]["x"],data["data"]["y"]);
                                if (DCache[data["source"]]["isdrawing"]) {
                                    ctx.beginPath();
                                    ctx.moveTo(DCache[data["source"]]["lastx"], DCache[data["source"]]["lasty"]);
                                    ctx.lineTo(data["data"]["x"], data["data"]["y"]);
                                    ctx.strokeStyle = DCache[data["source"]]["pen-color"]; // line color
                                    ctx.lineWidth = DCache[data["source"]]["pen-thickness"];         // line thickness
                                    ctx.lineCap = 'round';     // smooth edges
                                    ctx.stroke();    
                                };
                                DCache[data["source"]]["lastx"] = data["data"]["x"];
                                DCache[data["source"]]["lasty"] = data["data"]["y"];
                                

                            }
                            else if (data["data"]["action"] == "mousedown") {
                                DCache[data["source"]]["isdrawing"] = true;
                                DCache[data["source"]]["lastx"] = data["data"]["x"];
                                DCache[data["source"]]["lasty"] = data["data"]["y"];
                                ctx.beginPath();
                                ctx.moveTo(DCache[data["source"]]["lastx"], DCache[data["source"]]["lasty"]);
                                ctx.lineTo(DCache[data["source"]]["lastx"], DCache[data["source"]]["lasty"]);
                                ctx.strokeStyle = DCache[data["source"]]["pen-color"]; // line color
                                ctx.lineWidth = DCache[data["source"]]["pen-thickness"];         // line thickness
                                ctx.lineCap = 'round';     // smooth edges
                                ctx.stroke();       
                            }
                            else if (data["data"]["action"] == "mouseup") {
                                DCache[data["source"]]["isdrawing"] = false;
                            }
                            else if (data["data"]["action"] == "mouseenter") {
                                DCache[data["source"]]["mouse-in-canvas"] = true;
                                let pointer = document.querySelector(`#pointer-${data["source"]}`)
                                pointer.classList.remove("user-pointer");
                                pointer.classList.add("user-pointer");
                                pointer.classList.remove("nodisplay");
                                pointer.classList.remove("user-pointer-fadeout");
                            } 
                            else if (data["data"]["action"] == "mouseleave") {
                                DCache[data["source"]]["isdrawing"] = false;
                                DCache[data["source"]]["mouse-in-canvas"] = false;
                                let pointer = document.querySelector(`#pointer-${data["source"]}`)
                                pointer.classList.add("user-pointer-fadeout");
                                pointer.addEventListener("animationend", () => {
                                    if (!DCache[data["source"]]["mouse-in-canvas"]) {
                                        pointer.classList.add("nodisplay");
                                    }
                                }, { once: true });
                            }
                            else if (data["data"]["action"] == "user-join") {
                                
                                let user = data["data"]["user"];
                                if (user["id"] == Me["id"]) {
                                    return;
                                }
                                user["isdrawing"] = false;
                                user["lastx"] = 0;
                                user["lasty"] = 0;
                                DCache[user["id"]] = user;
                                addPointer(user["username"],user["id"])
                            }
                            else if (data[["data"]]["action"] == "user-left") {
                                
                                let pointer = document.querySelector(`#pointer-${data["data"]["id"]}`)
                                pointer.classList.add("user-pointer-fadeout");
                                pointer.addEventListener("animationend", () => {
                                    pointer.remove();
                                    delete DCache[data["data"]["id"]];
                                }, { once: true });
                            }
                            else if (data["data"]["action"] == "thickness-change") {
                                DCache[data["source"]]["pen-thickness"] = data["data"]["thickness"];
                            }
                            else if (data["data"]["action"] == "color-change") {
                                DCache[data["source"]]["pen-color"] = data["data"]["color"];
                                modifyPointerColor(`pointer-${data["source"]}`,data["data"]["color"]);
                            }
                            else if (data["data"]["action"] == "reset") {
                                ctx.fillStyle = "#ffffff";
                                ctx.fillRect(0, 0, canvas.width, canvas.height);
                            }
                        }
                        console.log(data);

                    };
                //Getting canvas's context
                const canvas = document.getElementById('canvas');
                const ctx = canvas.getContext('2d');

                function resizeCanvas() {
                    // Save current content
                    const oldWidth = canvas.width;
                    const oldHeight = canvas.height;
                    const imageData = ctx.getImageData(0, 0, oldWidth, oldHeight);

                    // Resize (this clears the canvas)
                    canvas.width = window.innerWidth;
                    canvas.height = window.innerHeight;
                    ctx.fillStyle = "#ffffff";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    // Redraw old stuff
                    ctx.putImageData(imageData, 0, 0);
                }
                window.addEventListener('resize', resizeCanvas);
                resizeCanvas();
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                let drawing = false;
                let lastX = -1;
                let lastY = -1;


                //Handling user input events, and updating to the server
                canvas.addEventListener('mousedown', (ev) => {
                    ws.send(JSON.stringify({action: "mousedown",x: ev.offsetX,y: ev.offsetY}))
                    drawing = true;
                    lastX = ev.offsetX;
                    lastY = ev.offsetY;
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(lastX, lastY);
                    ctx.strokeStyle = Me["pen-color"]; // line color
                    ctx.lineWidth = Me["pen-thickness"];         // line thickness
                    ctx.lineCap = 'round';     // smooth edges
                    ctx.stroke();  
                });

                // Stop drawing when mouse is released or leaves canvas
                canvas.addEventListener('mouseup', (ev) => {
                    ws.send(JSON.stringify({action: "mouseup",x: ev.offsetX,y: ev.offsetY}));
                    drawing = false;
                });

                canvas.addEventListener('mouseleave', (ev) => {
                    console.log("LEFT")
                    drawing = false;
                    MouseInCanvas =false;
                    mypointer.classList.add("user-pointer-fadeout");
                    mypointer.addEventListener("animationend", () => {
                        if (!MouseInCanvas) {
                            mypointer.classList.add("nodisplay");
                        }
                    }, { once: true });
                    ws.send(JSON.stringify({action: "mouseleave",x: ev.offsetX,y: ev.offsetY}));
                    
                });
                canvas.addEventListener('mouseenter', (ev) => {
                    console.log("ENTERED");
                    MouseInCanvas =true;
                    ws.send(JSON.stringify({action: "mouseenter",x: ev.offsetX,y: ev.offsetY}));
                    mypointer.classList.remove("user-pointer");
                    mypointer.classList.add("user-pointer");
                    mypointer.classList.remove("nodisplay");
                    mypointer.classList.remove("user-pointer-fadeout");
                });
                
                // Draw lines while mouse moves
                canvas.addEventListener('mousemove', (ev) => {
                    let canvasRect = canvas.getBoundingClientRect();
                    let mypointer = document.getElementById("mypointer");
                    mypointer.style.left = `${canvasRect.x+ev.x +10}px`;
                    mypointer.style.top = `${canvasRect.y+ev.y -30}px`;

                    ws.send(JSON.stringify({action: "mousemove",x: ev.offsetX,y: ev.offsetY}));
                    if (!drawing) return; // stop if not pressing

                    // Begin a path from the previous point to the current point
                    ctx.beginPath();
                    ctx.moveTo(lastX, lastY);
                    ctx.lineTo(ev.offsetX, ev.offsetY);
                    ctx.strokeStyle = Me["pen-color"]; // line color
                    ctx.lineWidth = Me["pen-thickness"];         // line thickness
                    ctx.lineCap = 'round';     // smooth edges
                    ctx.stroke();              // draw the line

                    // Update last position
                    lastX = ev.offsetX;
                    lastY = ev.offsetY;
                });

                //Handling control buttons 
                document.addEventListener("click",(ev)=>{
                    if (ev.target.id == "thickness-thick") {
                        document.querySelector(`#thickness-mid`).classList.remove("selected")
                        document.querySelector(`#thickness-slim`).classList.remove("selected")
                        document.querySelector(`#thickness-thick`).classList.add("selected")
                        if (IsErasing) {switchToPen(ws)};
                        Me["pen-thickness"] = 20;
                        ws.send(JSON.stringify({action : "thickness-change", thickness : 20}))
                        console.log("CHANGED TO THICK")
                    }
                    else if (ev.target.id == "thickness-mid") {
                        document.querySelector(`#thickness-thick`).classList.remove("selected")
                        document.querySelector(`#thickness-slim`).classList.remove("selected")
                        document.querySelector(`#thickness-mid`).classList.add("selected")
                        if (IsErasing) {switchToPen(ws)};
                        Me["pen-thickness"] = 15;
                        ws.send(JSON.stringify({action : "thickness-change", thickness : 15}))
                        console.log("CHANGED TO MID")
                    }
                    else if (ev.target.id == "thickness-slim") {
                        document.querySelector(`#thickness-thick`).classList.remove("selected")
                        document.querySelector(`#thickness-mid`).classList.remove("selected")
                        document.querySelector(`#thickness-slim`).classList.add("selected")
                        if (IsErasing) {switchToPen(ws)};
                        Me["pen-thickness"] = 10;
                        ws.send(JSON.stringify({action : "thickness-change", thickness : 10}))
                        console.log("CHANGED TO SLIM SHADY BEBE")
                    }
                     else if (ev.target.id == "color") {
                        document.getElementById("color-input").click()
                    }
                    else if (ev.target.id == "eraser") {
                        switchToEraser(ws);
                    }
                    else if (ev.target.id == "pen") {
                        switchToPen(ws);
                    }
                    else if (ev.target.id == "reset") {
                        ws.send(JSON.stringify({action : "reset"}));
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                    
                     else if (ev.target.id == "download") {
                        downloadCanvas()
                    }
                },true);
                //Handling color wheel input
                document.querySelector("#color-input").addEventListener("change",(ev)=>{
                    if (IsErasing) {switchToPen(ws)};
                    ws.send(JSON.stringify({action : "color-change", color : ev.target.value}))
                    modifyPointerColor("mypointer",ev.target.value)
                    Me["pen-color"] = ev.target.value
                    console.log("color changed to ",ev.target.value)
                });
        }
    },true)
 
}
