#include "commands.h"

#include <stdio.h>
#include <string.h>
#include <unistd.h>

#include "display.h"
#include "reader.h"

int ttc_cmd_status(const char* path) {
  struct ttc_reader ctx;
  int err = ttc_reader_open(&ctx, path);
  if (err != TTR_READER_OK) {
    fprintf(stderr, "Error: %s\n", ttc_reader_strerror(err));
    return 1;
  }

  printf("Status: OK\n");
  printf("Path: %s\n", path);

  ttc_reader_close(&ctx);
  return 0;
}

int ttc_cmd_live(const char* path, int interval_ms, const char* format) {
  struct ttc_reader ctx;
  int err = ttc_reader_open(&ctx, path);
  if (err != TTR_READER_OK) {
    fprintf(stderr, "Error: %s\n", ttc_reader_strerror(err));
    return 1;
  }

  while (1) {
    struct tt_proto_metrics m;
    int err = ttc_reader_get_latest(&ctx, &m);
    if (err == TTR_READER_OK) {
      if (strcmp(format, "json") == 0) {
        ttc_display_metrics_json(&m);
      } else if (strcmp(format, "compact") == 0) {
        ttc_display_metrics_compact(&m);
      } else {
        ttc_display_metrics(&m);
      }
    } else if (err == TTR_READER_ERR_NODATA) {
      fprintf(stderr, "Waiting for data...\n");
    } else if (err == TTR_READER_ERR_STALE) {
      fprintf(stderr,
              "Warning: tinytd daemon is not running (data is stale)\n");
      /* Can continue showing stale data or exit */
      break;
    }
    usleep(interval_ms * 1000);
  }

  ttc_reader_close(&ctx);
  return 0;
}

int ttc_cmd_history(const char* path, const char* range, int level) {
  struct ttc_reader ctx;
  int err = ttc_reader_open(&ctx, path);
  if (err != TTR_READER_OK) {
    fprintf(stderr, "Error: %s\n", ttc_reader_strerror(err));
    return 1;
  }

  printf("History: range=%s level=%d\n", range, level);
  /* TODO: implement */

  ttc_reader_close(&ctx);
  return 0;
}

int ttc_cmd_version(void) {
  printf("tiny-cli version 0.1.0\n");
  return 0;
}
