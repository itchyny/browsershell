#! /usr/bin/env node

var http = require('http'),
    io = require('socket.io'),
    fs = require('fs'),
    child_process = require('child_process'),
    sys = require('sys'),
    net = require('net'),
    jsdom = require('jsdom');

var conts = {},
    server = null,
    content = fs.readFileSync(__dirname + '/index.html', 'utf8'),
    document = jsdom.jsdom(content),
    window = document.createWindow();


['/main.js', '/socket.io.js', '/jquery-1.5.1.min.js', '/main.css']
  .forEach(function (x) { conts[x] = fs.readFileSync(__dirname + x, 'utf8'); });

(function () {
  server = http.createServer(function (req, res) {
    if(req.url === '/') {
      res.writeHeader(200, {
        'Content-Type': 'text/html'
      });
      res.end(content);
    } else if(/.*\.js/.test(req.url)) {
      res.writeHeader(200, {
        'Content-Type': 'text/javascript'
      });
      res.end(conts[req.url]);
    } else if(/.*\.css/.test(req.url)) {
      res.writeHeader(200, {
        'Content-Type': 'text/css'
      });
      res.end(conts[req.url]);
    }
  });
  server.listen(8000);
})();
/*
jsdom.env(content, ['http://code.jquery.com/jquery-1.5.min.js'], function (e, window) {
  server = http.createServer(function (req, res) {
    if(req.url === '/') {
      res.writeHeader(200, {
        'Content-Type': 'text/html'
      });
      res.end(window.document.innerHTML);
    } else if(/.*\.js/.test(req.url)) {
      res.writeHeader(200, {
        'Content-Type': 'text/javascript'
      });
      res.end(conts[req.url]);
    } else if(/.*\.css/.test(req.url)) {
      res.writeHeader(200, {
        'Content-Type': 'text/css'
      });
      res.end(conts[req.url]);
    }
  });
  server.listen(8000);
});
*/

(function () {

socketinit();
return;

  function socketinit () {
    try {
      io.listen(server)
        .on('connection', function (client) {
          var cId = client.sessionId;
          var prevspawn;
          client.send('log in');
          client.broadcast(cId + ' log in');
          console.log(cId + ' log in');
          client.on('message', function (mes) {
            client.broadcast(mes);
            var q = mes.replace(/ /g, '');
            if(['ghci', 'zsh'/*, 'python'*/].indexOf(q) >= 0) {
              prevspawn = spawn(mes, client);
              return;
            }
            if(prevspawn) {
              try {
                prevspawn.stdin.on('data', function (e, d) {
                  if(e) throw e;
                  console.log(d.toString());
                }).write(mes + '\n');
                return;
              } catch (e) {
                prevspawn = null;
                // and through
              }
            }
            child_process.exec(mes, function(e, stdout, stderr) {
              if(stderr || e) {
                spawn(mes, client);
                return;
              }
              if(stdout) {
                client.send(stdout.toString());
                client.broadcast(stdout.toString());
                return;
              }
              if(!stderr && !stdout) {
                client.send('');
                client.broadcast('');
                return;
              }
            });
          });
          client.on('disconnect', function () {
            client.broadcast(cId + ' disconnected')
            console.log(cId + ' disconnected')
            try {
              kill(prevspawn);
            } catch (e) {};
          });
        });
    } catch (e) {
      setTimeout(socketinit, 200);
    }
  };

  function kill (process) {
    process.kill(signal='SIGTERM');
  };

  function spawn (mes, client) {
    var cId = client.sessionId;
    var n = toArray(mes);
    var send = (function () {
      var stream = '',
          timer,
          len = 0;
      return function (d) {
        stream += d.toString();
        if(/execvp/.test(stream)) {
          client.send('command not found');
          client.broadcast('command not found');
          return;
        }
        ++len;
        if(timer) clearTimeout(timer);
        timer = setTimeout(function () {
          client.send(stream);
          client.broadcast(stream);
          stream = '';
          len = 0;
        }, 100);
        if(len > 1000) {
          clearTimeout(timer);
          client.send(stream);
          stream = '';
          len = 0;
        }
      };
    })();
    try {
      var c = child_process.spawn(n[0], n.slice(1));
      c.stdout.on('data', send);
      c.stderr.on('data', send);
    } catch (e) {
      send('command not found');
    }
    return c;
  };

  function toArray (s) {
    var i = 0, j = i, f = false, a = [];
    while(s[i] === ' ' || s[i] === '\t') ++i;
    while(s[++i] !== undefined) {
      f = false;
      while(s[i] !== ' ' && s[i] !== '\t' && s[i] !== undefined) {
        if(s[i] === '"') { f = true; break; };
        ++i;
      }
      if(f) { ++i; ++j; while(s[i] !== '"' && s[i] !== undefined) ++i; }
      a[a.length] = s.slice(j, i);
      if(f) { ++i; }; j = i + 1;
    }
    return a;
  };

})();
