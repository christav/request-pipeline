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

//
// Utilities for composing and manipulating filters
//

/**
 * Create a new filter that's a combination of all the filters
 * given on the arguments list.
 *
 * @param {varargs} filters to run. First filter in the list is closest to
 * the sink, so last to run before the request, first to run on the response:
 * exactly the same as if you called pipeline.add or passed the list to
 * pipeline.create.
 *
 * @return the new filter.
 */
function createCompositeFilter() {
  var filter = arguments[0];

  function makePairedFilter(filterA, filterB) {
    return function(options, next, callback) {
      function callFilterA(o, cb) {
        return filterA(o, next, cb);
      }
      return filterB(options, callFilterA, callback);
    };
  }

  for(var i = 1; i < arguments.length; ++i) {
    filter = makePairedFilter(filter, arguments[i]);
  }
  return filter;
}

exports.createCompositeFilter = createCompositeFilter;
