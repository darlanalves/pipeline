/* globals Pipeline */
describe('Pipeline', function() {
    describe('#constructor()', function() {
        it('should initialize the instance', function() {
            var instance = new Pipeline();
            expect(instance.$$pipe).toEqual([]);
        });
    });

    describe('#push(Function handler)', function() {
        it('should append a handler function to pipeline', function() {
            var instance = new Pipeline();
            var handler = function() {};

            var result = instance.push(handler);

            expect(instance.$$pipe).toEqual([handler]);
            expect(result).toBe(instance);
        });
    });

    describe('#run(input) => Promise', function() {
        it('should pass the input down the pipeline', function(done) {
            // input processor
            let inputFn = jasmine.createSpy('request').and.callFake(function(context) {
                context.resolve(context.value + 1);
            });

            // output processor
            let outputFn = jasmine.createSpy('response').and.callFake(function(value) {
                return value + 20;
            });

            let node = {
                request: inputFn,
                response: outputFn
            };

            let input = 1;

            let pipeline = new Pipeline();

            // add our step to the pipeline
            pipeline.push(node);

            let result = pipeline.run(input);

            let response;
            result.then(function(value) {
                response = value;
            });

            setTimeout(function() {
                expect(node.request).toHaveBeenCalled();
                expect(node.response).toHaveBeenCalledWith(2);

                // expected output: input > + 1 >> + 20 = 22;
                expect(response).toBe(22);
                done();
            }, 10);

        });

        it('should execute the pipeline steps', function(done) {

            /**
             * Simulation: a pipeline with two layers:
             * - cache
             * - http
             *
             * > A request for a value enters the pipe and a Promise is returned
             * > A cache miss on a given input jumps to the next node in the chain
             * > A request is made to gather info from somewhere else...
             *
             * < The returning value must do a roundtrip all the way back to the start
             * < On the way back, the cache captures the return from the second layer
             * < Finally, the value is dispatched through the Promise
             */

            class CacheLayer {
                constructor() {
                    this.cache = {};
                    this.count = 0;
                }

                request(input) {
                    this.count++;

                    let id = input.value;

                    // cache hit
                    if (id in this.cache) {
                        let value = this.cache[id];
                        input.resolve(value);
                        return;
                    }

                    // go to next stage on cache miss
                    input.next();
                }

                // stores the response for further access
                response(value) {
                    this.cache[value.id] = value;
                    return value;
                }
            }

            class HttpLayer {
                constructor() {
                    this.count = 0;
                }

                request(input) {
                    this.count++;
                    let id = input.value;

                    input.resolve({
                        id: id,
                        name: 'John Doe',
                        email: 'john@doe.com'
                    });
                }
            }

            var pipeline = new Pipeline();

            var cache = new CacheLayer();
            var http = new HttpLayer();

            pipeline.push(cache);
            pipeline.push(http);

            // a top-level API that uses the pipeline to execute a task
            function findById(id) {
                return pipeline.run(id);
            }

            var expectedUser = {
                id: 123,
                name: 'John Doe',
                email: 'john@doe.com'
            };

            let results = [];

            findById(123).then(user => results.push(user)).then(function() {
                // repeat the request to trigger the cache this time
                findById(123).then(user => results.push(user));
            });


            setTimeout(function() {
                expect(results[0]).toEqual(expectedUser);
                expect(results[1]).toEqual(expectedUser);

                // two calls on cache
                expect(cache.count).toBe(2);

                // only one call in the second level due to cache hit
                expect(http.count).toBe(1);

                done();
            }, 20);
        });

        it('should throw an error if no steps on pipe have request handlers', function() {
            var pipeline = new Pipeline();

            pipeline.push({});
            pipeline.push({});

            function test() {
                pipeline.run();
            }

            expect(test).toThrow(new Error('This pipeline cannot handle requests'));
        });

        it('should reject the promise if no step can handle the input', function(done) {
            let pipeline = new Pipeline();

            let step = {
                request: input => input.next()
            };

            pipeline.push(step);

            let result;
            pipeline.run().catch(function(e) {
                result = e;
            });

            setTimeout(function() {
                expect(result).not.toBe(undefined);
                expect(result.message).toBe('The input is not processable');
                done();
            }, 20);
        });

        it('should invoke the response handlers starting where the request was fulfilled and going backwards', function (done) {
            let pipeline = new Pipeline();

            let stepOne = {
                request: input => input.next(),
                response: output => output + ' one'
            };

            let stepTwo = {
                request: input => input.resolve('ok'),
                response: output => output + ' two'
            };

            let stepThree = {
                request: input => input.next(),
                response: output => output + ' three'
            };

            let stepFour = {
                request: input => input.next(),
                response: output => output + ' NOPE'
            };

            pipeline.push(stepOne);
            pipeline.push(stepTwo);
            pipeline.push(stepThree);
            pipeline.push(stepFour);

            let result;
            pipeline.run().then(function(e) {
                result = e;
            });

            setTimeout(function () {
                // ok from the response + the 3 steps in reverse
                expect(result).toBe('ok two one');
                done();
            }, 50);
        });
    });
});
