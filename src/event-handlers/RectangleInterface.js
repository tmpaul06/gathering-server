export default class RectangleInterface {
  register(socket, io) {
    socket.on("moveRectangle", (data) => {
      io.to("master").emit("moveRectangle", data);
    });
    socket.on("rotateRectangle", (data) => {
      io.to("master").emit("rotateRectangle", data);
    });
  }
};