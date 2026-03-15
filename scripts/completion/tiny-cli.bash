# bash completion for tiny-cli
# Install: source this file or copy to /etc/bash_completion.d/tiny-cli

_tiny_cli() {
  local cur prev words cword
  _init_completion || return

  local commands="status metrics history signal service debug dashboard version"
  local global_opts="--path --config --pid --format --interval --no-color --verbose --help --version"

  case "$prev" in
    --path|--config|--pid)
      _filedir
      return ;;
    --format)
      COMPREPLY=($(compgen -W "table json compact" -- "$cur"))
      return ;;
    --interval)
      COMPREPLY=($(compgen -W "500 1000 2000 5000" -- "$cur"))
      return ;;
    signal)
      COMPREPLY=($(compgen -W "hup usr1 usr2 term" -- "$cur"))
      return ;;
    service)
      COMPREPLY=($(compgen -W "start stop restart status enable disable" -- "$cur"))
      return ;;
    history)
      COMPREPLY=($(compgen -W "l1 l2 l3 --count" -- "$cur"))
      return ;;
  esac

  # Find the command word (first non-option arg after tiny-cli)
  local cmd=""
  for ((i = 1; i < cword; i++)); do
    if [[ "${words[i]}" != -* ]]; then
      cmd="${words[i]}"
      break
    fi
  done

  if [[ -z "$cmd" ]]; then
    if [[ "$cur" == -* ]]; then
      COMPREPLY=($(compgen -W "$global_opts" -- "$cur"))
    else
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
    fi
  fi
}

complete -F _tiny_cli tiny-cli
