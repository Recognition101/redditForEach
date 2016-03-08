var fs        = require('fs');
var path      = require('path');
var spawn     = require('child_process').spawn;
var cmdr      = require('commander');
var request   = require('request');
var spawnArgs = require('spawn-args');

var redditUrl = 'https://reddit.com/r/';

cmdr.version('1.0.0')
    .option('-c, --command [command]', 'The command to run for each URL. ' +
                'Instances of {{url}} will be replaced with each url.')
    .option('-r, --subreddit [subreddit]', 'The URLs will be taken from the ' +
                'first page of this subreddit.')
    .option('-o, --once [filename]', 'An optional JSON file ' +
                'that maintains a list of URLs that have been run already, ' +
                'and will not be used again in successive runs.')
    .option('-f, --filter [filter]', 'If given, this will only run the ' +
                'command on URLs that match this regex pattern.')
    .option('-s, --selftext', 'If this flag is given, we will also search ' +
                'selftext for any matching URLs.')
    .parse(process.argv);


// General Helper Functions
var requestJSON = function requestJSON(url) {
    return new Promise(function(yes, no) {
        request(url, function(e, r, body) { return e ? no(e) : yes(body); });
    });
};

var exec = function exec(cmd) {
    return new Promise(function(yes, no) {
        var args = spawnArgs(cmd);
        args = args.map(function(a){return a.replace(/^(['"])(.*)\1$/,'$2');});
        var proc = spawn(args[0], args.slice(1));
        proc.stdout.on('data', function (data) {
            console.log(('' + data).replace(/\n$/, ''));
        });

        proc.stderr.on('data', function (data) {
            console.error(('' + data).replace(/\n$/, ''));
        });

        proc.on('exit', function (code) {
            yes();
        });
    });
};

// URL Validation Helpers (including once-file handling)
var getOnceFn = function getOnceFn() {
    var isWin = process.platform === 'win32' || process.platform === 'win64';
    var homeDir = process.env[isWin ? 'USERPROFILE' : 'HOME'];
    return cmdr.once ? path.resolve(cmdr.once.replace(/^~/, homeDir)) : null;
};
var onceFn  = getOnceFn();
var onceMap = null;
try      { onceMap = onceFn ? JSON.parse(fs.readFileSync(onceFn)) : null; }
catch(e) {  }
onceMap = onceMap || {};

var urlRegex = new RegExp(cmdr.filter || '');
var testUrl = function testUrl(url) {
    var test = urlRegex.test(url) && !(url in onceMap);
    if (test) { onceMap[url] = true; }

    return test;
};


// Entry Point
if (!cmdr.command || !cmdr.subreddit) {
    console.error('No ' + (!cmdr.command ? 'command' : 'subreddit') +
                  ' specified, exiting.');
    return;
}

requestJSON(redditUrl + cmdr.subreddit + '.json').then(function(body) {
    var json = null;
    try { json = JSON.parse(body); }
    catch(e) {
        throw new Error('Could not parse JSON response from Reddit.');
    }

    if (!json.data || !json.data.children || !json.data.children.length) {
        throw new Error('That subreddit has no items (or reddit is down).');
    }

    return json.data.children.reduce(function(promise, link) {
        var cmds = [];
        var txt  = link.data.selftext_html;

        if (link.data) {
            if (link.data.url && testUrl(link.data.url)) {
                cmds.push(cmdr.command.replace(/{{url}}/g, link.data.url));
            }
        }

        if (txt && cmdr.selftext) {
            txt.replace(/href\s*=\s*['"]([^'"]+)['"]/, function(all, url) {
                if (url && testUrl(url)) {
                    cmds.push(cmdr.command.replace(/{{url}}/g, url));
                }
            });
        }

        cmds.forEach(function(cmd) {
            promise = promise.then(function() { return exec(cmd); });
        });

        return promise;

    }, Promise.resolve());

}).then(function() {
    if (onceFn) {fs.writeFile(onceFn, JSON.stringify(onceMap, null, '    '));}

}).catch(function(e) {
    console.error('' + e);
});
