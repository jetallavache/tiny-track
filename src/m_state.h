#ifndef SRC_M_STATE_H
#define SRC_M_STATE_H

#include <time.h>

#include "m_calc.h"

#define M_DU_PATH "/home"
#define M_DU_INTERVAL 30

struct m_state {
  struct calc_stat stat_prev;
  struct calc_net net_prev;
  time_t net_time_prev;
  struct calc_du du_cached;
  time_t du_last_update;
  time_t du_inval;
  char *du_path;
};

void m_state_set_du_ival(struct m_state *, time_t ival);
void m_state_set_du_path(struct m_state *, char *path);
void m_state_init(struct m_state *);

#endif  // SRC_M_STATE_H