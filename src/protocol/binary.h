#ifndef SRC_PROTOCOL_BINARY_H
#define SRC_PROTOCOL_BINARY_H

#include "../collector/ring.h"
#include "../protocol/format.h"
#include "../server/net.h"

#define MSG_HIGH_CPU (1 << 0)     /* CPU > 90% */
#define MSG_HIGH_MEM (1 << 1)     /* Memory > 90% */
#define MSG_HIGH_LOAD (1 << 2)    /* Load > cores * 2 */
#define MSG_LOAD_FALL (1 << 3)    /* Load decrease */
#define MSG_LOAD_GROW (1 << 4)    /* Load increase */
#define MSG_NETWORK_DOWN (1 << 5) /* Network traffic 0 */
#define MSG_DISK_FULL (1 << 6)    /* Disk usage > 90% */
#define MSG_DISK_LOW (1 << 7)     /* Disk free < 1GB */

void p_send_metrics(struct s_conn*);
void p_send_config(struct s_conn*);

void p_handle_client_message(const uint8_t* data, size_t len);
void p_handle_cmd_get_history(struct s_conn*, struct p_cmd_payload*,
                              struct c_metrics_ring*);

#endif  // SRC_PROTOCOL_BINARY_H