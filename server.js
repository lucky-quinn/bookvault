const express = require('express')
const path = require('path')
const fs = require('fs')
const bodyParser = require("body-parser")

//connect db
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:27017';
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'library'

async function connectDB() {
    await client.connect()
}

//define the router
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('home'));

//declare for renders
var cat1 = fs.readFileSync('templates/catalog/cat1.html').toString()
var cat2 = fs.readFileSync('templates/catalog/cat2.html').toString()
var cat3 = fs.readFileSync('templates/catalog/cat3.html').toString()

var up1 = fs.readFileSync('templates/update/up1.html').toString()
var up2 = fs.readFileSync('templates/update/up2.html').toString()

var sea1 = fs.readFileSync('templates/search/sea1.html').toString()
var sea2 = fs.readFileSync('templates/search/sea2.html').toString()




//Display function
async function displaygen(docType, value = []) { //universal display function
    var id = [], title = [], author = [], date = [], authorid = []
    var len = value.length
    switch (docType) {
        case 'books':
            for (var i = 0; i < len; i++) {
                id[i] = value[i].bookId
                title[i] = value[i].bookName
                date[i] = value[i].publicationDate
                author[i] = value[i].author
                authorid[i] = value[i].authorId
            }
            break
        case 'journals':
            for (var i = 0; i < len; i++) {
                id[i] = value[i].journalId
                title[i] = value[i].journalName
                date[i] = value[i].publicationDate
                author[i] = value[i].author
                authorid[i] = value[i].authorId
            }
            break
        default: console.log("Error in display")
    }
    var htmlOpt = "<table>"
    htmlOpt += "<tr> <th>ID</th> <th>Title</th> <th>Publication Date</th> <th>Author</th> <th>Author ID</th> </tr>"
    for (var i = 0; i < len; i++) {
        htmlOpt += "<tr>";
        htmlOpt += "<td>" + id[i] + "</td>"
        htmlOpt += "<td>" + title[i] + "</td>"
        htmlOpt += "<td>" + date[i] + "</td>"
        htmlOpt += "<td>" + author[i] + "</td>"
        htmlOpt += "<td>" + authorid[i] + "</td>"
        htmlOpt += "</tr>"
    }
    htmlOpt += "</table>"
    return htmlOpt
}


//Routes
app.get("/", function (req, res) {
    res.sendFile(path.join(__dirname, '/home/home.html'))

})

//catalog route
app.get('/catalog', async function (req, res) {
    connectDB()
    const db = client.db(dbName)
    const collection = db.collection("books")
    const bookResult = await db.collection("books").find({}, { projection: { _id: 0 } }).toArray()
    const journalResult = await db.collection("journals").find({}, { projection: { _id: 0 } }).toArray()
    fs.truncateSync('renders/catalog.html', 0, function () {
    })
    var output = cat1 + await displaygen('books', bookResult) + cat2 + await displaygen('journals', journalResult) + cat3
    fs.writeFileSync('renders/catalog.html', output)
    res.sendFile(path.join(__dirname, '/renders/catalog.html'))
});

//update route
app.post('/update', async function (req, res) {
    var documentType = req.body.document
    connectDB()
    const db = client.db(dbName)
    const collection = db.collection(req.body.document)
    if (documentType === 'books') {
        var query = { bookName: req.body.doc_name };
        var newvalues = { $set: { bookName: req.body.new_name } };
    }
    else {
        var query = { journalName: req.body.doc_name };
        var newvalues = { $set: { jounralName: req.body.new_name } };
    }
    const findResult = await db.collection(req.body.document).updateOne(query, newvalues)
    if (findResult.modifiedCount == 1) {
        var upstat = "Title has been updated"
    }
    else {
        var upstat = "Error! Title has not been updated"
    }
    fs.truncateSync('renders/update.html', 0, function () {
    })
    var output = up1 + '<h2>' + upstat + '<h2>' + up2
    fs.writeFileSync('renders/update.html', output)


    res.sendFile(path.join(__dirname, '/renders/update.html'))
});

//search route
app.post('/search', async function (req, res) {
    response = {
        documentType: req.body.document,

    };
    var documentType = req.body.document
    var search_type = req.body.search_type
    var search_term = req.body.search
    const regexPattern = new RegExp(search_term, "i");
    connectDB()
    const db = client.db(dbName)
    const collection = db.collection(documentType)
    if (documentType === 'books') {
        if (search_type === 'name') {

            var query = { bookName: { $regex: regexPattern } };
        }
        else {
            var query = { publicationDate: search_term };
        }

    }
    else {
        if (search_type === 'name') {
            var query = { journalName: { $regex: regexPattern } };
        }
        else {
            var query = { publicationDate: search_term };
        }
    }
    const Result = await db.collection(documentType).find(query).toArray()
    fs.truncateSync('renders/search.html', 0, function () {
    })
    var len = Result.length
    if (len != 0) {
        var output = sea1 + await displaygen(documentType, Result) + sea2
        fs.writeFileSync('renders/search.html', output)
    }
    else{
        const noOutput = "<h2>No results found</h2>"
        var output = sea1 + noOutput + sea2
        fs.writeFileSync('renders/search.html', output)
    }

    res.sendFile(path.join(__dirname, '/renders/search.html'))
});

//router listen
var server = app.listen(8080, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Example app listening at %s", port)
})