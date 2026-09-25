# JMH Visualizer

Visually explore your [JMH](http://openjdk.java.net/projects/code-tools/jmh/) Benchmarks! Online version at [mlangc.github.io/jmh-visualizer](https://mlangc.github.io/jmh-visualizer/)!

Comes with 2 companion projects:
- [Gradle plugin](https://github.com/jzillmann/gradle-jmh-report)
- [Jenkins plugin](https://github.com/jenkinsci/jmh-report-plugin)


## Features

- Serverless architecture - All happens locally in your browser
- Visualize the benchmarks of a [single run](https://mlangc.github.io/jmh-visualizer/?example=single) (one JSON file) grouped by benchmark class
  - Vertical bar-chart with score and score error 
  - Link to the original JSON
  - Show individual runs as tooltip
- Compare the benchmarks of [2 runs](https://mlangc.github.io/jmh-visualizer/?example=two) (two JSON files) grouped by benchmark class
  - Summary of notable changes
  - Vertical bar-chart from -100% to 100%
  - Link to the original JSON
  - Show score and error of both runs in tooltip
- Compare the benchmarks of [multiple runs](https://mlangc.github.io/jmh-visualizer/?example=multi) (n JSON files) grouped by benchmark class
  - Summary of notable changes
  - Line chart
  - Show score and error on hover
- Visualize secondary metrics like '·gc.alloc.rate'
- Focus on subselection of charts with synced axis scales
- Load benchmarks from external url or gists


## Major Changes

- **Sep 2026** - 1.0.0 Migrate to modern stack, TypeScript and add filters
- **Mar 2021** - 0.9.3 Support [Gists containing multiple files](https://github.com/jzillmann/jmh-visualizer/issues/33)
- **Aug 2018** - 0.9 Couple of [user requested features](https://github.com/jzillmann/jmh-visualizer/milestone/6?closed=1)
- **Jul 2018** - 0.8 Revamp Summary Page + Chart transitions
- **Jan 2018** - 0.7.3 External URL/Gist support
- **Oct 2017** - 0.7 Multi-Run support
- **Aug 2017** - 0.6 Layout change & Summary support
- **Jul 2017** - 0.5 Focussing of benchmarks
- **May 2017** - 0.4 Secondary Metrics support
- **Apr 2017** - 0.3 Error Bars & Params support
- **Nov 2016** - 0.2: Add 2 run compare view
- **Oct 2016** - 0.1: Initial Release


## Tips & Tricks

While this app will visualize any valid JMH JSON you throw at it, you can write your benchmarks in a way that makes the visualization much more enjoyable...

- Put those benchmarks in a single class which you most likely want to compare to each other
- On the other hand, don't put too much stuff in a single class/chart (since readability will suffer)
- Don't mix incompatible benchmark styles into one class (like mixing average and single shot is ok, but mixing average and throughput doesn't make much sense)
- Sensibly design your package structure, your class names and your method names, those are reflected in the auto-generated charts
- Keep method names short but meaningful
- The method names reflect initial sort, so if you have benchmarks called 'with1Threads, with10Threads' naming them 'with01Thread, with10Thread' will display nicer


## Parameter reference

| Name | Values | What you can do with it? | Example |
| ------------- | ------------- | ------------- | ------------- |
| example | oneOf['single', 'two', 'multi'] | Show one of the built-in examples | [Single](https://mlangc.github.io/jmh-visualizer/?example=single), [Two](https://mlangc.github.io/jmh-visualizer/?example=two), [Multi](https://mlangc.github.io/jmh-visualizer/?example=multi) |
| source | $url | Load a single benchmark result from the provided URL | https://mlangc.github.io/jmh-visualizer/?source=https://gist.githubusercontent.com/jzillmann/7d23b2382911cc434754a23773b06598/raw/1bcad4bb64624d8a2be15114a4eee4c406c3ae95/string-concatenation_jdk7.json |
| sources | $url1,$url2,.. | Load multiple benchmark results from the provided URLs | https://mlangc.github.io/jmh-visualizer/?sources=https://gist.githubusercontent.com/jzillmann/7d23b2382911cc434754a23773b06598/raw/1bcad4bb64624d8a2be15114a4eee4c406c3ae95/string-concatenation_jdk7.json,https://gist.githubusercontent.com/jzillmann/866d39d43b264f507a67368f2313baca/raw/d0ae1502e8c493e6814c83f2df345fecb763c078/string-concatenation_jdk8.json |
| gist | $gistId | Load a single benchmark result from the provided gist | https://mlangc.github.io/jmh-visualizer/?gist=7d23b2382911cc434754a23773b06598 |
| gist (multi-file)| $gistId | Load multiple benchmark results from the provided gist | https://mlangc.github.io/jmh-visualizer/?gist=4c9e282fff30b5fa455ae2496acf4e05 |
| gists | $gistId1,$gistId2,... | Load multiple benchmark results from the provided gists | https://mlangc.github.io/jmh-visualizer/?gists=7d23b2382911cc434754a23773b06598,866d39d43b264f507a67368f2313baca |
| topBar | oneOf['default', 'off', 'my custom headline'] | Control the header | [Off](https://mlangc.github.io/jmh-visualizer/?gist=7d23b2382911cc434754a23773b06598&topBar=off), [Custom Headline](https://mlangc.github.io/jmh-visualizer/?gist=7d23b2382911cc434754a23773b06598&topBar=Custom%20Headline) |


## Contribute

Use the [issue tracker](https://github.com/mlangc/jmh-visualizer/issues) and/or open [pull requests](https://github.com/mlangc/jmh-visualizer/pulls)!

#### Useful Commands

- ```npm install``` Download all necessary npm packages
- ```npm start``` Run a dev server with live reload
- ```npm run lint``` Lint & check the formatting of the sources
- ```npm run format``` Like lint, but applies formatting & safe fixes
- ```npm run typecheck``` Type check the sources
- ```npm run test``` Run tests
- ```npm run check``` Run Lint, Typecheck & Test
- ```npm run watch``` Continuously build the project
- ```open build/index.html``` Open the build project in your default browser
- ```npm run release``` Build production version

#### Docker Build & Run

```bash
docker build . -t jmh-visualizer
docker run --rm -d -p 80:80 --name jmh-visualizer jmh-visualizer 
```

Now you can access the UI on ```http://localhost```.

#### Release
- For major releases, add an entry to [Major Changes](#major-changes) and commit it
- ```npm version $releaseVersion -m "Release %s"``` Bumps `package.json` & `package-lock.json`, commits and tags (no `v` prefix, see `.npmrc`)
- ```git push --follow-tags``` Pushes the release commit & tag; every push to `main` deploys the app to [GitHub Pages](https://mlangc.github.io/jmh-visualizer/)


## Credits

http://recharts.org/ - The chart ground work

http://www.favicon.cc/ - Created the favicon with

Babel, webpack, react,... and many more for an enjoyable webstack!


## Donating

[![Support via PayPal](https://cdn.rawgit.com/twolfson/paypal-github-button/1.0.0/dist/button.svg)](https://www.paypal.com/paypalme/mlangc)

