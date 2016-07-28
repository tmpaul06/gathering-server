export default class MultipleChoiceHandler {
  register(socket, io) {
    socket.on("multipleChoiceAnswer", (data) => {
      let user = socket.handshake.session.user;
      // Broadcast to master
      io.to("master").emit("multipleChoiceAnswer", {
        name: user.name,
        time: Date.now() + data.time
      });
    });
  }
}