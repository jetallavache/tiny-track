#include "m_state.h"

#include <string.h>

void m_state_set_du_ival(struct m_state *s, time_t inval) {
  s->du_inval = inval;
}

void m_state_set_du_path(struct m_state *s, char *path) { s->du_path = path; }

void m_state_init(struct m_state *s) {
  memset(s, 0, sizeof(*s));
  s->du_inval = M_DU_INTERVAL;
  s->du_path = M_DU_PATH;
}