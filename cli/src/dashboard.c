#define _POSIX_C_SOURCE 200809L
#include "dashboard.h"

#include <ncurses.h>
#include <signal.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#include "common/ringbuf/layout.h"
#include "output.h"
#include "reader.h"

#define HISTORY_LEN 60

#define CP_HEADER 1
#define CP_OK     2
#define CP_WARN   3
#define CP_CRIT   4
#define CP_DIM    5
#define CP_TITLE  6

typedef struct {
  struct ttc_reader reader;
  int               reader_ok;
  struct tt_metrics latest;
  struct tt_metrics hist[HISTORY_LEN];
  int               hist_count;
  int               mode;
  int               show_help;
  char              ring_label[3][24]; /* computed once on connect */
  int               labels_ready;
} dash_state;

static volatile sig_atomic_t g_resize = 0;
static void                  on_sigwinch(int s) { (void)s; g_resize = 1; }

static void init_colors(void) {
  start_color();
  use_default_colors();
  init_pair(CP_HEADER, COLOR_WHITE,  COLOR_BLUE);
  init_pair(CP_OK,     COLOR_GREEN,  -1);
  init_pair(CP_WARN,   COLOR_YELLOW, -1);
  init_pair(CP_CRIT,   COLOR_RED,    -1);
  init_pair(CP_DIM,    COLOR_WHITE,  -1);
  init_pair(CP_TITLE,  COLOR_CYAN,   -1);
}

static int pct_pair(double pct, double warn, double crit) {
  if (pct >= crit) return CP_CRIT;
  if (pct >= warn) return CP_WARN;
  return CP_OK;
}

static void fmt_bytes(unsigned long b, char *buf, size_t len) {
  if      (b >= 1UL << 30) snprintf(buf, len, "%.1fG", b / (double)(1UL << 30));
  else if (b >= 1UL << 20) snprintf(buf, len, "%.1fM", b / (double)(1UL << 20));
  else if (b >= 1UL << 10) snprintf(buf, len, "%.1fK", b / (double)(1UL << 10));
  else                     snprintf(buf, len, "%luB",  b);
}

static void compute_ring_label(const struct ttr_meta *m, int level,
                                char *buf, size_t len) {
  uint32_t filled = m->head < m->capacity ? m->head : m->capacity;
  if (filled < 2 || m->last_ts <= m->first_ts) {
    snprintf(buf, len, "L%d %u slots", level, m->capacity);
    return;
  }
  uint64_t ivl_ms   = (m->last_ts - m->first_ts) / (filled - 1);
  uint64_t total_ms = (uint64_t)m->capacity * ivl_ms;

  char ivl[12], total[12];
  if      (ivl_ms < 1000)    snprintf(ivl, sizeof(ivl), "%llums", (unsigned long long)ivl_ms);
  else if (ivl_ms < 60000)   snprintf(ivl, sizeof(ivl), "%llds",  (unsigned long long)(ivl_ms / 1000));
  else if (ivl_ms < 3600000) snprintf(ivl, sizeof(ivl), "%lldm",  (unsigned long long)(ivl_ms / 60000));
  else                       snprintf(ivl, sizeof(ivl), "%lldh",  (unsigned long long)(ivl_ms / 3600000));

  if      (total_ms < 3600000)  snprintf(total, sizeof(total), "%lldm", (unsigned long long)(total_ms / 60000));
  else if (total_ms < 86400000) snprintf(total, sizeof(total), "%lldh", (unsigned long long)(total_ms / 3600000));
  else                          snprintf(total, sizeof(total), "%lldd", (unsigned long long)(total_ms / 86400000));

  snprintf(buf, len, "L%d %s@%s", level, total, ivl);
}

static void draw_bar(WINDOW *w, int y, int x, int width,
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

static void draw_sparkline(WINDOW *w, int y, int x, int width,
                            const struct tt_metrics *hist, int count,
                            double (*getval)(const struct tt_metrics *),
                            double warn, double crit) {
  static const char sparks[] = " .:|#";
  int start = count > width ? count - width : 0;
  int n     = count - start;
  wmove(w, y, x);
  for (int i = 0; i < n; i++) {
    double v   = getval(&hist[start + i]);
    int    idx = (int)(v / 100.0 * 4.0);
    if (idx < 0) idx = 0;
    if (idx > 4) idx = 4;
    wattron(w, COLOR_PAIR(pct_pair(v, warn, crit)));
    waddch(w, sparks[idx]);
    wattroff(w, COLOR_PAIR(pct_pair(v, warn, crit)));
  }
  for (int i = n; i < width; i++) waddch(w, ' ');
}

static double get_cpu(const struct tt_metrics *m)  { return m->cpu_usage  / 100.0; }
static double get_mem(const struct tt_metrics *m)  { return m->mem_usage  / 100.0; }
static double get_disk(const struct tt_metrics *m) { return m->du_usage   / 100.0; }

static int draw_metric_row(WINDOW *w, int row, int bar_w,
                            const char *label, double val,
                            double warn, double crit,
                            const struct tt_metrics *hist, int hcount,
                            double (*getval)(const struct tt_metrics *)) {
  mvwprintw(w, row, 1, "%-5s %5.1f%%", label, val);
  draw_bar(w, row, 13, bar_w, val, warn, crit);
  row++;
  draw_sparkline(w, row, 13, bar_w, hist, hcount, getval, warn, crit);
  wattron(w, COLOR_PAIR(CP_DIM));
  mvwprintw(w, row, 13 + bar_w + 1, "60s");
  wattroff(w, COLOR_PAIR(CP_DIM));
  return row + 1;
}

static void draw_header(WINDOW *w, int cols, int daemon_ok) {
  char ts[32];
  time_t    now = time(NULL);
  struct tm *tm = localtime(&now);
  strftime(ts, sizeof(ts), "%Y-%m-%d %H:%M:%S", tm);
  wattron(w, COLOR_PAIR(CP_HEADER) | A_BOLD);
  for (int i = 0; i < cols; i++) mvwaddch(w, 0, i, ' ');
  mvwprintw(w, 0, 1, " TinyTrack  %s  daemon: %s",
            ts, daemon_ok ? "running" : "stopped");
  wattroff(w, COLOR_PAIR(CP_HEADER) | A_BOLD);
}

static void draw_metrics(WINDOW *w, int row, int cols,
                          const struct tt_metrics *m,
                          const struct tt_metrics *hist, int hcount) {
  int bar_w = cols - 24;
  if (bar_w < 20) bar_w = 20;
  if (bar_w > 60) bar_w = 60;

  char ts[16];
  ttc_fmt_ts(m->timestamp, ts, sizeof(ts));
  wattron(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  mvwprintw(w, row, 1, "[ Live Metrics  %s ]", ts);
  wattroff(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  row++;

  row = draw_metric_row(w, row, bar_w, "CPU",  m->cpu_usage  / 100.0, 70, 90, hist, hcount, get_cpu);
  row = draw_metric_row(w, row, bar_w, "MEM",  m->mem_usage  / 100.0, 80, 95, hist, hcount, get_mem);
  row = draw_metric_row(w, row, bar_w, "DISK", m->du_usage   / 100.0, 80, 95, hist, hcount, get_disk);

  char rx[16], tx[16];
  fmt_bytes(m->net_rx, rx, sizeof(rx));
  fmt_bytes(m->net_tx, tx, sizeof(tx));
  mvwprintw(w, row, 1, "NET");
  wattron(w, COLOR_PAIR(CP_OK));
  mvwprintw(w, row, 7, "RX %-8s/s", rx);
  wattroff(w, COLOR_PAIR(CP_OK));
  wattron(w, COLOR_PAIR(CP_WARN));
  mvwprintw(w, row, 22, "TX %-8s/s", tx);
  wattroff(w, COLOR_PAIR(CP_WARN));
  row++;

  double l1 = m->load_1min / 100.0;
  mvwprintw(w, row, 1, "LOAD");
  wattron(w, COLOR_PAIR(pct_pair(l1 * 100, 70, 90)));
  mvwprintw(w, row, 7, "%.2f", l1);
  wattroff(w, COLOR_PAIR(pct_pair(l1 * 100, 70, 90)));
  mvwprintw(w, row, 13, "%.2f  %.2f  PROC %u/%u",
            m->load_5min / 100.0, m->load_15min / 100.0,
            m->nr_running, m->nr_total);
}

static void draw_tsdb(WINDOW *w, int row, int cols,
                      const struct ttr_reader *r,
                      const char labels[3][24]) {
  wattron(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  mvwprintw(w, row, 1, "[ Ring Buffer (TSDB) ]");
  wattroff(w, COLOR_PAIR(CP_TITLE) | A_BOLD);
  row++;

  const struct ttr_meta *metas[3] = {r->l1_meta, r->l2_meta, r->l3_meta};
  int bar_w = cols - 15 - 38;
  if (bar_w < 10) bar_w = 10;
  if (bar_w > 40) bar_w = 40;

  for (int i = 0; i < 3; i++) {
    const struct ttr_meta *m      = metas[i];
    uint32_t               filled = m->head < m->capacity ? m->head : m->capacity;
    double                 pct    = m->capacity > 0 ? (double)filled / m->capacity * 100.0 : 0.0;
    char                   first[16], last[16];
    ttc_fmt_ts(m->first_ts, first, sizeof(first));
    ttc_fmt_ts(m->last_ts,  last,  sizeof(last));

    wattron(w, A_BOLD);
    mvwprintw(w, row, 1, "%-14s", labels[i]);
    wattroff(w, A_BOLD);
    draw_bar(w, row, 15, bar_w, pct, 70, 90);
    wattron(w, COLOR_PAIR(CP_DIM));
    mvwprintw(w, row, 15 + bar_w + 2, "%3.0f%% %4u/%-4u  %s->%s",
              pct, filled, m->capacity, first, last);
    wattroff(w, COLOR_PAIR(CP_DIM));
    row++;

    if (m->capacity > 0 && bar_w > 2) {
      int caret = (int)((double)m->head / m->capacity * bar_w);
      if (caret >= bar_w) caret = bar_w - 1;
      wattron(w, COLOR_PAIR(CP_WARN));
      mvwprintw(w, row, 15 + caret, "^");
      wattroff(w, COLOR_PAIR(CP_WARN));
      wattron(w, COLOR_PAIR(CP_DIM));
      mvwprintw(w, row, 15 + caret + 2, "head=%u", m->head);
      wattroff(w, COLOR_PAIR(CP_DIM));
      row++;
    }
  }
}

static void draw_hints(WINDOW *w, int rows, int mode) {
  wattron(w, COLOR_PAIR(CP_DIM));
  mvwprintw(w, rows - 1, 1, " q:quit  Tab:mode[%d/1]  ?:help", mode);
  wattroff(w, COLOR_PAIR(CP_DIM));
}

static void draw_help(int rows, int cols) {
  int     h = 10, wd = 40;
  WINDOW *hw = newwin(h, wd, (rows - h) / 2, (cols - wd) / 2);
  box(hw, 0, 0);
  wattron(hw, A_BOLD);
  mvwprintw(hw, 0, (wd - 6) / 2, " Help ");
  wattroff(hw, A_BOLD);
  mvwprintw(hw, 2, 2, "q / ESC    Quit");
  mvwprintw(hw, 3, 2, "Tab        Cycle mode");
  mvwprintw(hw, 5, 2, "Mode 0:  Live metrics + sparklines");
  mvwprintw(hw, 6, 2, "Mode 1:  Ring buffer TSDB view");
  mvwprintw(hw, 8, 2, "Press any key to close");
  wrefresh(hw);
  getch();
  delwin(hw);
}

int ttc_cmd_dashboard(const struct ttc_ctx *ctx) {
  dash_state st = {0};

  initscr();
  cbreak();
  noecho();
  keypad(stdscr, TRUE);
  curs_set(0);

  int tenths = ctx->interval_ms / 100;
  if (tenths < 1)   tenths = 1;
  if (tenths > 255) tenths = 255;
  halfdelay(tenths);

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

    if (!st.reader_ok)
      st.reader_ok = ttc_reader_open(&st.reader, ctx->mmap_path) == TTR_READER_OK;

    if (st.reader_ok && !st.labels_ready) {
      compute_ring_label(st.reader.ring.l1_meta, 1, st.ring_label[0], 24);
      compute_ring_label(st.reader.ring.l2_meta, 2, st.ring_label[1], 24);
      compute_ring_label(st.reader.ring.l3_meta, 3, st.ring_label[2], 24);
      st.labels_ready = 1;
    }

    if (st.reader_ok) {
      struct tt_metrics m;
      int err = ttc_reader_get_latest(&st.reader, &m);
      if (err == TTR_READER_OK) {
        st.latest = m;
        if (st.hist_count < HISTORY_LEN) {
          st.hist[st.hist_count++] = m;
        } else {
          memmove(st.hist, st.hist + 1,
                  (HISTORY_LEN - 1) * sizeof(struct tt_metrics));
          st.hist[HISTORY_LEN - 1] = m;
        }
      } else if (err == TTR_READER_ERR_STALE) {
        ttc_reader_close(&st.reader);
        st.reader_ok    = 0;
        st.labels_ready = 0;
      }
    }

    erase();
    draw_header(stdscr, cols, st.reader_ok);

    if (st.mode == 0)
      draw_metrics(stdscr, 2, cols, &st.latest, st.hist, st.hist_count);
    else if (st.reader_ok)
      draw_tsdb(stdscr, 2, cols, &st.reader.ring,
                (const char (*)[24])st.ring_label);
    else
      mvprintw(4, 2, "Daemon not running. Waiting for %s ...", ctx->mmap_path);

    draw_hints(stdscr, rows, st.mode);
    if (st.show_help) draw_help(rows, cols);
    refresh();

    int ch = getch();
    if (ch == 'q' || ch == 27) break;
    if (ch == '\t') st.mode = (st.mode + 1) % 2;
    if (ch == '?')  st.show_help = !st.show_help;
  }

  if (st.reader_ok) ttc_reader_close(&st.reader);
  endwin();
  return 0;
}
