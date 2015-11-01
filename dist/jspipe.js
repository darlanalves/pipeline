(function(global) {

    'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Pipeline = (function () {
    function Pipeline() {
        _classCallCheck(this, Pipeline);

        this.$$pipe = [];
    }

    _createClass(Pipeline, [{
        key: 'push',
        value: function push(fn) {
            this.$$pipe.push(fn);
            return this;
        }
    }, {
        key: 'run',
        value: function run(value) {
            var context = PipelineContext.create(this.$$pipe);

            context.value = value;
            context.next();

            return context.promise;
        }
    }]);

    return Pipeline;
})();

var PipelineContext = (function () {
    function PipelineContext(steps) {
        _classCallCheck(this, PipelineContext);

        var context = this;

        this.setupSteps(steps);

        this.promise = new Promise(function (resolve, reject) {
            context.__resolve = resolve;
            context.__reject = reject;
        });

        this.index = -1;
        this.settled = false;
    }

    _createClass(PipelineContext, [{
        key: 'setupSteps',
        value: function setupSteps(steps) {
            var stepGroups = {
                request: [],
                response: [],
                requestError: [],
                responseError: []
            };

            steps.forEach(function (step) {
                if (step.request) {
                    stepGroups.request.push({
                        method: step.request,
                        context: step
                    });
                } else {
                    stepGroups.request.push(null);
                }

                if (step.requestError) {
                    stepGroups.requestError.push({
                        method: step.requestError,
                        context: step
                    });
                } else {
                    stepGroups.requestError.push(null);
                }

                if (step.response) {
                    stepGroups.response.push({
                        method: step.response,
                        context: step
                    });
                } else {
                    stepGroups.response.push(null);
                }

                if (step.responseError) {
                    stepGroups.responseError.push({
                        method: step.responseError,
                        context: step
                    });
                } else {
                    stepGroups.responseError.push(null);
                }
            });

            var validPipeline = stepGroups.request.some(function (step) {
                return step !== null;
            });

            if (!validPipeline) {
                throw new Error('This pipeline cannot handle requests');
            }

            this.max = stepGroups.request.length;
            this.steps = stepGroups;
        }
    }, {
        key: 'resolve',
        value: function resolve(value) {
            this.value = value;
            this.end();
        }
    }, {
        key: 'reject',
        value: function reject(error) {
            this.error = error;
            this.end();
        }
    }, {
        key: 'dispatchResult',
        value: function dispatchResult() {
            var processors = this.steps.response;
            var result = Promise.resolve(this.value);

            if (processors.length) {
                // chain output processors into a stream of promises, but in reverse order,
                // starting from the index where the result was dispatched
                var index = this.index + 1;

                var _loop = function () {
                    var processor = processors[index];
                    if (!processor) return 'continue';

                    result = result.then(function (value) {
                        return processor.method.call(processor.context, value);
                    });
                };

                while (index--) {
                    var _ret = _loop();

                    if (_ret === 'continue') continue;
                }
            }

            this.__resolve(result);
        }
    }, {
        key: 'dispatchError',
        value: function dispatchError() {
            this.__reject(this.error);
        }
    }, {
        key: 'next',
        value: function next() {
            if (this.settled) return;

            this.index++;
            this.step();

            if (this.index === this.max && !this.settled) {
                this.reject(new Error('The input is not processable'));
            }
        }
    }, {
        key: 'step',
        value: function step() {
            if (this.settled) return;

            var stepObject = this.steps.request[this.index];

            if (stepObject) {
                stepObject.method.call(stepObject.context, this);
            }
        }
    }, {
        key: 'end',
        value: function end() {
            this.settled = true;

            if (this.error) {
                this.dispatchError();
            } else {
                this.dispatchResult();
            }
        }
    }], [{
        key: 'create',
        value: function create(steps) {
            return new PipelineContext(steps);
        }
    }]);

    return PipelineContext;
})();

    if (typeof define === 'function' && define.amd) {
        define(function() {
            return Pipeline;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Pipeline;
    } else {
        global.Pipeline = Pipeline;
    }

})(this);