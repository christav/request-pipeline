request-pipeline
================

Reusable code for Node HTTP client requests
-------------------------------------------


Middleware, as used in Express (among other places) has proven the value
of providing reusable chunks of code that can do things to a network
request. But middleware only runs against requests received when serving.
Wouldn't it be nice to have something like middleware when you're writing
HTTP client requests too?

This modules lets you define a set of filters as simple functions, and then
assemble them easily into a pipeline. When you invoke the pipeline, it
runs each filter in turn, culminating in a *sink* function which actually
sends the request out over the wire.

By default, the sink uses the [Request](https://github.com/mikeal/request/) library,
but this can be easily changed as you'll see below.

Usage
-----

Creating a pipeline is straightforward:

```javascript

var requestPipeline = require('request-pipeline');
var authFilter = require('./my/authfilter');

var pipeline = requestPipeline.create(requestPipeline.logFilter, authFilter);

// Invoke the pipeline
pipeline.get('http://some.uri.example', function (err, result, response, body) {
  if (err) { return console.log('request failed: ', err);
  // do stuff with result here
});
```

Invoking a pipeline
-------------------

A pipeline once created can either be invoked directly, passing an options record and a callback,
or you can use one of the helper functions for http verbs (get, post, delete, put, merge, head).
The callback takes the form:

```javascript
  function callback(error, result, response, body);
```

This is similar to the callback form used by the Request library, with the addition
of "result". This parameter is added becuase it's easy using a filter to provide
result parsing logic, so you don't have to dig down into http responses all the time
unless you want to.

Ordering
------
When you create a pipeline, you specify a set of filters. The filters to the left of the parameter list are closest to the sink. So if you do:

```javascript
  var p = requestPipeline.create(f1, f2, f3, f4);
```

When you invoke the pipeline, the filters will run as:
```
request ---> f4 ---> f3 ---> f2 ---> f1 ---> network
f4 <--- f3 <--- f2 <--- f1 <--- response from network
```

Every filter has the opportunity to affect the request and the response; of course not every filter needs to.

Filters
-------

### What is a filter?

A filter is a function with this signature:

```javascript
  function filter(requestOptions, next, callback);
```

The requestOptions parameter is an object containing whatever options are required; this is typically the options object from the http module or request library. Your job as a filter is to process the request (if you need to), invoke the next filter, and return the result of that.

### Filtering the request

A filter that needs to manipulate the outgoing request, but doesn't need to handle anything with the response, has the following general form:

```javascript
  function outgoingFilter(requestOptions, next, callback) {
    doStuffToTheRequest(requestOptions);
    return next(requestOptions, callback);
  }
```

### Filtering the response

Conversely, if you want to do something to the response, you need to provide your own callback to the next filter:

```javascript
  function incomingFilter(requestOptions, next, callback) {
    return next(requestOptions, function (err, result, response, body) {
      doStuffToTheResponseAndResult(response, result);
      callback(err, result, response, body);
    });
  }
```

### Streaming results and responses

One of the big advantages of request is its support for streaming both requests and the responses.
request-pipeline filters support doing this as well through a simple mechanism: the return value
of the call to next. It eventually ends up as the return value of the call to the sink. By default,
the sink uses request, which means the result is the stream that request returned. Ok, I really need
to edit this sentence.

Normally, all you need to do is return the value returned by the next function and you're good. But what
happens if you need to do some async work in your filter before you make the actual http request -
to retrieve a file or an authentication token from a web service perhaps?

The request-pipeline provides a helper function called `interimStream` that you can use to create
a temp stream to return, that you can then hook up to later. For example:

```javascript
  function getAuthFilter(requestOptions, next, callback) {
    var result = interimStream(function (inputStream, outputStream) {
      // This callback is called synchronously, we need to pass back two values,
      // the input and output streams so they can be hooked up appropriately.
      
      // Pause the input stream so that callers don't write anything before
      // the request is actually ready
      inputStream.pause();
      
      // Now we launch our async work...
      getAuthToken(requestOptions, credentials, function (err, token) {
        token.setAuthHeader(requestOptions);
        
        // Now that we've got the token, we can make the real request
        var resultStream = next(requestOptions, callback);
        
        // Hook up our interim stream to the real result stream
        inputStream.pipe(resultStream).pipe(outputStream);
        
        // And let the input flow
        inputStream.resume();
      });
    });
    
    // Return the interimStream back to caller
    return result;
  }
```

### Combining filters

Multiple filters can be combined into a single filter so you can reuse them as a unit.

```javascript

  var bigFilter = requestPipeline.createCompositeFilter(f1, f2, f3, f4);
  
  // Same as if we did create(f0, f1, f2, f3, f4, f5);
  var pipeline = requestPipeline.create(f0, bigFilter, f5);
```

Combining Pipelines
-------------------

Normally you'd use `requestPipeline.create` to create your pipelines. But sometimes you want
a different sink. One common scenario is that you have a pipeline already, and you want to
create a new pipeline that adds some additional filter to it - for example, you have a generic
pipeline that handles authentication, but you want to add a different parsing filter at the beginning
of the pipeline for each different request you're dealing with.

Luckily, the pipeline function you get matches the signature needed for a pipeline sink. To
specify that you want a specific sink instead of the default, you use the `createWithSink` function
instead. For example:

```javascript
  var standardPipeline = requestPipeline.create(logFilter, authFilter);
  
  var getUserPipeline = requestPipeline.createWithSink(standardPipeline, userRequestParseFilter);
  var getDocumentPipeline = requestPipeline.createWithSink(standardPipeline, getDocumentParseFilter);
```

Filters are invoked in the same order as before, closer to the left of the parameter list is closer to the sink.
