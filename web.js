var express = require("express");
var logfmt = require("logfmt");
var path = require("path");
var app = express();

app.use(logfmt.requestLogger());

function setHeaders(res,pth,stat) {
    console.log(pth)
    if (path.extname(pth) == ".svgz") {
        res.setHeader("Content-Encoding", "gzip");
    }
    if (path.extname(pth) == ".manifest") {
        res.setHeader("Content-Type", "text/cache-manifest");
    }
    
}

app.use("/", express.static('static', {
    "setHeaders": setHeaders,
}));

app.get('/books', function(req, res) {
  res.redirect('http://159.203.85.77:5000');
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});