let express = require("express");
let app = express();
let bodyParser = require("body-parser");
let dns = require("dns");
let shortened = {0: "https://freecodecamp.org"};
let multer  = require('multer');
let upload = multer();
let formidable = require("formidable");
let unirest = require("unirest");
let recentImageSearch = [];

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.get("/api/timestamp/:dateString?", (req, res) => {
  let dateString = req.params.dateString;
  let date = dateString ? new Date(dateString) : new Date();
  let unix = date.getTime();
  let utc = date.toUTCString();
  if (unix) res.json({
    unix: unix,
    utc: utc
  })
  else res.json({error: utc});
})

app.get("/api/header", (req, res) => {
  let ip = req.get('x-forwarded-for') || req.connection.remoteAddress;
  let lang = req.get("accept-language");
  let sys = req.get("user-agent");
  res.json({
    ipaddress: ip,
    language: lang,
    software: sys
  });
})

app.post("/api/shorturl/new", (req, res) => {
  let longUrl = req.body.longUrl;
  let key = Math.max(...Object.keys(shortened)) + 1;
  shortened[key] = longUrl;
  let resobj = {
    original_url: longUrl,
    short_url: key
  }
  dns.lookup(longUrl, (err, address) => {
    if (err) resobj = {error: "invalid URL"};
  })
  res.json(resobj);
})

app.get("/api/shorturl/:short", (req, res) => {
  let key = Number(req.params.short);
  if (key) {
    if (shortened[key]) res.redirect(shortened[key])
    else res.json({error: "No short url found for given input"});
  } else {
    res.json({error: "shorturl must be a number"});
  }
})

app.post("/api/metadata", (req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    let file = files.upfile;
    res.json({
      name: file.name,
      type: file.type,
      size: file.size
    })
  })
})

// app.post("/api/metadata", upload.single("upfile"), (req, res) => {
//   let file = req.file;
//   res.json({
//     name: file.originalname,
//     type: file.mimetype,
//     size: file.size
//   })
// })

app.get("/api/imagesearch/:query", (req, res) => {
  let query = req.params.query;
  let offset = req.query.offset;
  let searchTime = new Date();
  let url = "https://contextualwebsearch-websearch-v1.p.mashape.com/api/Search/ImageSearchAPIWithPagination";
  let options = {
    autoCorrect: false,
    pageNumber: offset || 1,
    pageSize: 10,
    q: encodeURIComponent(query),
    safeSearch: false
  };
  url += "?" + Object.entries(options).map(arr => arr.join("=")).join("&");
  unirest.get(url)
    // API is free. Get key here: https://rapidapi.com/contextualwebsearch/api/Web%20Search/functions/imageSearch
    .header("X-Mashape-Key", "GbrTXqfEOimsh3BMo0eOijKqWOVNp1CymYpjsnU3NWKMjPkKRm")
    .header("X-Mashape-Host", "contextualwebsearch-websearch-v1.p.mashape.com")
    .end(result => {
      recentImageSearch.unshift({
        term: query,
        when: searchTime
      });
      if (recentImageSearch.length > 10) recentImageSearch.pop();
      res.json(result.body.value);
    });
})

app.get("/api/latest/imagesearch", (req, res) => {
  res.json(recentImageSearch);
})

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
})

app.listen(process.env.PORT || 3000, () => {
  console.log("Listening...");
})
