class Pipeline {
    constructor() {
        this.$$pipe = [];
    }

    push(fn) {
        this.$$pipe.push(fn);
        return this;
    }

    run(value) {
        var context = PipelineContext.create(this.$$pipe);

        context.value = value;
        context.next();

        return context.promise;
    }
}

class PipelineContext {
    constructor(steps) {
        let context = this;

        this.setupSteps(steps);

        this.promise = new Promise(function(resolve, reject) {
            context.__resolve = resolve;
            context.__reject = reject;
        });

        this.index = -1;
        this.settled = false;
    }

    setupSteps(steps) {
        let stepGroups = {
            request: [],
            response: [],
            requestError: [],
            responseError: []
        };

        steps.forEach(function(step) {
            if (step.request) {
                stepGroups.request.push({
                    method: step.request,
                    context: step
                });
            }

            if (step.requestError) {
                stepGroups.requestError.push({
                    method: step.requestError,
                    context: step
                });
            }

            if (step.response) {
                stepGroups.response.push({
                    method: step.response,
                    context: step
                });
            }

            if (step.responseError) {
                stepGroups.responseError.push({
                    method: step.responseError,
                    context: step
                });
            }
        });

        if (!stepGroups.request.length) {
            throw new Error('This pipeline cannot handle requests');
        }

        this.max = stepGroups.request.length;
        this.steps = stepGroups;
    }

    resolve(value) {
        this.value = value;
        this.end();
    }

    reject(error) {
        this.error = error;
        this.end();
    }

    dispatchResult() {
        let processors = this.steps.response;
        let result = Promise.resolve(this.value);

        if (processors.length) {
            // chain output processors into a stream of promises
            result = processors.reduce(function(promise, processor) {
                return promise.then(value => processor.method.call(processor.context, value));
            }, result);
        }

        this.__resolve(result);
    }

    dispatchError() {
        this.__reject(this.error);
    }

    next() {
        if (this.settled) return;

        this.index++;
        this.step();

        if (this.index === this.max && !this.settled) {
            this.reject(new Error('The input is not processable'));
        }
    }

    step() {
        if (this.settled) return;

        let stepObject = this.steps.request[this.index];

        if (stepObject) {
            stepObject.method.call(stepObject.context, this);
        }
    }

    end() {
        this.settled = true;

        if (this.error) {
            this.dispatchError();
        } else {
            this.dispatchResult();
        }
    }

    static create(steps) {
        return new PipelineContext(steps);
    }
}
