'use strict';

const _ = require("lodash");
const assert = require("assert");

const mixins = [ require("./meta4"), require("./Crypto"), require("./ContextCollection"), require("./NestedModels") ];

module.exports = function() {

    const Mixin = function(self, action, args) {
        _.each(mixins, function(mixin) {
            mixin[action] && mixin[action].apply(self, args);
        })
    }

    return {

        configure: function(options) {
            Mixin(this, "configure", arguments);
        },
        endpoint: function(endpoint, options) {
            Mixin(this, "endpoint", arguments);
        },
        beforeRequest: function(model, req, res, options) {
            Mixin(this, "beforeRequest", arguments);
        },
        beforeCreate: function(model, req, res, options) {
            Mixin(this, "beforeCreate", arguments);
        },
        afterCreate: function(model, req, res, options) {
            Mixin(this, "afterCreate", arguments);
        },
        beforeUpdate: function(model, req, res, options) {
            Mixin(this, "beforeUpdate", arguments);
        },
        afterUpdate: function(model, req, res, options) {
            Mixin(this, "afterUpdate", arguments);
        },
        beforeRead: function(queryBy, req, res, options) {
            Mixin(this, "beforeRead", arguments);
        },
        afterRead: function(models, req, res, options) {
            Mixin(this, "afterRead", arguments);
        },
        beforeDelete: function(model, req, res, options) {
            Mixin(this, "beforeDelete", arguments);
        }
    }
}
