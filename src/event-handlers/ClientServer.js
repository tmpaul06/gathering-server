import RoundRobinDispatcher from "../utils/RoundRobinDispatcher";

export default class ClientServerEventHandler {
  register(socket, io) {
    // client-server simulations
    socket.on("assignClient", (data) => {
      let user = socket.handshake.session.user;
      if (user.isMaster) {
        // Now emit a message to the target socket so that it can become a client.
        socket.broadcast.to(data.id).emit("clientAssignment", {});
      }
    });

    // Take this socket and add the server to a round robin dispatcher.
    socket.on("assignServer", (data) => {
      // Create a round robin dispatcher on the socket if it does not exist
      // Only master clients can do this
      let user = socket.handshake.session.user;
      if (user.isMaster) {
        if (socket.dispatcher === undefined) {
          socket.dispatcher = new RoundRobinDispatcher();
        }
        socket.dispatcher.add(data.id);
        // Now emit a message to the target socket so that it can become a server.
        socket.broadcast.to(data.id).emit("serverAssignment", {});
      }
    });

    // Message from client. Broadcast to master. Master will in turn forward
    // it to dispatcher which will eventually hit a server
    socket.on("clientMessage", (data) => {
      data._clientId = socket.id;
      io.to("master").emit("clientMessage", data);
    });

    socket.on("clientMessageForward", (data) => {
      if (socket.dispatcher) {
        // Also pass the clientId through.
        socket.dispatcher.dispatch(socket, "clientMessage", data);
      }
    });

    socket.on("serverMessage", (data) => {
      // Send back to master so that its view can be updated
      io.to("master").emit("serverMessage", data);
    });

    socket.on("serverMessageForward", (data) => {
      socket.broadcast.to(data._clientId).emit("serverMessage", data);
    });
  }
}