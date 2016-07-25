import App from "./App";

// This file includes the app separate from NewRelic, so that we don't have to start NewRelic locally and in tests
let app = new App();
app.start();
