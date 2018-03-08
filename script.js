var words = [];
var all = "";
var text = "";
var text2 = "";
var sortedWords;
var topTen = [];

function go() {

    var walkDOM = function (node, func) {
        
        func(node);
        node = node.firstChild;
        
        while (node) {
            walkDOM(node, func);
            node = node.nextSibling;
        }
    };

    walkDOM(document.body, function (node) {

        if (node.nodeName === '#text') {
            var text = node.textContent;

            // Regular expression magic 
            text = text.replace(/[^A-Za-z]/g, ' ');

            text = text.split(' ');

            if (text.length) {

                for (var i = 0, length = text.length; i < length; i += 1) {
                    var matched = false,
                        word = text[i];

                    for (var j = 0, numberOfWords = words.length; j < numberOfWords; j += 1) {
                        if (words[j][0].toLowerCase() === word.toLowerCase()) {
                            matched = true;
                            words[j][1] += 1;
                        }
                    }

                    if (!matched && word.toLowerCase() !== 'this' 
                                 && word.toLowerCase() !== 'will' 
                                 && word.toLowerCase() !== 'most' 
                                 && word.toLowerCase() !== 'also') 
                        words.push([word.toLowerCase(), 1]);

                }
            }
        }
    });

    var displayWordList = function (words) {
        
        for (var i = 0, length = words.length; i < length; i += 1) {
            if (words[i][1] < 100)
                all = all + (words[i][0]) + " - " + (words[i][1]) + "<br>";
        }
    };

    var displayTopTwenty = function (x) {
        
        x.sort(compareSecondColumn);

        for (var z = 0; z <= 20; z++)
            text = text + (x[z][0]) + " - " + (x[z][1]) + "<br>";

        return x;
    }

    function compareSecondColumn(b, a) {
        
        if (a[1] === b[1])
            return 0;
        else
            return (a[1] < b[1]) ? -1 : 1;
    }

    function filterTopTen(x) {
        
        for (var y = 0; y < 30; y++)
            if (x[y][0].length > 3)
                topTen.push(x[y]);

        for (y = 0; y <= 10; y++)
            text2 = text2 + (topTen[y][0]) + " - " + (topTen[y][1]) + "<br>";
    }

    displayWordList(words);
    sortedWords = displayTopTwenty(words);
    filterTopTen(sortedWords);

    document.getElementById("col1").innerHTML = all;
    document.getElementById("col2").innerHTML = text;
    document.getElementById("col3").innerHTML = text2;
}
