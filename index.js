const express = require('express');
const cors = require('cors');
const chalk = require('chalk');
const api = require('swagger-repo');
const liveReload = require('swagger-repo/lib/livereload');
const OpenAPISnippet = require('openapi-snippet');
const fs = require('fs');

const defaultOptions = {
    livereload: true,
    port: 8080,
};


/**
 *
 *  ENRICH WITH CODE EXAMPLES
 *
 */

function enrichSchema(schema){
    for(let path in schema.paths){
        for(let method in schema.paths[path]){
            let generatedCode = OpenAPISnippet.getEndpointSnippets(schema, path, method, snippets);
            schema.paths[path][method]["x-code-samples"] = [];
            for(let snippetIdx in generatedCode.snippets){
                let snippet = generatedCode.snippets[snippetIdx];
                schema.paths[path][method]["x-code-samples"][snippetIdx] = { "lang": snippet.title, "source": snippet.content };
            }
        }
    }
    return schema;
}

const snippets = ['shell_curl', 'javascript_xhr', 'node_native', 'java_okhttp', 'csharp_restsharp', 'php_curl', 'go_native', 'python_python3'];
/*  Available snippets:
    c_libcurl (default)
    csharp_restsharp (default)
    go_native (default)
    java_okhttp
    java_unirest (default)
    javascript_jquery
    javascript_xhr (default)
    node_native (default)
    node_request
    node_unirest
    objc_nsurlsession (default)
    ocaml_cohttp (default)
    php_curl (default)
    php_http1
    php_http2
    python_python3 (default)
    python_requests
    ruby_native (default)
    shell_curl (default)
    shell_httpie
    shell_wget
    swift_nsurlsession
 */
const oldBundle = api.bundle;
api.bundle = options => {
    try {
        const spec = oldBundle(options);
        if (!options.skipCodeSamples) {
            return enrichSchema(spec);
        }
        return spec;
    } catch (e) {
        console.log(e);
        throw e;
    }
};


const [,,param] = process.argv;


/**
 *
 *  BUILD
 *
 */

if (param === 'build') {
    require('swagger-repo/bin/swagger-repo');
}


/**
 *
 *  PROD SERVER
 *
 */

if (param === 'prod') {
    const app = express();
    app.use(cors());
    app.use(express.static(__dirname + '/web_deploy'));
    app.use('/swagger-ui', api.swaggerUiMiddleware(defaultOptions));
    app.listen(defaultOptions.port);

    const baseUrl = 'http://localhost:' + defaultOptions.port;
    console.log('\nProduction server started \n');
    console.log(`  ${chalk.green('✔')} Documentation (ReDoc):\t${chalk.blue(chalk.underline(baseUrl))}`);
    console.log(`  ${chalk.green('✔')} Documentation (SwaggerUI):\t${chalk.blue(chalk.underline(baseUrl + '/swagger-ui/'))}`);
}


/**
 *
 * DEV SERVER
 *
 */

if (param === 'dev') {
    const rapidocHtml = fs.readFileSync('./web/rapidoc.html')
        .toString()
        .replace('{{rapidocHead}}', defaultOptions.livereload ? liveReload.LIVERELOAD_SCRIPT : '');

    const app = express();
    app.use(cors());

    // files
    app.get('/', api.indexMiddleware);
    app.use('/', api.specMiddleware(defaultOptions));

    // swagger
    app.use('/swagger-ui', api.swaggerUiMiddleware(defaultOptions));
    app.use('/swagger-editor', api.swaggerEditorMiddleware(defaultOptions));

    // rapi-doc
    const router = express.Router();
    router.get('/', (req, res) => res.send(rapidocHtml));
    app.use('/rapidoc/', router);

    //other staff
    app.use(function(err, req, res, next) {
        console.error(err.stack);
        res.status(500)
            .json({error: err.message});
        next(err);
    });
    app.listen(defaultOptions.port);
    liveReload.startLiveReload(defaultOptions, () => {
        if (defaultOptions.validate) {
            api.validate(api.bundle(defaultOptions), defaultOptions, err => {
                if (err) console.log();
            });
        }
    });

    const baseUrl = 'http://localhost:' + defaultOptions.port;
    console.log('\nDevelopment server started: \n');
    console.log(`  ${chalk.green('✔')} Documentation (ReDoc):\t${chalk.blue(chalk.underline(baseUrl))}`);
    console.log(`  ${chalk.green('✔')} RapiDoc: \t\t\t${chalk.blue(chalk.underline(baseUrl + '/rapidoc/'))}`);
    console.log(`  ${chalk.green('✔')} Documentation (SwaggerUI):\t${chalk.blue(chalk.underline(baseUrl + '/swagger-ui/'))}`);
    console.log(`  ${chalk.green('✔')} Swagger Editor: \t\t${chalk.blue(chalk.underline(baseUrl + '/swagger-editor/'))}\n`);
    console.log('Watching changes...');
}
