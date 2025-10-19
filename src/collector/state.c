#include "state.h"

#include <string.h>

void c_state_set_du_ival(struct c_state* s, time_t inval) {
  s->du_inval = inval;
}

void c_state_set_du_path(struct c_state* s, char* path) { s->du_path = path; }

void c_state_init(struct c_state* s) {
  memset(s, 0, sizeof(*s));
  s->du_inval = M_DU_INTERVAL;
  s->du_path = M_DU_PATH;
}