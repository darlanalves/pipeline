(function(global) {

    /* content goes here */

    if (typeof define === 'function' && define.amd) {
        define('jspipe', function() {
            return Pipeline;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = Pipeline;
    } else {
        global.Pipeline = Pipeline;
    }

})(this);
