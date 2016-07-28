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
import EventHandlers from "./event-handlers";


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
    this.clients = {};

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

    app.use("/api/checkLogin", (req, res) => {
      if (req.session.user) {
        return res.status(200).json({
          name: req.session.user.name,
          email: req.session.user.email,
          isMaster: req.session.user.isMaster,
          masterState: this.masterState,
          clients: req.session.user.isMaster ? this.clients : undefined,
          loggedIn: true
        });
      } else {
        return res.status(200).json({
          loggedIn: false
        });
      }
    });

    app.use("/api/login", (req, res) => {
      let email = req.body.email;
      let isMaster = false;
      if (email === process.env.MASTER_EMAIL) {
        isMaster = true;
        // Master logins in again, then set master
        // state to null.
        this.masterState = null;
      }
      req.session.user = {
        name: req.body.name,
        email: req.body.email,
        isMaster
      };
      return res.status(200).send({
        name: req.body.name,
        email: req.body.email,
        clients: isMaster ? this.clients : undefined,
        masterState: this.masterState,
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
    // The server will maintain the list of active connections and send
    // that to the master if master reloads page or logs in again from
    // a new machine
    Object.keys(EventHandlers).map((k) => {
      let handler = new EventHandlers[k]();
      handler.register(socket, this.io);
    });
    // Handle user login
    socket.on("userLogin", (user) => {
      // Set user session state
      if (user.isMaster) {
        // Join master room
        socket.join("master");
        // Send master specific data, e.g no of slave clients
      } else {
        // Add to clients list
        this.clients[user.email] = {
          clientId: socket.id,
          user
        };
        socket.join("slave");
        // Let master clients know
        this.io.to("master").emit("slaveLogin", {
          clientId: socket.id,
          user
        });
      }
      socket.handshake.session.user = user;
    });
    // Handle socket disconnection
    socket.on("disconnect", () => {
      // If the socket belongs to a master user, send the information
      // to master
      let user = socket.handshake.session.user;
      if (user) {
        delete this.clients[user.email];
        if (user.isMaster) {
          socket.leave("master");
          socket.dispatcher = null;
        } else {
          socket.leave("slave");
          this.io.to("master").emit("slaveLogout", {
            user
          });
        }
      } else {
        let key;
        Object.keys(this.clients).map((k) => {
          if (this.clients[k].clientId === socket.id) {
            key = k;
          }
        });
        delete this.clients[key];
      }
    });
    // Handle the following separately because we need the master state to be set
    socket.on("slideChange", (data) => {
      this.masterState = data;
      this.io.to("slave").emit("masterSlideChanged", data);
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
