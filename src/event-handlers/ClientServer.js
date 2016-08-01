import RoundRobinDispatcher from "../utils/RoundRobinDispatcher";

export default class ClientServerEventHandler {
  register(socket, io) {
    // Take this socket and add the server to a round robin dispatcher.
    socket.on("assignRole", (data) => {
      // Create a round robin dispatcher on the socket if it does not exist
      // Only master clients can do this
      let user = socket.handshake.session.user;
      if (user.isMaster && data.role === "server") {
        if (socket.dispatcher === undefined) {
          socket.dispatcher = new RoundRobinDispatcher();
        }
        socket.dispatcher.add(data.targetId);
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