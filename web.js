var express = require("express");
var logfmt = require("logfmt");
var path = require("path");
var app = express();

app.use(logfmt.requestLogger());

function setHeaders(res,pth,stat) {
    console.log(pth)
    if (path.extname(pth) == ".svgz") {
        console.log("setting gzip encoding")
        res.setHeader("Content-Encoding", "gzip");
    }
}

app.use("/", express.static('static', {
    "setHeaders": setHeaders,
}));

// app.get('/', function(req, res) {
//   res.send('Hello World!');
// });

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});