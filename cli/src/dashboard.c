/*
 * TinyTrack ncurses dashboard
 *
 * Layout (terminal rows):
 *   [0..2]   Header bar: title + timestamp + daemon status
 *   [3..10]  Metrics panel: CPU/MEM/DISK bars + NET/LOAD/PROC
 *   [11..17] Ring buffer panel: L1/L2/L3 fill visualization
 *   [18..]   History sparkline (last 60 L1 samples)
 *   [last-2] Key hints
 *
 * Modes (Tab to cycle):
 *   0 - Live metrics
 *   1 - Ring buffer TSDB view
 *
 * Keys:
 *   q / ESC  quit
 *   Tab      next mode
 *   r        force refresh
 *   ?        help overlay
 */
#define _POSIX_C_SOURCE 200809L
#include "dashboard.h"

#include <ncurses.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#include "output.h"
#include "reader.h"
#include "common/ringbuf/layout.h"

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

#define HISTORY_LEN 60

static volatile sig_atomic_t g_resize = 0;

static void on_sigwinch(int s) { (void)s; g_resize = 1; }

typedef struct {
  struct ttc_reader reader;
  int reader_ok;
  struct tt_metrics latest;
  struct tt_metrics hist[HISTORY_LEN];
  int hist_count;
  int mode;        /* 0=metrics, 1=tsdb */
  int show_help;
} dash_state;

/* ------------------------------------------------------------------ */
/* Color pairs                                                          */
/* ------------------------------------------------------------------ */

#define CP_HEADER   1
#define CP_OK       2
#define CP_WARN     3
#define CP_CRIT     4
#define CP_DIM      5
#define CP_TITLE    6
#define CP_BAR_FILL 7
#define CP_BAR_EMPTY 8

static void init_colors(void) {
  start_color();
  use_default_colors();
  init_pair(CP_HEADER,    COLOR_BLACK,  COLOR_CYAN);
  init_pair(CP_OK,        COLOR_GREEN,  -1);
  init_pair(CP_WARN,      COLOR_YELLOW, -1);
  init_pair(CP_CRIT,      COLOR_RED,    -1);
  init_pair(CP_DIM,       COLOR_WHITE,  -1);
  init_pair(CP_TITLE,     COLOR_CYAN,   -1);
  init_pair(CP_BAR_FILL,  COLOR_GREEN,  -1);
  init_pair(CP_BAR_EMPTY, COLOR_WHITE,  -1);
}

/* ------------------------------------------------------------------ */
/* Drawing helpers                                                      */
/* ------------------------------------------------------------------ */

static int pct_pair(double pct, double warn, double crit) {
  if (pct >= crit)  return CP_CRIT;
  if (pct >= warn)  return CP_WARN;
  return CP_OK;
}

/* Draw a horizontal bar: [####....] width chars, value 0..100 */
static void draw_bar(WINDOW* w, int y, int x, int width,
                     double pct, double warn, double crit) {
  int filled = (int)(pct / 100.0 * width);
  if (filled > width) filled = width;

  wmove(w, y, x);
  waddch(w, '[');
  wattron(w, COLOR_PAIR(pct_pair(pct, warn, crit)) | A_BOLD);
  for (int i = 0; i < filled; i++) waddch(w, '#');
  wattroff(w, COLOR_PAIR(pct_pair(pct, warn, crit)) | A_BOLD);
  wattron(w, COLOR_PAIR(CP_DIM));
  for (int i = filled; i < width; i++) waddch(w, '.');
  wattroff(w, COLOR_PAIR(CP_DIM));
  waddch(w, ']');
}

/* Draw sparkline from history array (last `len` values of field) */
static void draw_sparkline(WINDOW* w, int y, int x, int width,
                            const struct tt_metrics* hist, int count,
                            double (*getval)(const struct tt_metrics*),
                            double warn, double crit) {
  /* 5-level ASCII sparkline: space . : | # */
  static const char sparks[] = " .:|#";
  int start = count > width ? count - width : 0;
  int n = count - start;

  wmove(w, y, x);
  for (int i = 0; i < n; i++) {
    double v = getval(&hist[start + i]);
    int idx = (int)(v / 100.0 * 4.0);
    if (idx < 0) idx = 0;
    if (idx > 4) idx = 4;
    wattron(w, COLOR_PAIR(pct_pair(v, warn, crit)));
    waddch(w, sparks[idx]);
    wattroff(w, COLOR_PAIR(pct_pair(v, warn, crit)));
  }
  for (int i = n; i < width; i++) waddch(w, ' ');
}

static double get_cpu(const struct tt_metrics* m) { return m->cpu_usage / 100.0; }
static double get_mem(const struct tt_metrics* m) { return m->mem_usage / 100.0; }
static double get_disk(const struct tt_metrics* m) { return m->du_usage / 100.0; }

/* ------------------------------------------------------------------ */
/* Panels                                                               */
/* ------------------------------------------------------------------ */

static void draw_header(WINDOW* w, int cols, int daemon_ok) {
  char ts[32];
  time_t now = time(NULL);
  struct tm* tm = localtime(&now);
  strftime(ts, sizeof(ts), "%Y-%m-%d %H:%M:%S", tm);

  wattron(w, COLOR_PAIR(CP_HEADER) | A_BOLD);
  for (int i = 0; i < cols; i++) mvwaddch(w, 0, i, ' ');
  mvwprintw(w, 0, 1, " TinyTrack Monitor  %s  daemon: %s",
            ts, daemon_ok ? "running" : "stopped");
  wattroff(w, COLOR_PAIR(CP_HEADER) | A_BOLD);
}

static void draw_metrics(WINDOW* w, int row, int cols,
                         const struct tt_metrics* m,
                         const struct tt_metrics* hist, int hcount) {
  /* Bar width: half the terminal, leaving room for label + value */
  int bar_w = (cols - 24);
  if (bar_w < 20) bar_w = 20;
  if (bar_w > 60) bar_w = 60;

  double cpu  = m->cpu_usage  / 100.0;
  double mem  = m->mem_usage  / 100.0;
  double disk = m->du_usage   / 100.0;

  char rx[16], tx[16], total[16], free_[16], ts[16];
  void fb(unsigned long b, char* buf, int len) {
    if (b >= 1UL<<30) snprintf(buf, len, "%.1fG", b/(double)(1UL<<30));
    else if (b >= 1UL<<20) snprintf(buf, len, "%.1fM", b/(double)(1UL<<20));
    else if (b >= 1UL<<10) snprintf(buf, len, "%.1fK", b/(double)(1UL<<10));
    else snprintf(buf, len, "%luB", b);
  }
  fb(m->net_rx, rx, sizeof(rx));
  fb(m->net_tx, tx, sizeof(tx));
  fb(m->du_total_bytes, total, sizeof(total));
  fb(m->du_free_bytes, free_, sizeof(free_));
  ttc_fmt_ts(m->timestamp, ts, sizeof(ts));

  wattron(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  mvwprintw(w, row, 1, "[ Live Metrics  %s ]", ts);
  wattroff(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  row++;

  /* Helper: draw one metric row + sparkline row below */
  #define METRIC_ROW(label, val, warn, crit, getfn) do { \
    mvwprintw(w, row, 1, "%-5s %5.1f%%", label, val); \
    draw_bar(w, row, 13, bar_w, val, warn, crit); \
    row++; \
    wmove(w, row, 13); \
    draw_sparkline(w, row, 13, bar_w, hist, hcount, getfn, warn, crit); \
    wattron(w, COLOR_PAIR(CP_DIM)); \
    mvwprintw(w, row, 13 + bar_w + 1, "60s history"); \
    wattroff(w, COLOR_PAIR(CP_DIM)); \
    row++; \
  } while (0)

  METRIC_ROW("CPU",  cpu,  70, 90, get_cpu);
  METRIC_ROW("MEM",  mem,  80, 95, get_mem);
  METRIC_ROW("DISK", disk, 80, 95, get_disk);

  #undef METRIC_ROW

  /* NET: RX / TX */
  mvwprintw(w, row, 1, "NET");
  wattron(w, COLOR_PAIR(CP_OK));
  mvwprintw(w, row, 7, "RX %-8s/s", rx);
  wattroff(w, COLOR_PAIR(CP_OK));
  wattron(w, COLOR_PAIR(CP_WARN));
  mvwprintw(w, row, 22, "TX %-8s/s", tx);
  wattroff(w, COLOR_PAIR(CP_WARN));
  row++;

  /* LOAD + PROC */
  double l1 = m->load_1min / 100.0;
  mvwprintw(w, row, 1, "LOAD");
  wattron(w, COLOR_PAIR(pct_pair(l1 * 100, 70, 90)));
  mvwprintw(w, row, 7, "%.2f", l1);
  wattroff(w, COLOR_PAIR(pct_pair(l1 * 100, 70, 90)));
  mvwprintw(w, row, 13, "%.2f  %.2f",
            m->load_5min / 100.0, m->load_15min / 100.0);
  mvwprintw(w, row, 28, "PROC %u/%u",
            m->nr_running, m->nr_total);
}

/* Compute a human-readable label for a ring level from its actual metadata.
 * Uses first_ts/last_ts to derive the real sample interval when data exists,
 * otherwise falls back to capacity-only description. */
static void fmt_ring_label(const struct ttr_meta* m, int level,
                           char* buf, size_t len) {
  uint32_t filled = m->head < m->capacity ? m->head : m->capacity;

  /* Derive interval from timestamps if we have at least 2 samples */
  if (filled >= 2 && m->last_ts > m->first_ts) {
    uint64_t span_ms = m->last_ts - m->first_ts;
    uint64_t interval_ms = span_ms / (filled - 1);
    uint64_t total_ms = (uint64_t)m->capacity * interval_ms;

    /* Format interval */
    char ivl[16], total[16];
    if (interval_ms < 1000)
      snprintf(ivl, sizeof(ivl), "%llums", (unsigned long long)interval_ms);
    else if (interval_ms < 60000)
      snprintf(ivl, sizeof(ivl), "%llds", (unsigned long long)(interval_ms / 1000));
    else if (interval_ms < 3600000)
      snprintf(ivl, sizeof(ivl), "%lldm", (unsigned long long)(interval_ms / 60000));
    else
      snprintf(ivl, sizeof(ivl), "%lldh", (unsigned long long)(interval_ms / 3600000));

    /* Format total window */
    if (total_ms < 3600000)
      snprintf(total, sizeof(total), "%lldm", (unsigned long long)(total_ms / 60000));
    else if (total_ms < 86400000)
      snprintf(total, sizeof(total), "%lldh", (unsigned long long)(total_ms / 3600000));
    else
      snprintf(total, sizeof(total), "%lldd", (unsigned long long)(total_ms / 86400000));

    snprintf(buf, len, "L%d %s@%s", level, total, ivl);
  } else {
    /* No data yet — show capacity only */
    snprintf(buf, len, "L%d %u slots", level, m->capacity);
  }
}

static void draw_tsdb(WINDOW* w, int row, int cols,
                      const struct ttr_reader* r) {
  wattron(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  mvwprintw(w, row, 1, "[ Ring Buffer (TSDB) ]");
  wattroff(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  row++;

  const struct ttr_meta* metas[3] = { r->l1_meta, r->l2_meta, r->l3_meta };

  int bar_w = cols - 40;
  if (bar_w < 10) bar_w = 10;

  for (int i = 0; i < 3; i++) {
    const struct ttr_meta* m = metas[i];
    uint32_t filled = m->head < m->capacity ? m->head : m->capacity;
    double pct = m->capacity > 0 ? (double)filled / m->capacity * 100.0 : 0.0;

    char label[24], first[16], last[16];
    fmt_ring_label(m, i + 1, label, sizeof(label));
    ttc_fmt_ts(m->first_ts, first, sizeof(first));
    ttc_fmt_ts(m->last_ts,  last,  sizeof(last));

    /* Label column: fixed 14 chars */
    wattron(w, A_BOLD);
    mvwprintw(w, row, 1, "%-14s", label);
    wattroff(w, A_BOLD);
    draw_bar(w, row, 15, bar_w, pct, 70, 90);
    wattron(w, COLOR_PAIR(CP_DIM));
    mvwprintw(w, row, 15 + bar_w + 2, "%3.0f%% %4u/%-4u  %s->%s",
              pct, filled, m->capacity, first, last);
    wattroff(w, COLOR_PAIR(CP_DIM));
    row++;

    /* Write head caret */
    if (m->capacity > 0 && bar_w > 2) {
      int caret_pos = (int)((double)m->head / m->capacity * bar_w);
      if (caret_pos >= bar_w) caret_pos = bar_w - 1;
      wattron(w, COLOR_PAIR(CP_WARN));
      mvwprintw(w, row, 15 + caret_pos, "^");
      wattroff(w, COLOR_PAIR(CP_WARN));
      wattron(w, COLOR_PAIR(CP_DIM));
      mvwprintw(w, row, 15 + caret_pos + 2, "head=%u", m->head);
      wattroff(w, COLOR_PAIR(CP_DIM));
      row++;
    }
  }
}

static void draw_hints(WINDOW* w, int rows, int cols, int mode) {
  (void)cols;
  wattron(w, COLOR_PAIR(CP_DIM));
  mvwprintw(w, rows - 1, 1,
            " q:quit  Tab:mode[%d/1]  r:refresh  ?:help", mode);
  wattroff(w, COLOR_PAIR(CP_DIM));
}

static void draw_help(WINDOW* w, int rows, int cols) {
  int h = 12, wd = 44;
  int y = (rows - h) / 2, x = (cols - wd) / 2;
  WINDOW* hw = newwin(h, wd, y, x);
  box(hw, 0, 0);
  wattron(hw, A_BOLD);
  mvwprintw(hw, 0, (wd - 6) / 2, " Help ");
  wattroff(hw, A_BOLD);
  mvwprintw(hw, 2,  2, "q / ESC    Quit");
  mvwprintw(hw, 3,  2, "Tab        Cycle mode (metrics / tsdb)");
  mvwprintw(hw, 4,  2, "r          Force refresh");
  mvwprintw(hw, 5,  2, "?          Toggle this help");
  mvwprintw(hw, 7,  2, "Modes:");
  mvwprintw(hw, 8,  2, "  0  Live metrics + sparklines");
  mvwprintw(hw, 9,  2, "  1  Ring buffer TSDB view");
  mvwprintw(hw, 11, 2, "Press any key to close");
  wrefresh(hw);
  getch();
  delwin(hw);
  (void)w;
}

/* ------------------------------------------------------------------ */
/* Main loop                                                            */
/* ------------------------------------------------------------------ */

int ttc_cmd_dashboard(const struct ttc_ctx* ctx) {
  dash_state st = {0};
  st.mode = 0;

  st.reader_ok = ttc_reader_open(&st.reader, ctx->mmap_path) == TTR_READER_OK;

  /* ncurses init */
  initscr();
  cbreak();
  noecho();
  keypad(stdscr, TRUE);
  nodelay(stdscr, TRUE);
  curs_set(0);

  if (has_colors()) init_colors();

  signal(SIGWINCH, on_sigwinch);

  int rows, cols;
  getmaxyx(stdscr, rows, cols);

  while (1) {
    if (g_resize) {
      g_resize = 0;
      endwin();
      refresh();
      getmaxyx(stdscr, rows, cols);
    }

    /* Read latest metrics */
    if (st.reader_ok) {
      struct tt_metrics m;
      if (ttc_reader_get_latest(&st.reader, &m) == TTR_READER_OK) {
        st.latest = m;
        /* Append to history ring */
        if (st.hist_count < HISTORY_LEN) {
          st.hist[st.hist_count++] = m;
        } else {
          memmove(st.hist, st.hist + 1,
                  (HISTORY_LEN - 1) * sizeof(struct tt_metrics));
          st.hist[HISTORY_LEN - 1] = m;
        }
      }
    }

    /* Draw */
    erase();

    draw_header(stdscr, cols,
                st.reader_ok && st.latest.timestamp > 0);

    if (st.mode == 0) {
      draw_metrics(stdscr, 2, cols, &st.latest,
                   st.hist, st.hist_count);
    } else {
      if (st.reader_ok)
        draw_tsdb(stdscr, 2, cols, &st.reader.ring);
      else
        mvprintw(4, 2, "Cannot open mmap: %s", ctx->mmap_path);
    }

    draw_hints(stdscr, rows, cols, st.mode);

    if (st.show_help) draw_help(stdscr, rows, cols);

    refresh();

    /* Input (non-blocking) */
    int ch = getch();
    if (ch == 'q' || ch == 27 /* ESC */) break;
    if (ch == '\t') st.mode = (st.mode + 1) % 2;
    if (ch == '?')  st.show_help = !st.show_help;
    if (ch == 'r')  ; /* just redraw */

    usleep(ctx->interval_ms * 1000);
  }

  if (st.reader_ok) ttc_reader_close(&st.reader);

  endwin();
  return 0;
}
