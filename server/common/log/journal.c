#include "log_internal.h"

#ifdef HAVE_SYSTEMD
#include <stdio.h>
#include <stdlib.h>
#include <systemd/sd-journal.h>
#include <unistd.h>

bool tt_log_journal_available(void) {
  /* Check journal availability via /run/systemd/journal */
  return (access("/run/systemd/journal", F_OK) == 0);
}

int tt_log_journal_init(struct tt_log_state* state) {
  /* No special initialization required for journal */
  return 0;
}

void tt_log_journal_write(struct tt_log_state* state, enum tt_log_level level,
                          const char* file, int line, const char* func,
                          const char* fmt, va_list args) {
  char buf[1024];
  vsnprintf(buf, sizeof(buf), fmt, args);

  /* Direct write to journal with metadata */
  if (file && func) {
    sd_journal_send("MESSAGE=%s", buf, "PRIORITY=%d", (int)level,
                    "SYSLOG_IDENTIFIER=%s", state->ident, "CODE_FILE=%s", file,
                    "CODE_LINE=%d", line, "CODE_FUNC=%s", func, NULL);
  } else {
    sd_journal_send("MESSAGE=%s", buf, "PRIORITY=%d", (int)level,
                    "SYSLOG_IDENTIFIER=%s", state->ident, NULL);
  }
}

void tt_log_journal_shutdown(
    struct tt_log_state* state) { /* No cleanup needed for journal */ }

#endif /* HAVE_SYSTEMD */
