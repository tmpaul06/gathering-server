import { randomQuote } from "../utils/Quotes";

export default class ChatHandler {
  register(socket, io) {
    socket.on("botChat", () => {
      let quote = randomQuote();
      socket.emit("botReply", quote);
    });
  }
};