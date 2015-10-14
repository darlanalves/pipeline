# Processing Pipeline

## Usage

```js

let pipeline = new Pipeline();

let firstLayer = {
	request: function(input) {
		// cannot handle the request
		if (input.value !== 'foo') {
			input.next();
		}

		input.resolve('foo');
	},

	response: function(value) {
		return 'the ' + value;
	}
};

let secondLayer = {
	request: function(input) {
		// handle the request
		input.resolve('response');
	}
};

pipeline.run('request').then(function(result) {
	// result comes from the __second__ layer here
	// after being processed in the __first__ layer
	// having the value 'the response'
});

pipeline.run('foo').then(function(result) {
	// result now comes from the __first__ layer,
	// and 'the foo' is the returned value
});


```