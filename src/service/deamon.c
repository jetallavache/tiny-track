#include "deamon.h"

#include <signal.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <syslog.h>
#include <unistd.h>

void d_daemon_create() {
  pid_t pid;
  /* Fork off the parent process */
  pid = fork();
  /* An error occurred */
  if (pid < 0) exit(EXIT_FAILURE);
  /* Success: Let the parent terminate */
  if (pid > 0) exit(EXIT_SUCCESS);
  /* On success: The child process becomes session leader */
  if (setsid() < 0) exit(EXIT_FAILURE);
  /* Catch, ignore and handle signals */
  /*TODO: Implement a working signal handler */
  signal(SIGCHLD, SIG_IGN);
  signal(SIGHUP, SIG_IGN);
  /* Fork off for the second time*/
  pid = fork();
  /* An error occurred */
  if (pid < 0) exit(EXIT_FAILURE);
  /* Success: Let the parent terminate */
  if (pid > 0) exit(EXIT_SUCCESS);
  /* Set new file permissions */
  umask(0);
  /* Change the working directory to the root directory */
  /* or another appropriated directory */
  chdir("/");
  /* Close all open file descriptors */
  int x;
  for (x = sysconf(_SC_OPEN_MAX); x >= 0; x--) {
    close(x);
  }
  /* Open the logger file */
  openlog("tinytrack", LOG_PID, LOG_DAEMON);
}

void d_sevice_start() {
  d_daemon_create();

  while (1) {
    // TODO: Insert daemon code here.
    syslog(LOG_NOTICE, "First daemon started.");
    sleep(20);

    syslog(LOG_NOTICE, "First daemon continue.");
    sleep(20);
    break;
  }

  syslog(LOG_NOTICE, "First daemon terminated.");
  closelog();
}