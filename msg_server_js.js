var WebSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');

var server = http.createServer(function(req, res) {
  fs.readFile('text_server_html.html', function(err, data) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
});
server.listen(8000, function() { console.log((new Date()) + " Server is listening on port "
      + 8000);});

// create the server
wsServer = new WebSocketServer({
  httpServer: server
});

var client_list = [];

var count = 0;

wsServer.on('request', function(request) {
	var connection = request.accept(null, request.origin);
  
	connection.on('message', function(msg){
		
		var message = JSON.parse(msg.utf8Data);	
		var conn_id = message.data.ID;	
		console.log("incoming message from " + conn_id);
		console.log(message);
		
		var sendError = function(id){
			connection.send(JSON.stringify({
				type: "conn error",
				data: {
					dest_client_ID: id,
				}
			}));
		}
		
		if (message.type == "name assignment" || message.data.ID == "null"){
			
			var name = message.data.name;
			var client_id = count + 255;
			count += 1;
			console.log(client_list.length);
			client_list.push([connection, name, client_id]);
			
			connection.send(JSON.stringify({
				type: "assignment",
				data: {
				  ID: client_id,
				  dest_client_ID: "null",
				  msg: "Welcome, " + message.data.name + "!"
				}
			}));
			
			for (var i = 0; i < client_list.length; i++) {
				client_list[i][0].send(JSON.stringify({
					type: "new client",
					data: {
						ID: client_id,
						dest_client_ID: client_list[i][2],
						identifier: name
					}
				}));
			}
			
		} else if (message.type == "client list request"){
			for (var j = 0; j < client_list.length; j++) {
				if (client_list[j][2] != conn_id){
					connection.send(JSON.stringify({
						type: "client list",
						data: {
							dest_client_ID: conn_id,
							list_client_ID: client_list[j][2],
							identifier: client_list[j][1]
						}
					}));
					console.log("sending client list to " + conn_id);
				}
			}
		} else if (message.type == "client msg request"){
			var sent = false;
			console.log("message request for " + message.data.dest_client_ID);
			for (var i = 0; i < client_list.length; i++){
				if (message.data.dest_client_ID == client_list[i][2]){
					client_list[i][0].send(JSON.stringify({
						type: "message request",
						data: {
							dest_client_ID: client_list[i][2],
							from_client_ID: message.data.ID,
							from_client_name: message.data.name
						}
					}));
					sent = true;
				}
			}
			if (!sent){
				for (var i = 0; i < client_list.length; i++){
					if (connection == client_list[i][0]){
						id = client_list[i][2];
						sendError(id);
						break
					}
				}
			}
		} else if (message.type == "accepting message request"){
			var sent = false;
			for (var i = 0; i < client_list.length; i++){
				if (client_list[i][2] == message.data.ID || client_list[i][2] == message.data.dest_client_ID){
					client_list[i][0].send(JSON.stringify({
						type: "initiate message client",
						data: {
							from_client_ID: message.data.ID,
							dest_client_ID: client_list[i][2]
						}
					}));
					if (client_list[i][2] == message.data.dest_client_ID){
						sent = true;
					}
				}
			} 
			if (!sent){
				for (var i = 0; i < client_list.length; i++){
					if (connection == client_list[i][0]){
						id = client_list[i][2];
						sendError(id);
						break
					}
				}
			}
		} else if (message.type == "denying message request"){
			for (var i = 0; i < client_list.length; i++){
				if (client_list[i][2] == message.data.dest_client_ID){
					client_list[i][0].send(JSON.stringify({
						type: "denied message client",
						data: {
							dest_client_ID: client_list[i][2]
						}
					}));
				}
			}
		} else if (message.type == "message for"){
			var sent = false;
			for (var i = 0; i < client_list.length; i++){
				if (client_list[i][2] == message.data.dest_client_ID){
					client_list[i][0].send(JSON.stringify({
						type: "message from",
						data: {
							dest_client_ID: client_list[i][2],
							msg: message.data.msg
						}
					}));
					sent = true;
				}
			}
			if (!sent){
				for (var i = 0; i < client_list.length; i++){
					if (connection == client_list[i][0]){
						id = client_list[i][2];
						sendError(id);
						break
					}
				}
			}
		} else if (message.type == "convo ended"){
			for (var i = 0; i < client_list.length; i++){
				if (client_list[i][2] == message.data.dest_client_ID){
					client_list[i][0].send(JSON.stringify({
						type: "convo ended",
						data: {
							dest_client_ID: client_list[i][2],
						}
					}));
				}
			}
		} 
	});
	
	connection.on('close', function(e){
		console.log("connection closed");
		var id;
		for (var i = 0; i < client_list.length; i++){
			if (connection == client_list[i][0]){
				id = client_list[i][2];
				client_list.splice(i, i + 1);
				break
			}
		}
		console.log(id + " a client has gone offline");
	});
});