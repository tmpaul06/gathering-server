export default class RoleHandler {
  register(socket, io) {
    socket.on("assignRole", (data) => {
      let targetId = data.targetId;
      socket.broadcast.to(targetId).emit("roleAssignment", data);
    });

    socket.on("roleAck", (data) => {
      io.to("master").emit("roleAck", {
        target: socket.id,
        role: data.role
      });
    });
  }
};