# Real-Time-Whiteboard
Real-time Collaborative Drawing Board built with WebSockets. Users can draw together on a shared canvas, see each other’s cursors, change colors/thickness, erase, reset, and download the final image. The server synchronizes all actions instantly for a smooth multi-user experience.


# Project Overview

This project is a real‑time collaborative drawing board. Multiple users
join through the browser and draw on a shared canvas, with all actions
synced instantly through a WebSocket server.

## High-Level Structure

### 1. **Frontend (HTML + JS)**

The frontend handles: - Rendering the drawing canvas. - Tracking the
mouse actions of the user (move, down, up, enter, leave). - Displaying
each user's pointer and name. - Sending all drawing events to the server
via WebSocket. - Receiving and applying updates from other connected
users. - Managing UI controls such as thickness, color, eraser, reset,
and download.

### 2. **WebSocket Server (Python)**

The backend: - Accepts and manages WebSocket connections. - Assigns each
client an ID and stores basic user state (color, thickness, pointer
color, etc.). - Broadcasts any user action (mousemove, drawing, color
change, etc.) to all other clients. - Notifies users when someone joins
or leaves. - Keeps the system real‑time by pushing updates instantly.

### 3. **HTTP Server**

A simple built‑in web server serves the static frontend files: - HTML -
CSS - JavaScript - Images (signup image, icons, etc.)

The WebSocket server and HTTP server run in parallel.

------------------------------------------------------------------------

## Workflow Summary

### **1. Client opens the page**

The HTTP server sends the HTML/JS files.\
User enters a username and pointer color.

### **2. Client connects via WebSocket**

Immediately after pressing **Join**, the browser: - Opens a WebSocket
connection. - Sends an initial packet to identify the user.

Server replies with: - Confirmation - Assigned user ID - A list of all
currently connected users

The client then removes the signup UI and prepares the canvas.

### **3. Real-time action loop**

Once connected: - Every local action (mouse move, click, color change,
etc.) is sent to the server. - The server relays the event to all other
clients. - Each client updates its canvas and UI accordingly.

This creates a synchronized shared drawing environment.

### **4. User leaving**

When a client disconnects: - The server removes their entry - Broadcasts
a "user-left" event - Other clients remove the user's pointer

------------------------------------------------------------------------

## Core Concept

Everything revolves around **state synchronization**: - Each client
maintains a lightweight cache of every user. - The server doesn't store
drawing data; it only relays real‑time events. - The canvas itself is
fully client-side; the server doesn't render or log pixels.

This keeps the system fast, lightweight, and scalable.
