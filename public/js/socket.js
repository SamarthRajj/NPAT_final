const socket = io();


socket.on("connect", () => {
  console.log("Connected to server with ID:", socket.id);
  document.getElementById("status").textContent = "Connected to server!";
});


socket.on("disconnect", () => {
  console.log("Disconnected from server");
  document.getElementById("status").textContent = "Disconnected from server";
});
