import * as http from 'http';
import concat from 'concat-stream';

const server = http.createServer(function(req, res) {
    req.setEncoding('utf-8');
    console.log('--- REQUEST START ---');
    console.log('%s %s %s', req.method, req.url, req.httpVersion);
    console.log(req.rawHeaders);
    console.log('\n');
    console.log();
    req.pipe(concat({ encoding: 'string' }, function(body) {
        console.log(body);
        console.log('--- REQUEST END ---');
        res.statusCode = 200;
        res.end();
    }));
});

server.listen(5059);
server.on('listening', function() {
    console.error('Server listening');
});
server.on('error', function(error) {
    console.error('Error:', error);
    process.exit(1);
});
