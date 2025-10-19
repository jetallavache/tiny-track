#ifndef SRC_M_STATE_H
#define SRC_M_STATE_H

#include <time.h>

#include "calc.h"

#define M_DU_PATH "/home"
#define M_DU_INTERVAL 30

struct c_state {
  struct c_stat stat_prev;
  struct c_net net_prev;
  time_t net_time_prev;
  struct c_du du_cached;
  time_t du_last_update;
  time_t du_inval;
  char* du_path;
};

void c_state_set_du_ival(struct c_state*, time_t ival);
void c_state_set_du_path(struct c_state*, char* path);
void c_state_init(struct c_state*);

#endif  // SRC_M_STATE_H