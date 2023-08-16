import http from "http";
import five from "johnny-five";
import { Server } from "socket.io";

const PORT = 4444;
const server = http.createServer();
const io = new Server(server, { cors: { origin: "*" } });
const board = new five.Board({ port: "COM5", repl: false });

let isOn = false;
io.on("connection", (socket) => {
  io.emit("led", isOn);
  console.log("user connected");

  if (board.isReady) {
    const led = new five.Led(13);
    const button = new five.Button({
      pin:7,
    isPullup: true
    });

    socket.on("ledOn", () => {
      isOn = true;
      led.on();

      io.emit("led", isOn);
    });

    socket.on("ledOff", () => {
      isOn = false;
      led.off();

      io.emit("led", isOn);
    });

    button.on('press', () => {
      // Envía el mensaje al cliente cuando se presiona el botón
      io.emit('buttonPressed', '¡El botón ha sido presionado!');
    });
  
    button.on('release', () => {
      // Envía el mensaje al cliente cuando se suelta el botón
      io.emit('buttonReleased', 'El botón ha sido soltado');
    });
  } 
});

server.listen(PORT, () => {
  console.log("server corriendo en el poerto ${PORT}");
});
