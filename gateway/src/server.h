#ifndef TINYTRACK_SERVER_H
#define TINYTRACK_SERVER_H

struct tt_gateway_config {
  char bind_addr[64];
  int port;
  char mmap_path[256];
  int max_clients;
};

int tt_gateway_run(struct tt_gateway_config* cfg);

#endif
