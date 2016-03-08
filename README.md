# Reddit For-Each

This is a small CLI utility that will run any command line program for each URL that is on the front page of a given subreddit.

## Setup

First, `cd` to the redditForEach directory, and install node (if you don't yet have it) and all dependencies:

```
brew install node
npm install
```

## Usage

```
Usage: redditForEach [options]

  Options:

    -h, --help                   output usage information
    -V, --version                output the version number
    -c, --command [command]      The command to run for each URL. Instances of {{url}} will be replaced with each url.
    -r, --subreddit [subreddit]  The URLs will be taken from the first page of this subreddit.
    -o, --once [filename]        An optional JSON file that maintains a list of URLs that have been run already, and will not be used again in successive runs.
    -f, --filter [filter]        If given, this will only run the command on URLs that match this regex pattern.
    -s, --selftext               If this flag is given, we will also search selftext for any matching URLs.
```

You must provide the `-c, --command` and `-r, --subreddit` options.

If you wanted to output every URL on the front page of /r/videos, for example, you could:

```
node redditForEach.js -c "echo '{{url}}'" -r videos
```

The `--once` option can be used to specify a JSON file that will be used to store which URLs have had a command run on them, and not allow any further commands to run on those URLs. This is useful if you run this script periodically and never want a command to execute on the same URL twice. For instance, if we run this command once:

```
node redditForEach.js -c "echo '{{url}}'" -o ~/.redditForEachLog.json
```

Then it will output each URL and store each URL in the file `~/.redditForEachLog.json`. If we were to run that command again, it would not output anything, since every URL was already encountered once according to `~/.redditForEachLog.json`.
