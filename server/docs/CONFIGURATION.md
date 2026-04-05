CONFIGURATION
=============

Default config file: /etc/tinytrack/tinytrack.conf

Parameter priority (highest to lowest):

  1. Command-line arguments  (--config, -p PORT)
  2. Environment variables   (TT_PROC_ROOT, TT_ROOTFS_PATH, ...)
  3. Config file             (/etc/tinytrack/tinytrack.conf)
  4. Built-in defaults


CONFIG FILES
------------

  etc/tinytrack.conf         production (host)
  etc/tinytrack.conf-docker  Docker / container
  etc/tinytrack.conf-debug   local debug / foreground
  tests/tinytrack.conf-test  automated tests


SECTION [tinytd]
----------------

  user            daemon user after privilege drop     (default: tinytd)
  group           daemon group                         (default: tinytd)
  pid_file        path to PID file
                  (default: /var/run/tinytd.pid)
  log_backend     logging backend (see below)          (default: auto)
  log_level       minimum log level                    (default: info)

  log_backend values:
    auto      select automatically: journal -> syslog -> stderr
    stderr    standard error with timestamp
    stdout    standard output with timestamp
    docker    stdout without timestamp (Docker adds it)
    syslog    traditional UNIX syslog
    journal   systemd journal

  log_level values (ascending severity):
    debug  info  notice  warning  error


SECTION [collection]
--------------------

  interval_ms       collection interval, ms            (default: 1000)
                    ENV: TT_INTERVAL_MS
  du_interval_sec   disk usage refresh interval, s     (default: 30)
                    ENV: TT_DU_INTERVAL_SEC
  proc_root         path to /proc                      (default: /proc)
                    ENV: TT_PROC_ROOT
  rootfs_path       path to root filesystem            (default: /)
                    ENV: TT_ROOTFS_PATH

  In Docker with bind-mounted host /proc and /:
    proc_root   = /host/proc
    rootfs_path = /host/rootfs


SECTION [storage]
-----------------

  live_path                 live ring buffer file (tmpfs)
                            (default: /dev/shm/tinytd-live.dat)
                            ENV: TT_LIVE_PATH
  shadow_path               persistent shadow copy
                            (default: /var/lib/tinytrack/tinytd-shadow.dat)
                            ENV: TT_SHADOW_PATH
  shadow_sync_interval_sec  shadow sync interval, s    (default: 60)
  file_mode                 file permissions, decimal  (default: 416 = 0640)

  NOTE: live_path must be on tmpfs (/dev/shm).
  In Docker use a distinct name to avoid conflict with host daemon
  when /dev/shm is shared (e.g. tinytd-docker-live.dat).


SECTION [ringbuffer]
--------------------

  l1_capacity         L1 ring capacity, samples        (default: 3600)
                      ENV: TT_L1_CAPACITY
  l2_capacity         L2 ring capacity, samples        (default: 1440)
                      ENV: TT_L2_CAPACITY
  l3_capacity         L3 ring capacity, samples        (default: 720)
                      ENV: TT_L3_CAPACITY
  l2_agg_interval_sec L1->L2 aggregation interval, s  (default: 60)
                      ENV: TT_L2_AGG_INTERVAL
  l3_agg_interval_sec L2->L3 aggregation interval, s  (default: 3600)
                      ENV: TT_L3_AGG_INTERVAL

  Coverage calculation:
    L1: l1_capacity * interval_ms / 1000  seconds
    L2: l2_capacity * l2_agg_interval_sec seconds
    L3: l3_capacity * l3_agg_interval_sec seconds


SECTION [recovery]
------------------

  enable_crc    verify Adler-32 checksum on recovery   (default: true)
  auto_recover  restore buffer from shadow on start    (default: true)


SECTION [gateway]
-----------------

  user              gateway user after privilege drop  (default: tinytrack)
  group             gateway group                      (default: tinytrack)
  pid_file          path to PID file
                    (default: /var/run/tinytrack.pid)
  log_backend       logging backend                    (default: auto)
                    ENV: TT_LOG_BACKEND
  log_level         minimum log level                  (default: info)
                    ENV: TT_LOG_LEVEL
  listen            listen address
                    (default: ws://0.0.0.0:25015)
                    ENV: TT_LISTEN
                    Use wss:// to enable TLS.
  update_interval   push interval to clients, ms       (default: 1000)
                    ENV: TT_UPDATE_INTERVAL
  tls_cert          PEM certificate file               (default: none)
                    ENV: TT_TLS_CERT
  tls_key           PEM private key file               (default: none)
                    ENV: TT_TLS_KEY
  tls_ca            PEM CA bundle (client cert auth)   (default: none)
                    ENV: TT_TLS_CA


TLS
---

Change listen to wss:// and set cert/key:

  [gateway]
  listen   = wss://0.0.0.0:25015
  tls_cert = /etc/tinytrack/server.crt
  tls_key  = /etc/tinytrack/server.key

Generate a self-signed certificate for testing:

  openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt \
      -days 365 -nodes -subj '/CN=localhost'
