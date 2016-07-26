export default class RoundRobinDispatcher {
  constructor() {
    this.targets = [];
    this.targetIndex = 0;
  }
  dispatch(socket, eventName, data) {
    let i = this.targetIndex;
    if (i >= this.targets.length) {
      i = 0;
    }
    socket.broadcast.to(this.targets[i]).emit(eventName, data);
    this.targetIndex++;
  }
  add(targetId) {
    // Run over each target and make sure that there is no
    // duplicate
    let found = this.targets.indexOf(targetId) !== -1;
    if (!found) {
      this.targets.push(targetId);
    }
  }
  remove(targetId) {
    // Remove the target if it exists
    let index = this.targets.indexOf(targetId);
    if (index !== -1) {
      this.targets.splice(index, 1);
    }
  }
}