import AppConfig from "./AppConfig";
import bodyParser from "body-parser";
import compression from "compression";
import express from "express";
import favicon from "serve-favicon";
import fs from "fs";
import Logger from "./utils/Logger";
import morgan from "morgan";
import path from "path";
import io from "socket.io";
import RoundRobinDispatcher from "./utils/RoundRobinDispatcher";


let session = require("express-session")({
  secret: "my-secret",
  resave: true,
  cookie: {
    // 3 hours
    maxAge: 3 * 60 * 60 * 1000
  },
  saveUninitialized: true
});
let sharedsession = require("express-socket.io-session");


const LOG_PREFIX = "ALEPH-SERVER: ";

class App {

  // ***********************************************
  // Constructors
  // ***********************************************
  /**
   * Initializes a new instance of the App object.
   *
   * @param {AppConfig} appConfig An AppConfig object (or subclass) containing configuration information.
   * @param {AuthenticatorConfig} authConfig An AuthenticatorConfig object (or subclass) containing configuration information.
   *
   * @return {void}
   */
  constructor(appConfig = AppConfig) {
    Logger.debug(LOG_PREFIX + "constructor()");
    Logger.info(LOG_PREFIX + "appConfig", appConfig);

    let app = express();
    this._express = app;
    this._server = null;
    this._appConfig = appConfig;

    // Disable header for security
    app.set("x-powered-by", false);

    app.use(compression());

    // Set up request logging
    app.use(morgan("combined"));
    app.use(session);

    // Views served by the server
    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "ejs");

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: false }));

    app.use("/api/checkLogin", function(req, res) {
      if (req.session.user) {
        return res.status(200).json({
          name: req.session.user.name,
          email: req.session.user.email,
          isMaster: req.session.user.isMaster,
          loggedIn: true
        });
      } else {
        return res.status(200).json({
          loggedIn: false
        });
      }
    });

    app.use("/api/login", function(req, res) {
      let email = req.body.email;
      let isMaster = false;
      if (email === process.env.MASTER_EMAIL) {
        isMaster = true;
      }
      req.session.user = {
        name: req.body.name,
        email: req.body.email,
        isMaster
      };
      return res.status(200).send({
        name: req.body.name,
        email: req.body.email,
        isMaster
      });
    });

    app.get("/ping", function(req, res) {
      return res.status(200).send("pong");
    });

    app.get("/", function(req, res) {
      res.sendFile(__dirname + "/index.html");
    });

    app.use((err, req, res, next) => {
      if(err) {
        Logger.error(LOG_PREFIX + "%s", err);

        res.status(500).send({});
      }
    });

    this.handleSockets = this.handleSockets.bind(this);
  }

  // ***********************************************
  // Public properties
  // ***********************************************
  /**
   * Gets the underlying Express instance.
   * @return {Express} The Express instance.
   */
  get express() {
    return this._express;
  }

  /**
   * Gets the underlying running Node server instance.
   *
   * @return {Server} A running Node http.Server instance, or null if not listening.
   */
  get server() {
    return this._server;
  }

  // ***********************************************
  // Public methods
  // ***********************************************
  /**
   * Starts the HTTP server.
   *
   * @return {void}
   */
  start() {
    this._server = this.express.listen(this._appConfig.publishPort, this._appConfig.publishHost, (err) => {
      if(err) {
        Logger.error(LOG_PREFIX, err);
      }
      Logger.info(LOG_PREFIX + "🌎  Listening on %s:%s", this._appConfig.publishHost, this._appConfig.publishPort);
    }).on("connection", (socket) => {
      // Set TCP timeout
      socket.setTimeout(240 * 1000);  
    });
    this.io = require("socket.io").listen(this._server);
    this.io.use(sharedsession(session));
    // Setup listeners
    this.io.sockets.on("connection", this.handleSockets);
  }

  handleSockets(socket) {
    // Emit a message to send it to the client.
    // socket.emit('ping', { msg: 'Hello. I know socket.io.' });

    // Print messages from the client.
    socket.on("triviaAnswer", (data) => {
      // Send it to master room
      let user = socket.handshake.session.user;
      this.io.to("master").emit("triviaResult", {
        name: user.name,
        time: Date.now() + data.time
      });
    });

    socket.on("userLogin", (user) => {
      // Set user session state
      if (user.isMaster) {
        // Join master room
        socket.join("master");
        // Send master specific data, e.g no of slave clients
      } else {
        socket.join("slave");
        // Let master clients know
        this.io.to("master").emit("slaveLogin", {
          clientId: socket.id,
          user
        });
      }
      socket.handshake.session.user = user;
    });

    socket.on("disconnect", () => {
      // If the socket belongs to a master user, send the information
      // to master
      let user = socket.handshake.session.user;
      if (user) {
        if (user.isMaster) {
          socket.leave("master");
          socket.dispatcher = null;
        } else {
          socket.leave("slave");
          this.io.to("master").emit("slaveLogout", {
            user
          });
        }
      }
    });

    // Slide changes
    socket.on("slideChange", (data) => {
      this.io.to("slave").emit("masterSlideChanged", data);
    });

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
      this.io.to("master").emit("clientMessage", data);
    });

    socket.on("clientMessageForward", (data) => {
      if (socket.dispatcher) {
        // Also pass the clientId through.
        socket.dispatcher.dispatch(socket, "clientMessage", data);
      }
    });

    socket.on("serverMessage", (data) => {
      // Send back to master so that its view can be updated
      this.io.to("master").emit("serverMessage", data);
    });

    socket.on("serverMessageForward", (data) => {
      socket.broadcast.to(data._clientId).emit("serverMessage", data);
    });
  }

  /**
   * Stops the HTTP server.
   *
   * @param {function} callback Optional callback. Called when asynchronous close has been completed.
   * @return {void}
   */
  stop(callback) {
    if(!this.server) {
      Logger.warn(LOG_PREFIX + "Stop requested and server was not started.");
    } else {
      this.server.close(() => { Logger.info(LOG_PREFIX + "Server stopped."); callback(); });
      this._server = null;
    }
  }
}

export default App;
