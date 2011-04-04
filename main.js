/*
history
↑

*/


init();

  function init () {
    try {
      $, io;
      var socket = new io.Socket(''); 
      var $result = $('#result'),
          $textarea = $('textarea').focus(),
          ps = ' $ ',
          view = function (s) {
            $textarea.val($textarea.val() + s + ps);
            $textarea.scrollTop($textarea.scrollTop() + 9e6);
            $textarea[0].selectionStart = $textarea[0].textLength;
          },
          state = 'disconnected',
          connect = function () {
            socket.connect();
            setTimeout(function () {
              if(state !== 'connected') {
                connect();
              }
            }, 2000);
          };
      socket.on('connect', function(){
        view('connected\n');
        state = 'connected';
      }).on('message', function(m){
        view(m + '\n');
      }).on('disconnect', function(){
        view('disconnected' + '\n');
        state = 'disconnected';
        connect();
      });
      $textarea.keydown(function(e){
        if(e.keyCode === 13){
          var $textarea = $(this);
          if($textarea[0].selectionStart != $textarea[0].textLength){
            e.preventDefault();
            $textarea.val($textarea.val() + '\n');
            $textarea[0].selectionStart = $textarea[0].textLength;
          }
          setTimeout(function () {
            var c = ($textarea.val().split('\n').slice(-2)[0].replace(ps, ''));
            if(c.replace(/( |\n)+/g, '') === '') {
              view('\n');
            } else if(c.replace(/( |\n)+/g, '') === 'clear') {
              $textarea.val('');
              view('\n');
            } else if(c.replace(/( |\n)+/g, '') === 'connect') {
              connect();
            } else {
              socket.send(c);
            }
          }, 20);
        }
      });
      connect();
    } catch(e) {
      setTimeout(init, 100);
    }
  }
