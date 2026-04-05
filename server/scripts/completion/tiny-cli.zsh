#compdef tiny-cli
# zsh completion for tiny-cli
# Install: copy to a directory in $fpath, e.g. /usr/share/zsh/site-functions/_tiny-cli

_tiny-cli() {
  local context state state_descr line
  typeset -A opt_args

  _arguments -C \
    '--path[mmap file path]:file:_files' \
    '--config[config file path]:file:_files' \
    '--pid[pid file path]:file:_files' \
    '--format[output format]:format:(table json compact)' \
    '--interval[refresh interval ms]:ms:(500 1000 2000 5000)' \
    '--no-color[disable colors]' \
    '--verbose[verbose output]' \
    '--help[show help]' \
    '--version[show version]' \
    '1:command:->command' \
    '*::args:->args'

  case $state in
    command)
      local commands=(
        'status:show daemon and ring buffer status'
        'metrics:show live metrics'
        'history:show historical data'
        'signal:send signal to daemon'
        'service:manage service'
        'debug:run diagnostics'
        'dashboard:interactive ncurses dashboard'
        'version:show version'
      )
      _describe 'command' commands ;;

    args)
      case $words[1] in
        signal)
          local signals=(
            'hup:reload configuration (SIGHUP)'
            'usr1:rotate logs (SIGUSR1)'
            'usr2:dump state (SIGUSR2)'
            'term:graceful shutdown (SIGTERM)'
          )
          _describe 'signal' signals ;;
        service)
          local actions=(
            'start:start the daemon'
            'stop:stop the daemon'
            'restart:restart the daemon'
            'status:show service status'
            'enable:enable autostart'
            'disable:disable autostart'
          )
          _describe 'action' actions ;;
        history)
          _arguments \
            '1:level:(l1 l2 l3)' \
            '--count[number of samples]:n' ;;
      esac ;;
  esac
}

_tiny-cli "$@"
