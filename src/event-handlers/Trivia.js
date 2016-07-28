export default class TriviaHandler {
  register(socket, io) {
    socket.on("triviaAnswer", (data) => {
      // Send it to master room
      let user = socket.handshake.session.user;
      io.to("master").emit("triviaResult", {
        name: user.name,
        time: Date.now() + data.time
      });
    });
  }
}