const _ = require("lodash");
const assert = require("assert");

const createRouter = require('@arangodb/foxx/router');

const Mixins = require("./mixins");

var UX = require("./strategy/UX");

var self = module.exports = {

    options: function(arg) {
        if (_.isFunction(arg)) {
            arguments.shift();
            return arg.apply(this, arguments);
        }
        if (_.isObject(arg)) {
            return _.extend.apply(this, arguments);
        }
        console.error("invalid options: %o", arguments);
        throw new Error("invalid options");
    },

    /**
     * Initialise the module API and openapi
     *
     * @param options
     * @returns {{options: *, router: *, apis: {}, api: api}}
     * @constructor
     */
    Module: function(options) {

        assert(options, "Missing Module options");
        assert(options.context, "Missing Module context");
        assert(options.manifest, "Missing Module manifest");

        const router = options.router = options.router || createRouter();
        const META_PREFIX = "/meta4";
//        const now = new Date().getTime();

        options.manifest.models = [];
        var manifest = _.pick(options.manifest, [ "name", "version", "description", "thumbnail",  "author", "license" ]);

        var about = _.extend(manifest, {
            path: options.context.service.mount,
            prefix: options.context.collectionPrefix,
            basePath: options.context.baseUrl,
            models: options.manifest.models,
            isProduction: options.context.isProduction,
            isDevelopment: options.context.isDevelopment,
            home: options.context.baseUrl+"/"+options.manifest.defaultDocument
        } );

        console.log("*** depends on: %o", _.keys(module.context.dependencies));

        // Module Meta-Data

        router.get(META_PREFIX+"/module", function (req, res) {
            res.send(about);
        })
        .response(['application/json'], about.name+" module manifest")
        .summary('Module manifest for '+about.name)
        .description('Returns a module manifest for: '+about.description);

        // Module API Docs

        router.use("openapi", module.context.createDocumentationRouter())
        .summary("OpenAPI Documentation")
        .description("API documentation for the "+about.description);

        var apis = {};

        return { options: options, router: router, apis: apis,
            api: function(defn, _options) {
                assert(defn, "Missing API definition");
                assert(options.router, "Missing API router");

                var api = defn.router?defn:new self.API(options, defn);
                console.log("%s API: %o -> %o", defn.router?"Existing":"New", api.name, _.keys(api));
                assert(api.name, "Missing API name");

                apis[api.name] = api;
                return defn;
            }
        };
    },

    API: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing API options");
        assert(options.context, "Missing API context");
        assert(options.name, "Missing API local name");
        assert(options.singular, "Missing API's singular name");
        assert(options.plural, "Missing API's plural name");

        var strategy = options.strategy || "CRUD";
        var Strategy = _.isFunction(strategy)?strategy:require("./strategy/"+strategy);
        assert(Strategy, "Unknown strategy: "+strategy);

        console.log("API: %s @ %s -> ", options.name, options.manifest.name, strategy);

        var mixins = new Mixins(options);

        var api = new Strategy(options, mixins);
        assert(api, "Invalid API Strategy");
        assert(api.router, "Missing API router");

        console.log("API Strategy: %s => %o => %o", options.name, strategy, _.keys(api));
        return api;
    },

    UX: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing UX options");

        return UX(options);
    },

    Setup: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing Model options");
        assert(options.name, "Missing Model local name");
        assert(options.db, "Missing Model db");
        assert(options.context, "Missing Model context");

        const db = options.db;
        const coll_name = options.collection || options.name;
        const qName = options.context.collectionName(coll_name);
        var manifest = options.context.service.manifest;

        switch(options.model) {
            case "graph":
                if (!db._collection(qName)) {
                    var graph = db._createEdgeCollection(qName);
                    console.log("created graph: %s.", qName);
                    if (options.example) {
                        graph.insert(options.example);
                        console.log("example: %s created.", qName);
                    }
                } else {
                    console.log("graph %s found", qName);
                }
                break;

            case "collection":
            default:
                if (!db._collection(qName)) {
                    var coll = db._createDocumentCollection(qName);
                    console.log("created [%s] collection: %s", manifest.name, qName);

                    var examples = options.examples || [];
                    options.example && examples.push(options.example);
                    _.each(examples, function(example) { coll.insert(example) })
                    console.log("examples created: %s", _.keys(examples));

                } else {
                    console.log("[%s] collection %s found.", manifest.name, qName);
                }
                break;
        }

        var model = db._collection(qName);
        assert(model, "Model Ssetup failed: "+qName);
        return model;
    },

    Teardown: function(_defaults, _options) {
        var options = _.extend({}, _defaults, _options);

        assert(options, "Missing Model options");
        assert(options.name, "Missing Model local name");
        assert(options.db, "Missing Model db");
        assert(options.context, "Missing Model context");

        const db = options.db;
        const qName = options.context.collectionName(options.name);
        db.drop(qName);
        var model = db._collection(qName);
        assert(!model, "Model Teardown failde: "+qName);
        return true;
    },

    exports: {
        "pkg": require("../package"),
        "RBAC": require("./RBAC"),
        "Vault": require("./Vault"),
        "json-to-json-schema": require('json-to-json-schema'),
        "moment": require('moment'),
        "joi": require('joi'),
        "enjoi": require('enjoi'),
        "javascript-state-machine": require("javascript-state-machine")
    }
};
