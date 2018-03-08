var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var fs = require('fs');
var express = require('express');
var stemmer = require('stemmer');

var rawStory = "",
    all = "",
    text2 = "",
    keyWords = "";
var sortedWords, URL, words, words2, rawLeft, rawRight, wordsOg, words2Og;
var sent1 = 0,
    sent2 = 0;
var title1 = '', 
    title2 = '';
var articles1 = [], 
    articles2 = [];
var titleSource1 = '', 
    titleSource2 = '';
var key, original_word;
var map = {};
var map2 = {};

app = express();

server = require('http').createServer(app);
io = require('socket.io').listen(server);

// sends html file to load on local host 
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/about', function (req, res) {
    res.sendFile(__dirname + '/about.html');
});

app.get('/contact', function (req, res) {
    res.sendFile(__dirname + '/contact.html');
});

// includes pictures for html file and other things like css file 
app.use(express.static(__dirname + '/public'));

server.listen(process.env.PORT || 3000);
console.log('Server is running..');

// socket.io - everything is running inside this 
io.sockets.on('connection', function (socket) {

    socket.on('send message', function (data) {

        analyzeArticle(data, 0);
    });

    socket.on('send message2', function (data) {

        analyzeArticle(data, 1);
    });

}); // end of socket.io

function analyzeArticle(data, x) {
    
    // whats getting sent from client is saved as URL
    URL = data;
    words = [];
    words2 = [];
    wordsOg = [];
    words2Og = [];


    if (x === 0) {
        rawLeft = URL;
        titleSource1 = getHost(URL);
    } else {
        rawRight = URL;
        titleSource2 = getHost(URL);
    }

    // Specifies the request to have two fields, a string that is used for the Web page to scrape, and a function, specified below
    request(URL, function (err, resp, body) {

        // If retrieved successfully
        if (!err && resp.statusCode == 200) {

            //This uses jQuery format, just loads th4e body of the HTML into this variable
            var $ = cheerio.load(body);
            var resObj = {};

            //Find everything with a p tag
            $('p').each(function (index, title) {

                // Grab the main story of the article
                rawStory = $(title).text();
                rawStory = rawStory.replace(/[^A-Za-z'-']/g, ' ');
                rawStory = rawStory.split(' ');

                //Get how many of each word that there is
                if (x === 0) {
                    if (rawStory.length) {
                        for (var i = 0, length = rawStory.length; i < length; i += 1) {
                            var matched = false,
                                word = stemmer(rawStory[i]);
                                var original = rawStory[i];

                            for (var j = 0, numberOfWords = words.length; j < numberOfWords; j += 1) {
                                if (words[j][0].toLowerCase() === word.toLowerCase()) {
                                    matched = true;
                                    words[j][1] += 1;
                                }
                            }

                            excludeWords(matched, word, original, 0);
                        }
                    }

                    //Sort and get top 10 words
                    words.sort(compareSecondColumn);

                } else {

                    if (rawStory.length) {
                        for (var i = 0, length = rawStory.length; i < length; i += 1) {
                            var matched = false,
                                word = stemmer(rawStory[i]);
                                var original = rawStory[i];

                            for (var j = 0, numberOfWords = words2.length; j < numberOfWords; j += 1) {
                                if (words2[j][0].toLowerCase() === word.toLowerCase()) {
                                    matched = true;
                                    words2[j][1] += 1;
                                }
                            }

                            excludeWords(matched, word, original, 1);
                        }
                    }

                    //Sort and get top 10 words
                    words2.sort(compareSecondColumn);
                    
                }
            });

            //Find certain things (title, keywords, etc) in the metadata
            resObj = {};
            $title = $('head title').text(),
                $desc = $('meta[name="description"]').attr('content'),
                $kwd = $('meta[name="keywords"]').attr('content'),
                $ogTitle = $('meta[property="og:title"]').attr('content'),
                $ogkeywords = $('meta[property="og:keywords"]').attr('content');

            if ($title)
                resObj.title = $title;

            if ($desc)
                resObj.description = $desc;

            if (x === 0) {
                title1 = $title.slice(0, $title.length/1.5).split(' ').join('+');
                if (title1 === "") {
                    title1 = $desc.slice(0, $desc.length/1.5).split(' ').join('+');
                } 
            } else {
                title2 = $title.slice(0, $title.length/1.5).split(' ').join('+');
                if (title2 === "") {
                    title2 = $desc.slice(0, $desc.length/1.5).split(' ').join('+');
                }
            }


            if ($kwd)
                resObj.keywords = $kwd;

            // swap out original word
            if (x===0) {
                for (var y = 0; y < 10; y++) {
                   
                    key = words[y][0];
                    original_word = map[key];
                    wordsOg.push(original_word);
                }
            }
            else {
                for (var y = 0; y < 10; y++) {
                   
                    key = words2[y][0];
                    original_word = map2[key];
                    words2Og.push(original_word);
                }
            }

            if (x === 0) {
                sent1 = 1; 
                io.sockets.emit('new message', wordsOg);
            } else {
                sent2 = 1;
                io.sockets.emit('new message2', words2Og);
                io.sockets.emit('leftStory',rawLeft);
                io.sockets.emit('rightStory',rawRight);
            }

            //Both URLs must be finished being scraped for comparison to execute.
            if (sent1 === 1 && sent2 === 1) {
                comparison();
                similarArticles(title1, 0);
                similarArticles(title2, 1);
            }
        }
    });
}

//Gets host name from url
function getHost(URL) {
    var host;

    if (URL.indexOf('://') > -1) 
        host = URL.split('/')[2];
    else 
        host = URL.split('/')[0];

    host = host.split(':')[0];
    host = host.split('?')[0];

    return host;
}

//Finds similar articles
function similarArticles(title, x) {
    
    //Queries google using the title of the article
    var query = 'https://www.google.com/search?q=' + title;
    var done1 = 0, done2 = 0;
    articles1 = [];
    articles2 = [];
    
    // Specifies the request to have two fields, a string that is used for the Web page to scrape, and a function, specified below
    request(query, function (err, resp, body) {
        
        // If retrieved successfully
        if (!err && resp.statusCode == 200) {

            //This uses jQuery format, just loads th4e body of the HTML into this variable
            var $ = cheerio.load(body);

            i = 0;
            
            //Find everything with a h3.r tag
            $('h3.r').each(function (index, element) {
                //Retrieves the link to the article from the href tag
                var a = $(this).children();
                var url = a.attr('href');
                url = url.replace('/url?q=', '');

                //Adds first three urls to list if they're not from youtube or a search
                if (url.indexOf('youtube') === -1 && url.indexOf('search') === -1 && url.indexOf('free') === -1 && i <= 2) {

                    //Makes sure original article doesn't show in similar articles
                    if (x === 0 && url.indexOf(titleSource1) === -1) {
                        articles1[i] = url;
                        if (i === 2) 
                            io.sockets.emit('similarArticles1', articles1);
                            i++;
                    } else if (x === 1 && url.indexOf(titleSource2) === -1) {
                        articles2[i] = url;
                        if (i === 2) {
                            io.sockets.emit('similarArticles2', articles2);
                        }
                        i++;
                    } 
                }
            });
        }
    });
}       

function comparison() {

    var simCount = 0;
    var tot1 = 0;
    var tot2 = 0;
    var overallTot;
    var percMatch = 0;
    var shortest;

    if (words.length <= words2.length && words.length !== 0) 
        shortest = words.length;
    else 
        shortest = words2.length;

    // Finds total amount of words in top 10 for first URL
    for (i = 0; i < shortest; i++) 
        tot1 += words[i][1];

    // Finds total amount of words in top 10 for second URL
    for (i = 0; i < shortest; i++) 
        tot2 += words2[i][1];

    // Total amount of words between the two stories (In top 10)
    overallTot = tot1 + tot2;

    // Sums up total number of matching words in Top 10 for each
    for (var i = 0; i < shortest; i++) {
        for (var j = 0; j < shortest; j++) {
            if (words[i][0].toLowerCase() === words2[j][0]) 
                simCount += words[i][1] + words2[j][1];
        }
    }

    // Calculated percentage match. Sent directly to the HTML afterwards
    percMatch = simCount / overallTot * 100;

    percMatch += 30;

    if (percMatch >= 65) 
        var percMatchString = percMatch.toFixed(2) + '% - GOOD Match';
    else 
        var percMatchString = percMatch.toFixed(2) + '% - BAD Match';

    sent1 = 0;
    sent2 = 0;

    // Socket for the percentage match, send to the HTML
    io.sockets.emit('stats', percMatchString);
}

function excludeWords(matched, word, original, x) {
    
    // Excludes words we don't want and words less than 3 chars long.
    if (!matched && word.toLowerCase() !== 'this' &&
        word.toLowerCase() !== 'will' &&
        word.toLowerCase() !== 'most' &&
        word.toLowerCase() !== 'also' &&
        word.toLowerCase() !== ' ' &&
        word.toLowerCase() !== 'the' &&
        word.toLowerCase() !== 'for' &&
        word.toLowerCase() !== 'and' &&
        word.toLowerCase() !== 'too' &&
        word.toLowerCase() !== 'into' &&
        word.toLowerCase() !== 'that' &&
        word.toLowerCase() !== 'has' &&
        word.toLowerCase() !== 'been' &&
        word.toLowerCase() !== 'said' &&
        word.toLowerCase() !== 'its' &&
        word.toLowerCase() !== 'was' &&
        word.toLowerCase() !== 'they' &&
        word.toLowerCase() !== 'had' &&
        word.toLowerCase() !== 'his' &&
        word.toLowerCase() !== 'but' &&
        word.toLowerCase() !== 'one' &&
        word.toLowerCase() !== 'from' &&
        word.toLowerCase() !== 'were' &&
        word.toLowerCase() !== 'with' &&
        word.toLowerCase() !== 'you' &&
        word.toLowerCase() !== 'over' &&
        word.toLowerCase() !== 'her' &&
        word.toLowerCase() !== 'their' &&
        word.toLowerCase() !== 'thei' &&
        word.toLowerCase() !== 'this' &&
        word.toLowerCase() !== 'thi' &&
        word.toLowerCase() !== 'she' &&
        word.toLowerCase() !== 'not' &&
        word.toLowerCase() !== 'who' &&
        word.toLowerCase() !== 'are' &&
        word.toLowerCase() !== 'about' &&
        word.toLowerCase() !== 'any' &&
        word.toLowerCase() !== 'there' &&
        word.toLowerCase() !== 'have' &&
        word.toLowerCase() !== 'may' &&
        word.toLowerCase() !== 'can' &&
        word.toLowerCase() !== 'some' &&
        word.toLowerCase() !== 'more' &&
        word.toLowerCase() !== 'what' &&
        word.toLowerCase() !== 'than' &&
        word.toLowerCase() !== 'such' &&
        word.toLowerCase() !== 'which' &&
        word.toLowerCase() !== 'all' &&
        word.toLowerCase() !== 'tried' &&
        word.toLowerCase() !== "it'll" &&
        word.toLowerCase() !== 'could' &&
        word.toLowerCase() !== "it's" &&
        word.toLowerCase() !== 'really' &&
        word.toLowerCase() !== 'like' &&
        word.toLowerCase() !== 'says' &&
        word.toLowerCase() !== 'being' &&
        word.toLowerCase() !== 'your' &&
        word.toLowerCase() !== "there's" &&
        word.toLowerCase() !== "would" &&
        word.length >= 3) {

        if (x === 0) {
            words.push([word.toLowerCase(), 1]);
            map[word] = original;

        } else {
            words2.push([word.toLowerCase(), 1]);
            map2[word] = original;
        }
    }
}

function compareSecondColumn(b, a) {
    if (a[1] === b[1])
        return 0;
    else
        return (a[1] < b[1]) ? -1 : 1;
}

