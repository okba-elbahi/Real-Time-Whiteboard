import asyncio
import json
import websockets
import struct
import random
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from threading import Thread
connections = {}   # For saving user data in ram



#--------------------------- HTTP SERVER ---------------------------
#-------------------------------------------------------------------

#Http request handler
class Handler(BaseHTTPRequestHandler) : 
    def do_GET(self) :
        self.send_response(200)
        self.end_headers()
        try :
            filec = open("."+self.path,"rb").read()
        except :
            print("err finding file", self.path)
            return
        self.wfile.write(filec)

server = ThreadingHTTPServer(("0.0.0.0",50501),Handler)



#------------------------- WEB SOCKET UTILS ------------------------
#-------------------------------------------------------------------

#recieve a json packet
async def recv_packet(ws):
    header = await ws.recv()           
    packet = json.loads(header)
    return packet


#send a json packet 
async def send_packet(ws, packet):
    body = json.dumps(packet)
    await ws.send(body)


#broadcast a message to all users without blocking 
async def broadcast(source, packet, except_source=False):
    msg = {
        "action": "broadcast",
        "source": source if source == "server" else source["id"],
        "data": packet
    }

    tasks = []

    for client in list(connections.keys()):
        if source != "server": 
            if connections[client]["id"] == source["id"]:
                continue

        tasks.append(send_packet(client, msg))

    # Broadcast to all users concurrently without waiting for slow ones
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


#--------------------------- USER HANDLER --------------------------
#-------------------------------------------------------------------

async def handler(ws):
    # 1) First packet MUST contain username
    hello = await recv_packet(ws)
    username = hello["username"]

    #default settings
    client_info = {
        "username": username,
        "id" : random.randint(111111111,999999999),
        "ip": ws.remote_address[0],
        "pen-color" : "#ff4b4b",
        "pen-thickness" : 10,
        "mouse-in-canvas" : hello["mouse-in-canvas"],
        "pointer-color" : hello["pointer-color"]
    }

    connections[ws] = client_info


    #Accepted :
    await send_packet(ws, {"accepted": True, "message": "Welcome","identity" : client_info["id"],"connections" : {connections[x]["id"]:connections[x] for x in connections}})

    print("Client joined:", client_info)

    #Notify Users :
    await broadcast("server", {
        "action": "user-join",
        "user" : client_info
    },True)

    #Recieve packets from user loop :
    try:
        while True:
            data = await recv_packet(ws)
            print("recieved : ",data)
            if data["action"] == "mouseleave" :
                connections[ws]["mouse-in-canvas"] = False 
            if data["action"] == "mouseenter" : 
                connections[ws]["mouse-in-canvas"] = True
            if data["action"] == "color-change" :
                connections[ws]["pen-color"]= data["color"]
            if data["action"] == "thickness-change" :
                connections[ws]["pen-thickness"] = data["thickness"]
            await broadcast(client_info, data,True)

    except Exception as e:
        print(e)
        print("Client left:", client_info)

    #Connection lost, Ended  :
    finally:
        del connections[ws]
        await broadcast("server", {
            "action": "user-left",
            "ip": client_info["ip"],
            "id" : client_info["id"],
            "username" : client_info["username"]
        },True)



#------------------------- STARTING SERVERS ------------------------
#-------------------------------------------------------------------


#Starting Websocket server handler, handling each user in a separate thread
async def main():
    print("WebSocket server starting on ws://91.185.189.19:57774")
    async with websockets.serve(handler, "0.0.0.0", 57774):
        await asyncio.Future()  # run forever

#Running Threading http server in a different Thread
def runHTTP() :
    server.serve_forever()

#starting the http server
httpthread = Thread(target=runHTTP)
httpthread.start()

asyncio.run(main())


