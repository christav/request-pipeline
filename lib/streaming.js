/**
* Copyright (c) Microsoft.  All rights reserved.
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/

'use strict';

var through = require('through');
var duplexer = require('duplexer');

//
// Helper functions for streaming requests/results
//

/**
 * Creates an interim stream which can be returned to the
 * caller synchronously, so that async operations can still
 * hook up to the streaming output afterwards. Used when
 * filters need to do async work before they can call the rest
 * of the pipeline.
 *
 * @param setPipe function(input, output)
 *    this function is invoked synchronously, to pass the two
 *    underlying streams. input should be piped to the result of
 *    the next filter. The result of next should be piped to output.
 *    It's common to pause the input stream to prevent data loss
 *    before actually returning the real stream to hook up to.
 *
 * @returns a duplex stream that writes to the input stream and
 * produces data from the output stream.
 */
function interimStream(setPipes) {
  var input = through();
  var output = through();
  var duplex = duplexer(input, output);
  setPipes(input, output);
  return duplex;
}

exports.interimStream = interimStream;
